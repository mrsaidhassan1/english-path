// Where the app is running. Inside an embedded page (for example a shared claude.ai link)
// the browser blocks printing, file downloads and the microphone, so those controls are hidden.
export const embedded = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
export const canPrint = !embedded;
export const canDownload = !embedded;
