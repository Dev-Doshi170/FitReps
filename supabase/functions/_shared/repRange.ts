/**
 * Parse plan_exercises.reps strings (e.g. "8-10", "12", "Max or 8") into a numeric range.
 * Duplicated from app `src/lib/repRange.ts` — canonical copy for Edge Functions.
 */
export type ParsedRepRange = { min: number; max: number };

const DEFAULT_RANGE: ParsedRepRange = { min: 8, max: 12 };

function firstIntInString(s: string): number | null {
  const m = s.match(/(\d+)/);
  if (!m) {
    return null;
  }
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function parsePlanRepsString(repsRaw: string): ParsedRepRange {
  const s = repsRaw.trim();
  if (!s) {
    return { ...DEFAULT_RANGE };
  }

  const lower = s.toLowerCase();
  if (lower.includes('max') || lower.includes('amrap')) {
    const n = firstIntInString(s);
    const v = n ?? DEFAULT_RANGE.max;
    return { min: Math.max(1, v - 4), max: v };
  }

  const rangeMatch = s.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) {
    const a = Number(rangeMatch[1]);
    const b = Number(rangeMatch[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return { min: Math.min(a, b), max: Math.max(a, b) };
    }
  }

  const single = firstIntInString(s);
  if (single != null) {
    return { min: single, max: single };
  }

  return { ...DEFAULT_RANGE };
}
