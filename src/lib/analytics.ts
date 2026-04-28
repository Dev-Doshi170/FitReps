import { supabase } from '../services/supabase';
import type {
  BodyWeightPoint,
  ExerciseProgressPoint,
  FocusSessionVolumePoint,
  MuscleGroupVolumePoint,
  PersonalRecord,
  WeeklyStats,
} from '../types/analytics';

type WorkoutLogPrRow = {
  exercise_name: string;
  weight: number | null;
  date: string;
};

type FocusVolumeLogRow = {
  date: string;
  session_id: string | null;
  plan_day_id: string | null;
  weight: number | null;
  reps: number | null;
  plan_days: { type: string } | { type: string }[] | null;
};

const FOCUS_SESSION_CHART_MAX = 32;

function unwrapPlanDayType(
  planDays: FocusVolumeLogRow['plan_days'],
): string | null {
  if (planDays == null) {
    return null;
  }
  const row = Array.isArray(planDays) ? planDays[0] : planDays;
  return row?.type ?? null;
}

function sessionVolumeKey(row: FocusVolumeLogRow): string | null {
  if (row.session_id) {
    return `s:${row.session_id}`;
  }
  if (row.plan_day_id) {
    return `p:${row.plan_day_id}:${row.date}`;
  }
  return null;
}

/**
 * Total training volume (weight × reps) per completed session for a plan day `type`
 * (Push, Pull, Legs, Full Body, Core, …). Uses `workout_logs.session_id` when set;
 * otherwise groups sets that share the same `plan_day_id` and log `date` timestamp.
 */
export async function getFocusVolumePerSession(
  userId: string,
  sessionType: string,
): Promise<FocusSessionVolumePoint[]> {
  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('date, session_id, plan_day_id, weight, reps, plan_days ( type )')
      .eq('user_id', userId)
      .not('plan_day_id', 'is', null);

    if (error) {
      throw error;
    }

    const want = sessionType.trim().toLowerCase();
    const bySession = new Map<string, { total: number; performed_at: string }>();

    for (const raw of (data ?? []) as FocusVolumeLogRow[]) {
      const pdType = unwrapPlanDayType(raw.plan_days);
      if (!pdType || pdType.trim().toLowerCase() !== want) {
        continue;
      }

      const key = sessionVolumeKey(raw);
      if (!key) {
        continue;
      }

      const vol = (raw.weight ?? 0) * (raw.reps ?? 0);
      const prev = bySession.get(key);
      if (prev) {
        prev.total += vol;
        if (raw.date < prev.performed_at) {
          prev.performed_at = raw.date;
        }
      } else {
        bySession.set(key, { total: vol, performed_at: raw.date });
      }
    }

    const sorted = Array.from(bySession.values()).sort((a, b) =>
      a.performed_at.localeCompare(b.performed_at),
    );

    const windowed = sorted.slice(-FOCUS_SESSION_CHART_MAX);

    const dayOrder = new Map<string, number>();
    const labels = windowed.map(({ performed_at }) => {
      const day = performed_at.slice(0, 10);
      const n = (dayOrder.get(day) ?? 0) + 1;
      dayOrder.set(day, n);
      const mmdd = performed_at.slice(5, 10);
      if (n === 1) {
        return mmdd;
      }
      const hm = performed_at.slice(11, 16).replace('T', '');
      return `${mmdd} ${hm}`;
    });

    return windowed.map((row, i) => ({
      performed_at: row.performed_at,
      total_volume: Math.round(row.total),
      label: labels[i] ?? mmddFallback(row.performed_at),
    }));
  } catch (error) {
    console.error('[analytics] getFocusVolumePerSession failed', error);
    return [];
  }
}

function mmddFallback(iso: string): string {
  return iso.slice(5, 10);
}

/**
 * Loads per-session progress points for a specific exercise.
 */
export async function getExerciseProgress(
  userId: string,
  exerciseName: string,
): Promise<ExerciseProgressPoint[]> {
  try {
    const { data, error } = await supabase.rpc('get_exercise_progress', {
      p_user_id: userId,
      p_exercise_name: exerciseName,
    });

    if (error) {
      throw error;
    }

    return (data ?? []) as ExerciseProgressPoint[];
  } catch (error) {
    console.error('[analytics] getExerciseProgress failed', error);
    return [];
  }
}

/**
 * Loads workout volume totals by date for a specific workout focus.
 */
export async function getMuscleGroupVolume(
  userId: string,
  focus: string,
): Promise<MuscleGroupVolumePoint[]> {
  try {
    const { data, error } = await supabase.rpc('get_muscle_group_volume', {
      p_user_id: userId,
      p_focus: focus,
    });

    if (error) {
      throw error;
    }

    return (data ?? []) as MuscleGroupVolumePoint[];
  } catch (error) {
    console.error('[analytics] getMuscleGroupVolume failed', error);
    return [];
  }
}

/**
 * Loads weekly aggregate training summary statistics.
 */
export async function getWeeklySummary(userId: string): Promise<WeeklyStats[]> {
  try {
    const { data, error } = await supabase.rpc('get_weekly_summary', {
      p_user_id: userId,
    });

    if (error) {
      throw error;
    }

    return (data ?? []) as WeeklyStats[];
  } catch (error) {
    console.error('[analytics] getWeeklySummary failed', error);
    return [];
  }
}

/**
 * Loads body weight logs in ascending chronological order.
 */
export async function getBodyWeightTrend(userId: string): Promise<BodyWeightPoint[]> {
  try {
    const { data, error } = await supabase
      .from('body_weight_logs')
      .select('logged_date, weight')
      .eq('user_id', userId)
      .order('logged_date', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []) as BodyWeightPoint[];
  } catch (error) {
    console.error('[analytics] getBodyWeightTrend failed', error);
    return [];
  }
}

/**
 * Computes each exercise personal record (max weight) and its latest achieved date.
 */
export async function getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('exercise_name, weight, date')
      .eq('user_id', userId)
      .not('weight', 'is', null)
      .order('date', { ascending: false });

    if (error) {
      throw error;
    }

    const byExercise = new Map<string, PersonalRecord>();
    for (const row of (data ?? []) as WorkoutLogPrRow[]) {
      if (row.weight == null) {
        continue;
      }

      const existing = byExercise.get(row.exercise_name);
      if (!existing) {
        byExercise.set(row.exercise_name, {
          exercise_name: row.exercise_name,
          max_weight: row.weight,
          date: row.date,
        });
        continue;
      }

      if (row.weight > existing.max_weight || (row.weight === existing.max_weight && row.date > existing.date)) {
        byExercise.set(row.exercise_name, {
          exercise_name: row.exercise_name,
          max_weight: row.weight,
          date: row.date,
        });
      }
    }

    return Array.from(byExercise.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch (error) {
    console.error('[analytics] getPersonalRecords failed', error);
    return [];
  }
}
