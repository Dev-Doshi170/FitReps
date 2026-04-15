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
  type: string;
  focus: string;
  duration_minutes: number;
  warmup: string;
  cardio_title: string;
  cardio_duration_minutes: number | null;
  cardio_instructions: string;
  plan_exercises: PlanExerciseRow[] | null;
};

/** Embedded select for a full `plan_days` row + exercises (used by weekday and by-id loaders). */
const PLAN_DAY_DETAIL_SELECT = `
  id,
  day,
  type,
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
`;

/** Card data for the dashboard: one row per training session in a plan. */
export type PlanSessionCard = {
  planDayId: string;
  sessionType: string;
  focus: string;
  exerciseNames: string[];
};

type PlanDayOverviewRow = {
  id: string;
  day: string;
  type: string;
  focus: string;
  plan_exercises: {
    sort_order: number;
    exercises: { name: string } | { name: string }[] | null;
  }[] | null;
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
    plan_day_id: row.id,
    session_type: row.type,
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
 * Resolves the plan UUID for API calls: explicit selection, or default seeded plan by name.
 */
/** Display name for dashboard status strip. */
export async function fetchPlanName(planId: string): Promise<{
  name: string | null;
  error: string | null;
}> {
  const { data, error } = await supabase.from('plans').select('name').eq('id', planId).maybeSingle();
  if (error) {
    return { name: null, error: error.message };
  }
  return { name: (data?.name as string | undefined) ?? null, error: null };
}

export async function resolveActivePlanId(
  selectedPlanId: string | null | undefined,
): Promise<{ planId: string | null; error: string | null }> {
  if (selectedPlanId) {
    return { planId: selectedPlanId, error: null };
  }
  const { data: planRow, error: planErr } = await supabase
    .from('plans')
    .select('id')
    .eq('name', DEFAULT_PLAN_NAME)
    .maybeSingle();

  if (planErr) {
    return { planId: null, error: planErr.message };
  }
  if (!planRow?.id) {
    return {
      planId: null,
      error: `Workout plan "${DEFAULT_PLAN_NAME}" was not found. Run the SQL seed in Supabase.`,
    };
  }
  return { planId: planRow.id as string, error: null };
}

/**
 * Lightweight list of sessions in a plan (for dashboard cards), in weekday-slot order.
 */
export async function fetchPlanSessionsOverview(planId: string): Promise<{
  sessions: PlanSessionCard[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('plan_days')
    .select(
      `
      id,
      day,
      type,
      focus,
      plan_exercises (
        sort_order,
        exercises (
          name
        )
      )
    `,
    )
    .eq('plan_id', planId);

  if (error) {
    return { sessions: [], error: error.message };
  }

  const sorted = [...(data ?? [])].sort((a, b) => {
    const ar = a as PlanDayOverviewRow;
    const br = b as PlanDayOverviewRow;
    const ai = WEEKDAY_ORDER.indexOf(ar.day as (typeof WEEKDAY_ORDER)[number]);
    const bi = WEEKDAY_ORDER.indexOf(br.day as (typeof WEEKDAY_ORDER)[number]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const sessions: PlanSessionCard[] = sorted.map(r => {
    const row = r as PlanDayOverviewRow;
    const list = [...(row.plan_exercises ?? [])].sort((x, y) => x.sort_order - y.sort_order);
    const exerciseNames = list.map(pe => unwrapExerciseName(pe.exercises) ?? 'Exercise');
    return {
      planDayId: row.id,
      sessionType: row.type,
      focus: row.focus,
      exerciseNames,
    };
  });

  return { sessions, error: null };
}

/** Latest log timestamp per `plan_day_id` (ISO string from Supabase). */
export async function fetchLastPerformedDatesForPlanDays(
  userId: string,
  planDayIds: string[],
): Promise<{ datesByPlanDayId: Record<string, string>; error: string | null }> {
  if (planDayIds.length === 0) {
    return { datesByPlanDayId: {}, error: null };
  }

  const { data, error } = await supabase
    .from('workout_logs')
    .select('plan_day_id, date')
    .eq('user_id', userId)
    .in('plan_day_id', planDayIds)
    .order('date', { ascending: false })
    .limit(4000);

  if (error) {
    return { datesByPlanDayId: {}, error: error.message };
  }

  const datesByPlanDayId: Record<string, string> = {};
  for (const raw of data ?? []) {
    const row = raw as { plan_day_id: string | null; date: string };
    if (!row.plan_day_id || datesByPlanDayId[row.plan_day_id]) {
      continue;
    }
    datesByPlanDayId[row.plan_day_id] = row.date;
  }
  return { datesByPlanDayId, error: null };
}

export async function fetchPlanDayById(planDayId: string): Promise<{
  dayPlan: DayPlan | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('plan_days')
    .select(PLAN_DAY_DETAIL_SELECT)
    .eq('id', planDayId)
    .maybeSingle();

  if (error) {
    return { dayPlan: null, error: error.message };
  }
  if (!data) {
    return { dayPlan: null, error: 'Session not found.' };
  }

  try {
    return { dayPlan: mapPlanDayToDayPlan(data as unknown as PlanDayRow), error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to map workout plan';
    return { dayPlan: null, error: msg };
  }
}

