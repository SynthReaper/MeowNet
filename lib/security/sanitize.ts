// lib/security/sanitize.ts — DOMPurify + text sanitizer

/**
 * Strips HTML and normalizes text for safe storage.
 * Used on all user-provided text fields.
 * Note: DOMPurify is browser-only; this uses a simple server-side strip.
 */
export function sanitizeText(input: string, maxLength = 2000): string {
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[<>&"'`]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#x27;', '`': '&#x60;' }[c] ?? c))
    .trim()
    .slice(0, maxLength);
}

export function sanitizeUrl(input: string): string {
  try {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}
