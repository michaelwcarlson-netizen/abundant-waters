/* One player shell for all trip activities. The iframe survives closing the shell. */
window.createImmersivePlayer = function createImmersivePlayer(onClose) {
  const shell = document.getElementById("level-player");
  const host = document.getElementById("level-stage");
  const heading = document.getElementById("level-title");
  const exit = document.getElementById("level-exit");
  const continueTrip = document.getElementById("level-continue");
  let frame = null, currentKey = null, currentUrl = null, lastFocus = null, nativeActive = false;

  function close() {
    if (shell.hidden) return;
    if (document.fullscreenElement === shell && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    frame?.contentWindow?.postMessage({ type: "abundant-waters:pause" }, location.origin);
    shell.hidden = true;
    document.body.classList.remove("player-open");
    nativeActive = false;
    onClose();
    if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
  }

  function dispose() {
    close();
    frame?.remove();
    frame = null;
    currentKey = null;
    currentUrl = null;
  }

  function open({ key, name, url }) {
    lastFocus = document.activeElement;
    if (!frame || currentKey !== key || currentUrl !== url) {
      frame?.remove();
      frame = document.createElement("iframe");
      frame.title = name + " game";
      frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
      const loadedFrame = frame;
      loadedFrame.addEventListener("load", () => {
        if (!loadedFrame.isConnected) return;
        loadedFrame.contentWindow?.postMessage({
          type: shell.hidden ? "abundant-waters:pause" : "abundant-waters:resume"
        }, location.origin);
      });
      frame.src = url;
      host.append(frame);
      currentKey = key;
      currentUrl = url;
    }
    heading.textContent = name;
    continueTrip.hidden = true;
    shell.hidden = false;
    document.body.classList.add("player-open");
    exit.focus({ preventScroll: true });
    frame.contentWindow?.postMessage({ type: "abundant-waters:resume" }, location.origin);
    // This call stays in the user's click handler; rejected and unsupported requests keep the viewport overlay.
    if (shell.requestFullscreen) {
      try { shell.requestFullscreen().catch(() => {}); } catch (_) { /* viewport overlay remains open */ }
    }
    requestAnimationFrame(() => {
      try { frame.contentWindow.dispatchEvent(new Event("resize")); } catch (_) { /* frame still fills its host */ }
    });
  }

  function sourceIsLevel(source) {
    if (!frame || !source) return false;
    if (source === frame.contentWindow) return true;
    try { return Array.from(frame.contentWindow.frames).includes(source); }
    catch (_) { return false; }
  }

  exit.addEventListener("click", close);
  continueTrip.addEventListener("click", () => {
    close();
    document.getElementById("next").click();
  });
  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement === shell) nativeActive = true;
    else if (nativeActive && !shell.hidden) close();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !shell.hidden) close();
  });
  window.addEventListener("message", event => {
    if (event.origin === location.origin && event.data?.type === "abundant-waters:exit-immersive" &&
        sourceIsLevel(event.source)) close();
  });

  return { open, close, dispose, markComplete() { continueTrip.hidden = false; }, get iframe() { return frame; }, isCurrent: key => currentKey === key && !!frame };
};
