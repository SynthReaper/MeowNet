// lib/security/exif.ts
// Strips ALL EXIF metadata before storage — prevents GPS coordinate leakage
// Runs SERVER-SIDE ONLY via sharp — never execute on client.

import sharp from 'sharp';

export async function stripExifAndNormalize(
  buffer: Buffer,
  maxDimension = 1200,
): Promise<{ buffer: Buffer; format: string; width: number; height: number }> {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const format = metadata.format as string | undefined;

  let pipeline = image
    .rotate() // Auto-orient using EXIF orientation, then discard
    .withMetadata({ exif: {} }) // Wipe all EXIF metadata
    .resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true });

  if (format === 'webp') {
    pipeline = pipeline.webp({ quality: 85, effort: 0 });
  } else if (format === 'avif') {
    pipeline = pipeline.avif({ quality: 85, effort: 0 });
  } else if (format === 'png') {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else {
    pipeline = pipeline.jpeg({ quality: 85, progressive: true });
  }

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  return { buffer: data as Buffer, format: info.format, width: info.width, height: info.height };
}

export function validateImageBuffer(buffer: Buffer): boolean {
  // Check magic bytes for JPEG (FF D8 FF), PNG (89 50 4E 47), WebP (RIFF .... WEBP), and AVIF (ftypavif at offset 4)
  const jpegMagic = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const pngMagic = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const webpMagic = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
                    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  const avifMagic = buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70 &&
                    buffer[8] === 0x61 && buffer[9] === 0x76 && buffer[10] === 0x69 && buffer[11] === 0x66;
  return jpegMagic || pngMagic || webpMagic || avifMagic;
}
