export const lockBodyScroll = () => {
  if (typeof document === "undefined") return;
  const body = document.body;
  const html = document.documentElement;
  const root = document.getElementById("root");

  html.classList.add("scroll-disable");
  body.classList.add("scroll-disable");
  if (root) {
    root.classList.add("scroll-disable");
  }
};

export const unlockBodyScroll = () => {
  if (typeof document === "undefined") return;
  const body = document.body;
  const html = document.documentElement;
  const root = document.getElementById("root");

  html.classList.remove("scroll-disable");
  body.classList.remove("scroll-disable");
  if (root) {
    root.classList.remove("scroll-disable");
  }

  // Cleanup any legacy inline styles / data from older implementations
  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  body.style.width = "";
  if ("scrollLocked" in body.dataset) delete body.dataset.scrollLocked;
  if ("scrollLockY" in body.dataset) delete body.dataset.scrollLockY;
};
