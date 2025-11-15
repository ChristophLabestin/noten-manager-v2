export const lockBodyScroll = () => {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (body.dataset.scrollLocked === "true") return;

  const scrollY = window.scrollY || window.pageYOffset || 0;
  body.dataset.scrollLocked = "true";
  body.dataset.scrollLockY = String(scrollY);

  body.classList.add("scroll-disable");
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
};

export const unlockBodyScroll = () => {
  if (typeof document === "undefined") return;
  const body = document.body;

  const scrollY = parseInt(body.dataset.scrollLockY || "0", 10) || 0;

  body.classList.remove("scroll-disable");

  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  body.style.width = "";

  delete body.dataset.scrollLocked;
  delete body.dataset.scrollLockY;

  if (typeof window !== "undefined") {
    window.scrollTo(0, scrollY);
  }
};

