/**
 * Strips everything but digits from typed input. Paired with a plain
 * `type="text"` input -- deliberately NOT `type="number"` or
 * `inputMode="numeric"`. Both are documented to commit/reset the Chrome
 * IME composition state on Windows when focus later moves to a different
 * field, which is what made Korean typing silently fall back to English
 * after using a count field (no `한/영` toggle involved, and no way for a
 * web page to force the OS IME's default language back to Korean --
 * that's outside what any site can control). Plain `type="text"` plus this
 * filter avoids the trigger entirely, at the cost of the mobile numeric
 * keypad no longer popping up automatically.
 */
export function digitsOnly(value: string): string {
  return value.replace(/[^0-9]/g, '');
}
