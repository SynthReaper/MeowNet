// lib/security/sanitize.ts — Server-side text & URL sanitizer

/**
 * Strips all HTML tags using a multi-pass approach and HTML-encodes the six
 * most dangerous characters.  Works without a DOM (server safe).
 *
 * Why multi-pass?  Nested or malformed tags like <<script>script>alert(1)<</script>/script>
 * survive a single regex sweep because the first pass removes the inner `<script>` and
 * leaves behind a new `<script>` formed by the outer pair. Three passes closes that gap.
 */
export function sanitizeText(input: string, maxLength = 2000): string {
  if (typeof input !== 'string') return '';

  const ENTITY_MAP: Record<string, string> = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;',
  };

  let result = input;
  // Three-pass strip — handles nested/malformed tag injection
  for (let i = 0; i < 3; i++) {
    result = result.replace(/<[^>]*>/g, '');
  }

  // Encode the six most dangerous characters
  result = result.replace(/[<>&"'`]/g, (c) => ENTITY_MAP[c] ?? c);

  return result.trim().slice(0, maxLength);
}

/**
 * Returns an empty string for any URL whose protocol is not http or https.
 * Prevents javascript:, data:, vbscript: and other injection vectors.
 */
export function sanitizeUrl(input: string): string {
  if (typeof input !== 'string') return '';
  try {
    const url = new URL(input.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}
