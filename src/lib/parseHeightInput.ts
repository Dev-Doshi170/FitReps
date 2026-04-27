const CM_IN = 1 / 2.54;
const MIN_IN = 48;
const MAX_IN = 95;

/**
 * Centimeters to total inches (for storage in `user_profiles.height_inches`).
 */
export function cmToInches(cm: number): number {
  return Math.round((cm * CM_IN) * 10) / 10;
}

/**
 * Parse a cm string, e.g. 170, 170.5. Valid range ≈ 122–242 cm to land in 48–95 in.
 */
export function parseHeightCmString(s: string): number | null {
  const t = s.trim();
  if (!t) {
    return null;
  }
  const n = Number(t.replace(',', '.'));
  if (!Number.isFinite(n) || n < 100 || n > 245) {
    return null;
  }
  const inches = cmToInches(n);
  if (inches < MIN_IN || inches > MAX_IN) {
    return null;
  }
  return inches;
}

/**
 * Parse "5'7", "5'7\"", 5' 7, 5ft7, 5-7, or two-part "5" feet "7" inches in one string.
 * Returns total inches, or null.
 */
export function parseFeetInchesStringToInches(raw: string): number | null {
  const t = raw
    .trim()
    .replace(/[’´`]/g, "'")
    .replace(/[""‟]/g, '"')
    .replace(/inches?/gi, '')
    .replace(/\s+/g, ' ');
  if (!t) {
    return null;
  }
  // 5 ft 7  / 5 feet 7
  const a = t.match(
    /^(\d{1,2})\s*(?:ft|feet)\s*(\d{1,2})\s*$/i,
  );
  if (a) {
    return feetPartsToInches(+a[1], +a[2]);
  }
  // 5'7" 5' 7
  const a2 = t.match(
    /^(\d{1,2})\s*[''′]\s*(\d{1,2})\s*['"″']?$/i,
  );
  if (a2) {
    return feetPartsToInches(+a2[1], +a2[2]);
  }
  // 5-7  (ft-in shorthand)
  const b = t.match(/^(\d{1,2})\s*[-–—]\s*(\d{1,2})$/);
  if (b) {
    return feetPartsToInches(+b[1], +b[2]);
  }
  // 5 7  (ft and in with space, second number ≤ 11)
  const c = t.match(/^(\d{1,2})\s+(\d{1,2})$/);
  if (c) {
    const f = +c[1];
    const inch = +c[2];
    if (inch <= 11) {
      return feetPartsToInches(f, inch);
    }
  }
  // 5ft7 (no space)
  const d = t.match(/^(\d)ft(\d{1,2})$/i);
  if (d) {
    return feetPartsToInches(+d[1], +d[2]);
  }
  // Whole feet only: 5' or 5
  const e = t.match(/^(\d{1,2})(?:'|ft)?$/i);
  if (e) {
    return feetPartsToInches(+e[1], 0);
  }
  return null;
}

function feetPartsToInches(feet: number, inches: number): number | null {
  if (!Number.isFinite(feet) || !Number.isFinite(inches) || inches < 0 || inches > 11) {
    return null;
  }
  if (feet < 0 || feet > 8) {
    return null;
  }
  const total = feet * 12 + inches;
  if (total < MIN_IN || total > MAX_IN) {
    return null;
  }
  return total;
}
