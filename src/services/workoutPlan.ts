import type { DayPlan, Exercise, ExerciseType } from '../store/slices/workoutSlice';
import { supabase } from './supabase';

/** Default plan seeded in Supabase (`supabase/workout_plan_seed.sql`). */
export const DEFAULT_PLAN_NAME = "Dev's Plan";

export type WorkoutPlanSummary = {
  id: string;
  name: string;
  goal: string;
  level: string;
  days_per_week: number;
};

export async function fetchAllPlans(): Promise<{
  plans: WorkoutPlanSummary[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('plans')
    .select('id, name, goal, level, days_per_week')
    .order('name', { ascending: true });

  if (error) {
    return { plans: [], error: error.message };
  }
  return { plans: (data ?? []) as WorkoutPlanSummary[], error: null };
}

/** Calendar weekday labels; index matches JS `Date.getDay()` with Monday-first ordering for display sort. */
const WEEKDAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export type PlanSessionExercise = {
  name: string;
  sets: number;
  reps: string;
};

export type PlanSessionDetail = {
  /** e.g. Monday */
  day: string;
  /** Split label from DB: Push, Pull, Legs, etc. */
  sessionType: string;
  focus: string;
  durationMinutes: number;
  exercises: PlanSessionExercise[];
};

export type WorkoutPlanDetail = {
  id: string;
  name: string;
  goal: string;
  level: string;
  daysPerWeek: number;
  sessions: PlanSessionDetail[];
};

type PlanExerciseNameRow = {
  sort_order: number;
  sets: number;
  reps: string;
  exercises: { name: string } | { name: string }[] | null;
};

type PlanDayDetailRow = {
  day: string;
  type: string;
  focus: string;
  duration_minutes: number;
  plan_exercises: PlanExerciseNameRow[] | null;
};

/**
 * Full plan outline: each training day’s split type and exercise list (read-only catalog).
 */
export async function fetchPlanDetail(planId: string): Promise<{
  detail: WorkoutPlanDetail | null;
  error: string | null;
}> {
  const { data: planMeta, error: planErr } = await supabase
    .from('plans')
    .select('id, name, goal, level, days_per_week')
    .eq('id', planId)
    .maybeSingle();

  if (planErr) {
    return { detail: null, error: planErr.message };
  }
  if (!planMeta) {
    return { detail: null, error: 'Plan not found.' };
  }

  const { data: dayRows, error: daysErr } = await supabase
    .from('plan_days')
    .select(
      `
      day,
      type,
      focus,
      duration_minutes,
      plan_exercises (
        sort_order,
        sets,
        reps,
        exercises (
          name
        )
      )
    `,
    )
    .eq('plan_id', planId);

  if (daysErr) {
    return { detail: null, error: daysErr.message };
  }

  const sorted = [...(dayRows ?? [])].sort((a, b) => {
    const ai = WEEKDAY_ORDER.indexOf((a as PlanDayDetailRow).day as (typeof WEEKDAY_ORDER)[number]);
    const bi = WEEKDAY_ORDER.indexOf((b as PlanDayDetailRow).day as (typeof WEEKDAY_ORDER)[number]);
    const as = ai === -1 ? 99 : ai;
    const bs = bi === -1 ? 99 : bi;
    return as - bs;
  });

  const sessions: PlanSessionDetail[] = sorted.map(row => {
    const r = row as unknown as PlanDayDetailRow;
    const list = [...(r.plan_exercises ?? [])].sort((x, y) => x.sort_order - y.sort_order);
    const exercises: PlanSessionExercise[] = list.map(pe => {
      return {
        name: unwrapExerciseName(pe.exercises) ?? 'Exercise',
        sets: pe.sets,
        reps: pe.reps,
      };
    });
    return {
      day: r.day,
      sessionType: r.type,
      focus: r.focus,
      durationMinutes: r.duration_minutes,
      exercises,
    };
  });

  return {
    detail: {
      id: planMeta.id as string,
      name: planMeta.name as string,
      goal: planMeta.goal as string,
      level: planMeta.level as string,
      daysPerWeek: planMeta.days_per_week as number,
      sessions,
    },
    error: null,
  };
}

const JS_DAY_TO_NAME = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

type ExerciseRow = {
  id: string;
  name: string;
  equipment: string;
  type: string;
  muscle_primary: string;
  muscle_secondary: string[] | null;
  notes: string | null;
};

type PlanExerciseRow = {
  id: string;
  sort_order: number;
  sets: number;
  reps: string;
  /** PostgREST may return one object or a single-element array for FK embeds. */
  exercises: ExerciseRow | ExerciseRow[] | null;
};

type PlanDayRow = {
  id: string;
  day: string;
  focus: string;
  duration_minutes: number;
  warmup: string;
  cardio_title: string;
  cardio_duration_minutes: number | null;
  cardio_instructions: string;
  plan_exercises: PlanExerciseRow[] | null;
};

function isExerciseType(t: string): t is ExerciseType {
  return t === 'Compound' || t === 'Isolation' || t === 'Isometric';
}

function unwrapExercise(ex: ExerciseRow | ExerciseRow[] | null): ExerciseRow | null {
  if (ex == null) {
    return null;
  }
  return Array.isArray(ex) ? ex[0] ?? null : ex;
}

function unwrapExerciseName(
  ex: { name: string } | { name: string }[] | null,
): string | null {
  if (ex == null) {
    return null;
  }
  const row = Array.isArray(ex) ? ex[0] ?? null : ex;
  return row?.name ?? null;
}

function mapPlanDayToDayPlan(row: PlanDayRow): DayPlan {
  const list = [...(row.plan_exercises ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const exercises: Exercise[] = list.map(pe => {
    const ex = unwrapExercise(pe.exercises);
    if (!ex) {
      throw new Error('plan_exercise row missing joined exercise');
    }
    const exerciseType: ExerciseType = isExerciseType(ex.type) ? ex.type : 'Compound';
    return {
      id: pe.id,
      name: ex.name,
      sets: pe.sets,
      rep_range: pe.reps,
      type: exerciseType,
      equipment: ex.equipment,
    };
  });

  return {
    day_name: row.day,
    focus: row.focus,
    duration_minutes: row.duration_minutes,
    warmup: row.warmup,
    exercises,
    cardio_finisher: {
      title: row.cardio_title,
      duration_minutes: row.cardio_duration_minutes ?? 0,
      instructions: row.cardio_instructions,
    },
  };
}

/**
 * Loads the scheduled day for the given plan (or the default plan by name when `selectedPlanId` is null).
 * Weekend (Sat/Sun) → no session (`dayPlan: null`, `error: null`).
 */
export async function fetchDayPlanForWeekday(
  dayOfWeek: number,
  selectedPlanId?: string | null,
): Promise<{
  dayPlan: DayPlan | null;
  error: string | null;
}> {
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { dayPlan: null, error: null };
  }
  const dayName = JS_DAY_TO_NAME[dayOfWeek];

  let planId: string;

  if (selectedPlanId) {
    planId = selectedPlanId;
  } else {
    const { data: planRow, error: planErr } = await supabase
      .from('plans')
      .select('id')
      .eq('name', DEFAULT_PLAN_NAME)
      .maybeSingle();

    if (planErr) {
      return { dayPlan: null, error: planErr.message };
    }
    if (!planRow) {
      return {
        dayPlan: null,
        error: `Workout plan "${DEFAULT_PLAN_NAME}" was not found. Run the SQL seed in Supabase.`,
      };
    }
    planId = planRow.id;
  }

  const { data, error } = await supabase
    .from('plan_days')
    .select(
      `
      id,
      day,
      focus,
      duration_minutes,
      warmup,
      cardio_title,
      cardio_duration_minutes,
      cardio_instructions,
      plan_exercises (
        id,
        sort_order,
        sets,
        reps,
        exercises (
          id,
          name,
          equipment,
          type,
          muscle_primary,
          muscle_secondary,
          notes
        )
      )
    `,
    )
    .eq('plan_id', planId)
    .eq('day', dayName)
    .maybeSingle();

  if (error) {
    return { dayPlan: null, error: error.message };
  }
  if (!data) {
    return { dayPlan: null, error: null };
  }

  try {
    return { dayPlan: mapPlanDayToDayPlan(data as unknown as PlanDayRow), error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to map workout plan';
    return { dayPlan: null, error: msg };
  }
}
