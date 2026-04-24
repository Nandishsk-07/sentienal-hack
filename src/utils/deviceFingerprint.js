// Simple djb2 hash function as requested
function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  // Convert to positive 32-bit integer hex string
  return (hash >>> 0).toString(16);
}

function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    // Draw some text to get a unique canvas rendering base64
    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("SENTINEL-Fingerprint", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("SENTINEL-Fingerprint", 4, 17);
    return djb2Hash(canvas.toDataURL());
  } catch (e) {
    return '';
  }
}

export const collectDeviceFingerprint = () => {
  try {
    const userAgent = navigator.userAgent;
    const screen = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    const platform = navigator.platform;
    const cores = navigator.hardwareConcurrency || null;
    const memory = navigator.deviceMemory || null;
    const canvasHash = getCanvasFingerprint();

    const hashString = `${userAgent}|${screen}|${timezone}|${language}|${platform}|${cores}|${memory}|${canvasHash}`;
    const deviceId = "FP-" + djb2Hash(hashString);

    return {
      deviceId,
      userAgent,
      screen,
      timezone,
      language,
      platform,
      cores,
      memory,
      trustLevel: null,
      collectionFailed: false,
      failureReason: null
    };
  } catch (error) {
    return {
      deviceId: "FP-COLLECTION-FAILED",
      userAgent: navigator.userAgent || "unknown",
      screen: "unknown",
      timezone: "unknown",
      language: "unknown",
      platform: "unknown",
      cores: null,
      memory: null,
      trustLevel: null,
      collectionFailed: true,
      failureReason: error.message || "Unknown client-side exception."
    };
  }
};
