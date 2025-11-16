export const lockBodyScroll = () => {
  if (typeof document === "undefined") return;
  const body = document.body;
  body.classList.add("scroll-disable");
};

export const unlockBodyScroll = () => {
  if (typeof document === "undefined") return;
  const body = document.body;

  body.classList.remove("scroll-disable");

  // Cleanup any legacy inline styles / data from older implementations
  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  body.style.width = "";
  if ("scrollLocked" in body.dataset) delete body.dataset.scrollLocked;
  if ("scrollLockY" in body.dataset) delete body.dataset.scrollLockY;
};
