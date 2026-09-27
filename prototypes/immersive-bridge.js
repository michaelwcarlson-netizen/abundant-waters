/* Escape also reaches the parent while keyboard focus is inside a level. */
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && window.top !== window) {
    window.top.postMessage({ type: "abundant-waters:exit-immersive" }, location.origin);
  }
});
