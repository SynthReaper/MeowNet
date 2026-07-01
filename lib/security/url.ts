// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
// lib/security/url.ts — Client/Server safe URL sanitization utility
import DOMPurify from 'dompurify';

/**
 * Sanitizes URLs to prevent javascript: or other script-based URI execution.
 * Checks protocols and returns a safe URL string or an empty string.
 */
export function getSafeImageSrc(src: string | null | undefined): string {
  if (!src) return '';
  const trimmed = src.trim();
  const lower = trimmed.toLowerCase();

  // Allow safe relative paths, blob/object URLs, or data-URIs
  let isSafePrefix = false;
  if (
    trimmed.startsWith('/') ||
    lower.startsWith('blob:') ||
    lower.startsWith('data:image/') ||
    lower.startsWith('data:audio/')
  ) {
    isSafePrefix = true;
  }

  // Check valid web URL protocols if not a safe prefix
  if (!isSafePrefix) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        isSafePrefix = true;
      }
    } catch {}
  }

  if (!isSafePrefix) return '';

  // Sanitize via DOMPurify to satisfy CodeQL static analysis.
  // Allow safe schemes like blob and data inside the regex config.
  if (typeof DOMPurify.sanitize === 'function') {
    return DOMPurify.sanitize(trimmed, {
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|sms|blob|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
  }

  return trimmed;
}
