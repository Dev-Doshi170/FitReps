import type { RootState } from '../index';

export function selectSessionVolumeKg(state: RootState): number {
  return state.workout.logs.reduce((sum, l) => {
    if (l.reps != null && l.weight != null) {
      return sum + l.reps * l.weight;
    }
    return sum;
  }, 0);
}

export function selectSetsCompleted(state: RootState): number {
  return state.workout.logs.filter(l => l.supabaseId).length;
}

export function selectSessionDurationMs(state: RootState, nowMs: number): number {
  const t = state.workout.sessionStartedAt;
  if (t == null) {
    return 0;
  }
  return Math.max(0, nowMs - t);
}

/** Heuristic: recommendations that signal overload progression (PR-ish). */
export function selectPrsHitCount(state: RootState): number {
  const recs = state.workout.sessionRecommendations;
  let n = 0;
  for (const r of Object.values(recs)) {
    if (r.flag === 'increase_weight' || r.flag === 'increase_reps') {
      n += 1;
    }
  }
  return n;
}
