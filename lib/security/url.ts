// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
// lib/security/url.ts — Client/Server safe URL sanitization utility

/**
 * Sanitizes URLs to prevent javascript: or other script-based URI execution.
 * Checks protocols and returns a safe URL string or an empty string.
 */
export function getSafeImageSrc(src: string | null | undefined): string {
  if (!src) return '';
  const trimmed = src.trim();
  const lower = trimmed.toLowerCase();

  // Allow safe relative paths, blob/object URLs, or data-URIs
  if (
    trimmed.startsWith('/') ||
    lower.startsWith('blob:') ||
    lower.startsWith('data:image/') ||
    lower.startsWith('data:audio/')
  ) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {}

  return '';
}
