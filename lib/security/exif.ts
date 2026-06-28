// lib/security/exif.ts
// Strips ALL EXIF metadata before storage — prevents GPS coordinate leakage
// Runs SERVER-SIDE ONLY via sharp — never execute on client.

import sharp from 'sharp';

export async function stripExifAndNormalize(
  buffer: Buffer,
  maxDimension = 1200,
): Promise<{ buffer: Buffer; format: string; width: number; height: number }> {
  const { data, info } = await sharp(buffer)
    .rotate() // Auto-orient using EXIF orientation, then discard
    .withMetadata({ exif: {} }) // Wipe all EXIF metadata
    .resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer({ resolveWithObject: true });

  return { buffer: data as Buffer, format: info.format, width: info.width, height: info.height };
}

export function validateImageBuffer(buffer: Buffer): boolean {
  // Check magic bytes for JPEG (FF D8 FF), PNG (89 50 4E 47), and WebP (RIFF .... WEBP)
  const jpegMagic = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const pngMagic = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const webpMagic = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
                    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  return jpegMagic || pngMagic || webpMagic;
}
