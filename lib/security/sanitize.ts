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

  // Non-regex, linear O(N) tag stripper. Stops scanning forward for closing '>'
  // once it determines no more closing '>' exist, avoiding O(N^2) scans.
  function stripTags(str: string): string {
    let clean = '';
    let i = 0;
    while (i < str.length) {
      if (str[i] === '<') {
        let j = i + 1;
        while (j < str.length && str[j] !== '>') {
          j++;
        }
        if (j < str.length) {
          i = j + 1;
          continue;
        } else {
          // No closing '>' left in the remainder of the string.
          clean += str.slice(i);
          break;
        }
      }
      clean += str[i];
      i++;
    }
    return clean;
  }

  // Three-pass strip — handles nested/malformed tag injection
  for (let i = 0; i < 3; i++) {
    result = stripTags(result);
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
