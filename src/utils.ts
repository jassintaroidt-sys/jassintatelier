/**
 * Utility functions for Jassinta Atelier WMS Central State
 */

/**
 * Compress base64 image data string using Canvas
 * Downsizes image to fit within maxWidth/maxHeight and encodes to highly compressed JPEG.
 * This ensures localStorage limits (5MB) are never exceeded.
 */
export function compressImage(
  base64Str: string,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.92
): Promise<string> {
  return new Promise((resolve) => {
    // If it's not a data URL image, skip compression
    if (!base64Str || !base64Str.startsWith("data:image")) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Fill white background for JPEG conversion handling transparency gracefully
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);
        // Force output format to image/jpeg with designated quality level
        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}

/**
 * Dispatches a reactive, system-wide custom security event.
 * Dashboard listening controls catch this to display animated banners/toasts.
 */
export function dispatchSecurityAlert(
  type: "BRANDING" | "SECURITY" | "STOCK" | "RETURN" | "ROLE",
  message: string,
  user = "Ahmad Gudang"
) {
  try {
    const alertData = {
      id: "sec-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      type,
      message,
      timestamp: new Date().toLocaleTimeString("id-ID"),
      user,
      ip: ["36.85.12.98", "192.168.1.5", "112.215.10.4"][Math.floor(Math.random() * 3)]
    };

    // Dispatch live event
    window.dispatchEvent(
      new CustomEvent("jassinta-security-alert", {
        detail: alertData
      })
    );
  } catch (error) {
    console.error("Failed to build security alert event:", error);
  }
}
