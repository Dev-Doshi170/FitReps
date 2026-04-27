import type { Tables } from '../../database.types';
import { supabase } from '../services/supabase';
import type { ProgressionRecommendation, ProgressionState } from './progressionTypes';
import { parsePlanRepsString } from './repRange';

export type WorkoutLog = Tables<'workout_logs'>;

function rowToProgressionState(row: Tables<'progression_state'>): ProgressionState {
  const last = row.last_session_rpe;
  const lastRpe =
    last === 'easy' || last === 'medium' || last === 'hard'
      ? last
      : null;
  return {
    exerciseName: row.exercise_name,
    currentWeight: row.current_weight != null ? Number(row.current_weight) : null,
    currentRepsTarget: row.current_reps_target ?? row.rep_range_min,
    repRangeMin: row.rep_range_min,
    repRangeMax: row.rep_range_max,
    consecutiveHardSets: row.consecutive_hard_sets ?? 0,
    consecutiveEasySessions: row.consecutive_easy_sessions ?? 0,
    lastSessionRpe: lastRpe,
  };
}

function defaultProgressionState(
  exerciseName: string,
  repRangeMin: number,
  repRangeMax: number,
): ProgressionState {
  return {
    exerciseName,
    currentWeight: null,
    currentRepsTarget: repRangeMin,
    repRangeMin,
    repRangeMax,
    consecutiveHardSets: 0,
    consecutiveEasySessions: 0,
    lastSessionRpe: null,
  };
}

/** Get or initialize progression state for a user+exercise (by name). */
export async function getProgressionState(
  userId: string,
  exerciseName: string,
  repRangeMin: number,
  repRangeMax: number,
): Promise<ProgressionState> {
  const { data, error } = await supabase
    .from('progression_state')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_name', exerciseName)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return defaultProgressionState(exerciseName, repRangeMin, repRangeMax);
  }

  return rowToProgressionState(data);
}

/**
 * Run progression logic on the server (Edge Function) and persist `progression_state`.
 * Change rules by editing `supabase/functions/_shared/progressionEngine.ts` and redeploying the function.
 */
export async function applyProgressionFromEdge(
  exerciseName: string,
  equipment: string,
  repRange: string,
  sets: {
    setNumber: number;
    reps: number;
    weight: number | null;
    rpe: string | null;
  }[],
): Promise<{ recommendation: ProgressionRecommendation; progression: ProgressionState }> {
  const { data, error } = await supabase.functions.invoke<{
    recommendation: ProgressionRecommendation;
    progression: ProgressionState;
  }>('apply-progression', {
    body: {
      exercise_name: exerciseName,
      equipment,
      rep_range: repRange,
      sets,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
  if (data == null || typeof data !== 'object') {
    throw new Error('No data from apply-progression');
  }
  return data as { recommendation: ProgressionRecommendation; progression: ProgressionState };
}

/** Direct upsert (e.g. tooling); normal flow uses {@link applyProgressionFromEdge}. */
export async function upsertProgressionState(
  userId: string,
  state: ProgressionState,
): Promise<void> {
  const { error } = await supabase.from('progression_state').upsert(
    {
      user_id: userId,
      exercise_name: state.exerciseName,
      current_weight: state.currentWeight,
      current_reps_target: state.currentRepsTarget,
      rep_range_min: state.repRangeMin,
      rep_range_max: state.repRangeMax,
      consecutive_hard_sets: state.consecutiveHardSets,
      consecutive_easy_sessions: state.consecutiveEasySessions,
      last_session_rpe: state.lastSessionRpe,
      last_updated: new Date().toISOString(),
    },
    { onConflict: 'user_id,exercise_name' },
  );

  if (error) {
    throw new Error(error.message);
  }
}

/** Last N workout log rows for an exercise (most recent sets first). */
export async function getLastWorkoutLogs(
  userId: string,
  exerciseName: string,
  limit: number,
): Promise<WorkoutLog[]> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_name', exerciseName)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as WorkoutLog[];
}

/** Convenience: parse plan reps string and load progression. */
export async function getProgressionStateForPlanExercise(
  userId: string,
  exerciseName: string,
  repsField: string,
): Promise<ProgressionState> {
  const { min, max } = parsePlanRepsString(repsField);
  return getProgressionState(userId, exerciseName, min, max);
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type ExerciseSessionGroup = {
  dateKey: string;
  sets: { setNumber: number; reps: number | null; weight: number | null }[];
};

/** Group `workout_logs` by local calendar day for one exercise (most recent days first). */
export async function getExerciseSessionHistory(
  userId: string,
  exerciseName: string,
  maxSessions = 16,
): Promise<ExerciseSessionGroup[]> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('date, set_number, reps, weight')
    .eq('user_id', userId)
    .eq('exercise_name', exerciseName)
    .order('date', { ascending: false })
    .limit(1200);

  if (error) {
    throw new Error(error.message);
  }

  const byDate = new Map<string, { set_number: number; reps: number | null; weight: number | null }[]>();
  for (const row of data ?? []) {
    const r = row as { date: string; set_number: number; reps: number | null; weight: number | null };
    const dk = localDateKey(new Date(r.date));
    if (!byDate.has(dk)) {
      byDate.set(dk, []);
    }
    byDate.get(dk)!.push({
      set_number: r.set_number,
      reps: r.reps,
      weight: r.weight,
    });
  }

  const keys = Array.from(byDate.keys()).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  return keys.slice(0, maxSessions).map(k => {
    const raw = byDate.get(k) ?? [];
    const sorted = [...raw].sort((a, b) => a.set_number - b.set_number);
    return {
      dateKey: k,
      sets: sorted.map(s => ({
        setNumber: s.set_number,
        reps: s.reps,
        weight: s.weight,
      })),
    };
  });
}
