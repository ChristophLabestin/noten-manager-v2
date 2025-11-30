/* eslint-disable prefer-template */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {CloudTasksClient} = require("@google-cloud/tasks");
const jwt = require("jsonwebtoken");
const http2 = require("http2");

admin.initializeApp();

// Configuration (override via env if needed)
const REGION = process.env.FUNCTION_REGION || "europe-west3";
const QUEUE = process.env.LIVE_ACTIVITY_QUEUE || "live-activity";
const tasksClient = new CloudTasksClient();

// APNs credentials from env (set with `firebase functions:config:set` or secrets)
const config = functions.config();
const APNS_KEY = process.env.APNS_KEY || config?.apns?.key; // p8 content
const APNS_KEY_ID = process.env.APNS_KEY_ID || config?.apns?.key_id;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID || config?.apns?.team_id;
const APNS_BUNDLE_ID = process.env.APNS_BUNDLE_ID || config?.apns?.bundle_id; // e.g. de.christophlabestin.noten-manager-ios
const APNS_USE_SANDBOX = (process.env.APNS_USE_SANDBOX || config?.apns?.use_sandbox || "false").toLowerCase() === "true";

// Firestore trigger: schedule a Cloud Task to send the push at startAt.
exports.onLiveActivityCreated = functions
    .region(REGION)
    .firestore
    .document("users/{uid}/liveActivities/{activityId}")
    .onCreate(async (snap, context) => {
      const data = snap.data();
      const startAt = data.startAt && data.startAt.toDate ? data.startAt.toDate() : null;
      const pushToken = data.pushToken;
      if (!startAt || !pushToken) {
        functions.logger.warn("Missing startAt or pushToken", {path: snap.ref.path});
        return;
      }

      // If the start time already passed, send immediately.
      if (startAt <= new Date()) {
        await enqueueSendNow(snap.ref.path);
        return;
      }

      const project = process.env.GCLOUD_PROJECT;
      const queuePath = tasksClient.queuePath(project, REGION, QUEUE);
      const url = buildFunctionUrl(project, "sendLiveActivityPush");
      const body = Buffer.from(JSON.stringify({path: snap.ref.path}), "utf-8").toString("base64");

      const task = {
        httpRequest: {
          httpMethod: "POST",
          url,
          headers: {"Content-Type": "application/json"},
          body,
          oidcToken: {
            serviceAccountEmail: `${project}@appspot.gserviceaccount.com`,
          },
        },
        scheduleTime: {seconds: Math.floor(startAt.getTime() / 1000)},
      };

      const [resp] = await tasksClient.createTask({parent: queuePath, task});
      await snap.ref.update({taskName: resp.name});
      functions.logger.info("Scheduled live activity push", {task: resp.name, path: snap.ref.path, runAt: startAt.toISOString()});
    });

// Clean up scheduled task if the document is removed.
exports.onLiveActivityDeleted = functions
    .region(REGION)
    .firestore
    .document("users/{uid}/liveActivities/{activityId}")
    .onDelete(async (snap, context) => {
      const taskName = snap.get("taskName");
      if (!taskName) return;
      try {
        await tasksClient.deleteTask({name: taskName});
        functions.logger.info("Deleted scheduled task", {taskName});
      } catch (err) {
        functions.logger.warn("Failed to delete task", {taskName, err});
      }
    });

// HTTP endpoint (target of the Cloud Task) that sends the APNs Live Activity push.
exports.sendLiveActivityPush = functions
    .region(REGION)
    .https
    .onRequest(async (req, res) => {
      if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
      }
      const {path} = req.body || {};
      if (!path) {
        res.status(400).send("Missing path");
        return;
      }
      try {
        const snap = await admin.firestore().doc(path).get();
        if (!snap.exists) {
          res.status(404).send("Doc not found");
          return;
        }
        const data = snap.data();
        if (!data.pushToken) {
          res.status(400).send("Missing pushToken");
          return;
        }
        const payload = buildApnsPayload(data);
        const apnsResp = await sendApnsLiveActivityPush(data.pushToken, payload);
        res.status(200).json({ok: true, apns: apnsResp});
      } catch (err) {
        functions.logger.error("sendLiveActivityPush failed", {err});
        res.status(500).send("Internal error");
      }
    });

async function enqueueSendNow(path) {
  const project = process.env.GCLOUD_PROJECT;
  const queuePath = tasksClient.queuePath(project, REGION, QUEUE);
  const url = buildFunctionUrl(project, "sendLiveActivityPush");
  const body = Buffer.from(JSON.stringify({path}), "utf-8").toString("base64");
  const task = {
    httpRequest: {
      httpMethod: "POST",
      url,
      headers: {"Content-Type": "application/json"},
      body,
      oidcToken: {
        serviceAccountEmail: `${project}@appspot.gserviceaccount.com`,
      },
    },
  };
  await tasksClient.createTask({parent: queuePath, task});
}

function buildFunctionUrl(project, name) {
  return `https://${REGION}-${project}.cloudfunctions.net/${name}`;
}

function buildApnsPayload(data) {
  const startAt = data.startAt?.toDate ? data.startAt.toDate() : new Date();
  const examDate = data.examDate?.toDate ? data.examDate.toDate() : startAt;
  const duration = Math.max(0, Math.round((examDate.getTime() - startAt.getTime()) / 1000));

  const titleText = data.title || "Klausur";
  const bodyText = data.subject ? `${titleText} in ${data.subject}` : titleText;

  const contentState = {
    examDate: Math.floor(examDate.getTime() / 1000),
    title: titleText,
    subject: data.subject || "",
    startDate: Math.floor(startAt.getTime() / 1000),
    duration,
  };

  return {
    aps: {
      timestamp: Math.floor(Date.now() / 1000),
      event: "start",
      "content-state": contentState,
      alert: {
        title: "Klausur in 90 Minuten",
        body: bodyText,
      },
    },
    "attributes-type": "ExamCountdownAttributes",
    attributes: {
      examId: data.examId,
      title: titleText,
      subject: data.subject || "",
      accent: data.accent || "",
    },
  };
}

async function sendApnsLiveActivityPush(deviceToken, payload) {
  const key = APNS_KEY;
  const keyId = APNS_KEY_ID;
  const teamId = APNS_TEAM_ID;
  const bundleId = APNS_BUNDLE_ID;
  if (!key || !keyId || !teamId || !bundleId) {
    throw new Error("Missing APNS config");
  }

  const host = APNS_USE_SANDBOX ? "api.sandbox.push.apple.com" : "api.push.apple.com";
  const jwtToken = jwt.sign({}, key.replace(/\\n/g, "\n"), {
    algorithm: "ES256",
    issuer: teamId,
    header: {kid: keyId},
    expiresIn: "20m",
  });

  const client = http2.connect(`https://${host}`);
  const headers = {
    ":method": "POST",
    ":path": `/3/device/${deviceToken}`,
    "apns-push-type": "liveactivity",
    "apns-topic": `${bundleId}.push-type.liveactivity`,
    authorization: `bearer ${jwtToken}`,
    "content-type": "application/json",
  };

  const body = JSON.stringify(payload);
  const response = await new Promise((resolve, reject) => {
    const req = client.request(headers);
    let responseData = "";
    req.on("response", (headers) => {
      req.on("data", (chunk) => {
        responseData += chunk.toString();
      });
      req.on("end", () => {
        client.close();
        resolve({headers, body: responseData});
      });
    });
    req.on("error", (err) => {
      client.close();
      reject(err);
    });
    req.write(body);
    req.end();
  });

  return response;
}
