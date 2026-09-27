/* Escape also reaches the parent while keyboard focus is inside a level. */
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && window.top !== window) {
    window.top.postMessage({ type: "abundant-waters:exit-immersive" }, location.origin);
  }
});

/* The trip keeps only in-memory activity state. Each level reports its own finish. */
window.AbundantWaters = {
  complete(detail = {}) {
    if (window.parent !== window) window.parent.postMessage({ type: "abundant-waters:activity-complete", detail }, location.origin);
  }
};
window.addEventListener("message", event => {
  if (event.origin !== location.origin || event.source !== window.parent) return;
  if (event.data?.type === "abundant-waters:pause" || event.data?.type === "abundant-waters:resume")
    window.dispatchEvent(new Event(event.data.type));
});
