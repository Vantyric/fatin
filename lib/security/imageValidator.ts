/**
 * Server-side image validator using magic-byte signatures and size limits.
 * Protects against disguised malicious uploads (e.g. polyglot executables, SVGs with XSS).
 */

export interface ImageValidationResult {
  valid: boolean;
  detectedMimeType?: "image/jpeg" | "image/png" | "image/webp";
  errorAr?: string;
  buffer?: Buffer;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB hard cap

export function validateImageBase64(base64String: string, claimedMimeType?: string): ImageValidationResult {
  if (!base64String) {
    return { valid: false, errorAr: "لم يتم تقديم أي صورة للفحص" };
  }

  // Strip data URL scheme if present (e.g. "data:image/jpeg;base64,...")
  const cleanBase64 = base64String.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");

  let buffer: Buffer;
  try {
    buffer = Buffer.from(cleanBase64, "base64");
  } catch {
    return { valid: false, errorAr: "صيغة تشفير الصورة غير صالحة" };
  }

  if (buffer.length === 0) {
    return { valid: false, errorAr: "الملف المرفوع فارغ" };
  }

  if (buffer.length > MAX_IMAGE_BYTES) {
    return {
      valid: false,
      errorAr: `حجم الصورة (${(buffer.length / (1024 * 1024)).toFixed(1)}MB) يتجاوز الحد الأقصى المسموح به (5MB)`,
    };
  }

  // Check Magic Bytes
  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMimeType: "image/jpeg", buffer };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMimeType: "image/png", buffer };
  }

  // WebP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return { valid: true, detectedMimeType: "image/webp", buffer };
  }

  return {
    valid: false,
    errorAr: "نوع الملف غير مدعوم أو تالف (يُقبل فقط صور JPG، PNG، WEBP الحقيقية)",
  };
}
