/**
 * Strips everything but digits from typed input. Paired with a plain
 * `type="text"` input (plus `inputMode="numeric"` for the mobile numeric
 * keypad) instead of the native `type="number"` -- Chrome on Windows can
 * leave the OS-level IME stuck in half-width/English mode after a
 * `type="number"` field is focused, so typing Korean into the *next*
 * field (e.g. clicking back into a name search box) silently comes out in
 * English until the user manually toggles 한/영. `type="text"` fields
 * don't have this problem, so this is the standard workaround.
 */
export function digitsOnly(value: string): string {
  return value.replace(/[^0-9]/g, '');
}
