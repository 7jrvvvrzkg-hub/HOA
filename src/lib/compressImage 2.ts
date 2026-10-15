"use client";

/**
 * Vercel's serverless functions hard-cap any request body (including a
 * Server Action's multipart upload) at 4.5MB — that ceiling can't be raised,
 * so a full-resolution phone photo (a 48MP shot easily runs 15-25MB) blows
 * through it and the upload fails with a raw platform error page instead of
 * a friendly in-app message. Shrinking the image in the browser before it's
 * ever sent avoids that entirely, and looks identical for an avatar or a
 * photo attached as a document — nobody needs the original 48MP resolution
 * for either of those.
 *
 * Leaves non-image files and already-small images untouched.
 */
export async function compressImageIfNeeded(
  file: File,
  { maxDimension = 1600, quality = 0.82, skipIfUnder = 1.5 * 1024 * 1024 }: {
    maxDimension?: number;
    quality?: number;
    skipIfUnder?: number;
  } = {}
): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= skipIfUnder) {
    return file;
  }
  // Animated formats lose their animation if we redraw them onto a canvas —
  // better to leave those alone and let the size limit/error message handle it.
  if (file.type === "image/gif") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    // If the browser can't decode/re-encode it for any reason, fall back to
    // the original file and let the normal size check catch it.
    return file;
  }
}
