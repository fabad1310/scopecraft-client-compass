/**
 * Downscales an image file in the browser and returns it as a data URL,
 * so it can be stored inline in the form's JSON (no storage bucket needed).
 */
export function resizeImage(file: File, max = 800, type: "image/png" | "image/jpeg" = "image/png", quality = 0.85): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      const ctx = c.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); rej(new Error("Canvas no disponible")); return; }
      if (type === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height); }
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL(type, quality));
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); rej(e); };
    img.src = url;
  });
}

/** Reference photos: larger than logos, JPEG to keep the payload small. */
export function resizeReferencePhoto(file: File) {
  return resizeImage(file, 1600, "image/jpeg", 0.82);
}
