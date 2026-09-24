import { inspectImage } from "./imageValidation";
export const MAX_PHOTO_SIZE = 12 * 1024 * 1024;

/** Decode locally, strip metadata by rasterizing, and keep storage/memory bounded. */
export async function resizePhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "Choose a JPEG, PNG or WebP photo. Export HEIC photos as JPEG first.",
    );
  if (file.size > MAX_PHOTO_SIZE || file.size === 0)
    throw new Error("Choose a photo smaller than 12 MiB that is not empty.");
  inspectImage(
    new Uint8Array(await file.arrayBuffer()),
    file.type,
    16_000,
    80_000_000,
  );
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(
          new Error("Could not read this photo. Try a different JPEG or PNG."),
        );
      image.src = url;
    });
    if (
      !img.naturalWidth ||
      !img.naturalHeight ||
      img.naturalWidth * img.naturalHeight > 80_000_000
    )
      throw new Error("Photo dimensions are invalid or too large.");
    const scale = Math.min(
      1,
      640 / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Photo processing is unavailable in this browser.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL("image/jpeg", 0.8);
    if (
      !result.startsWith("data:image/jpeg;base64,") ||
      result.length > 700_000
    )
      throw new Error("This photo could not be compressed. Try another photo.");
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}
