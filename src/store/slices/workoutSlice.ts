import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ProgressionRecommendation, ProgressionState } from '../../lib/progressionTypes';
import { applyProgressionFromEdge, getProgressionState } from '../../lib/progressionService';
import { parsePlanRepsString } from '../../lib/repRange';
import {
  fetchLastPerformedDatesForPlanDays,
  fetchPlanDayById,
  fetchPlanName,
  fetchPlanSessionsOverview,
  resolveActivePlanId,
  type PlanSessionCard,
} from '../../services/workoutPlan';
import { supabase } from '../../services/supabase';
import type { AuthState } from './authSlice';

export type ExerciseType = 'Compound' | 'Isolation' | 'Isometric';

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  rep_range: string;
  type: ExerciseType;
  equipment: string;
};

export type DayPlan = {
  /** `plan_days.id` — used for logging and last-performed. */
  plan_day_id: string;
  /** Split label from DB, e.g. Push, Pull (shown as card / screen title). */
  session_type: string;
  /** Legacy calendar slot label from DB (Monday, …); not shown as primary title. */
  day_name: string;
  focus: string;
  duration_minutes: number;
  warmup: string;
  exercises: Exercise[];
  cardio_finisher: {
    title: string;
    duration_minutes: number;
    instructions: string;
  };
};

export type RPEValue = 'easy' | 'medium' | 'hard';

export type SetLog = {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  rpe?: RPEValue | null;
  /** Present after this set row is inserted into Supabase. */
  supabaseId?: string | null;
};

export type WorkoutHistory = {
  date: string;
  exercises: {
    exerciseName: string;
    sets: SetLog[];
  }[];
};

type WorkoutLogRow = {
  id: string;
  user_id: string;
  exercise_name: string;
  date: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  rpe: string | null;
  plan_day_id?: string | null;
};

export type BodyWeightEntry = {
  date: string;
  weight: number;
};

export type WorkoutState = {
  todayWorkout: DayPlan | null;
  /** Loading today's plan from Supabase (plans / plan_days / plan_exercises). */
  todayWorkoutLoading: boolean;
  todayWorkoutError: string | null;
  /** `plan_days.id` for the session currently being logged (also on `todayWorkout`). */
  activePlanDayId: string | null;
  /** Dashboard: all sessions in the active plan with exercise names for previews. */
  planSessionCards: PlanSessionCard[];
  /** ISO timestamps from `workout_logs.date`, keyed by `plan_day_id`. */
  lastPerformedByPlanDayId: Record<string, string>;
  planSessionsLoading: boolean;
  planSessionsError: string | null;
  /** When set, catalog queries use this plan; when null, the default plan name is used. */
  selectedPlanId: string | null;
  /** Resolved active plan display name (dashboard status strip). */
  activePlanName: string | null;
  /** Monotonic clock when current session plan day was loaded (elapsed timer / summary). */
  sessionStartedAt: number | null;
  selectedExercise: Exercise | null;
  logs: SetLog[];
  history: WorkoutHistory[];
  lastPerformance: Record<string, SetLog[]>;
  lastPerformanceLoading: Record<string, boolean>;
  /** Cached progression rows keyed by exercise name (strength work only). */
  progressionByExercise: Record<string, ProgressionState>;
  progressionLoading: Record<string, boolean>;
  /** After each exercise is fully logged, keyed by exercise name. */
  sessionRecommendations: Record<string, ProgressionRecommendation>;
  /** True if any exercise this session produced a deload / overreach flag. */
  sessionDeload: boolean;
  /** Today's logged body weight, if any (local calendar day). */
  todayBodyWeight: number | null;
  bodyWeightHistory: BodyWeightEntry[];
  bodyWeightLoading: boolean;
  bodyWeightError: string | null;
  loading: boolean;
  error: string | null;
};

type AppState = {
  auth: AuthState;
  workout: WorkoutState;
};

/** Exported for redux-persist migration when older persisted state omits new fields. */
export const workoutInitialState: WorkoutState = {
  todayWorkout: null,
  todayWorkoutLoading: false,
  todayWorkoutError: null,
  activePlanDayId: null,
  planSessionCards: [],
  lastPerformedByPlanDayId: {},
  planSessionsLoading: false,
  planSessionsError: null,
  selectedPlanId: null,
  activePlanName: null,
  sessionStartedAt: null,
  selectedExercise: null,
  logs: [],
  history: [],
  lastPerformance: {},
  lastPerformanceLoading: {},
  progressionByExercise: {},
  progressionLoading: {},
  sessionRecommendations: {},
  sessionDeload: false,
  todayBodyWeight: null,
  bodyWeightHistory: [],
  bodyWeightLoading: false,
  bodyWeightError: null,
  loading: false,
  error: null,
};

const initialState = workoutInitialState;

/** Local calendar date `YYYY-MM-DD` (for grouping and daily body weight). */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type BodyWeightRow = {
  logged_date: string;
  weight: number;
};

function groupLogsByDate(rows: WorkoutLogRow[]): WorkoutHistory[] {
  const dateMap = new Map<
    string,
    Map<string, { setNumber: number; reps: number | null; weight: number | null }[]>
  >();

  for (const row of rows) {
    const dk = localDateKey(new Date(row.date));
    if (!dateMap.has(dk)) {
      dateMap.set(dk, new Map());
    }
    const exMap = dateMap.get(dk)!;
    if (!exMap.has(row.exercise_name)) {
      exMap.set(row.exercise_name, []);
    }
    exMap.get(row.exercise_name)!.push({
      setNumber: row.set_number,
      reps: row.reps,
      weight: row.weight,
    });
  }

  const dates = Array.from(dateMap.keys()).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  return dates.map(date => {
    const exMap = dateMap.get(date)!;
    const exercises = Array.from(exMap.entries()).map(([exerciseName, setsRaw]) => {
      const sets = setsRaw
        .sort((x, y) => x.setNumber - y.setNumber)
        .map(s => ({
          exerciseId: '',
          exerciseName,
          setNumber: s.setNumber,
          reps: s.reps,
          weight: s.weight,
        }));
      return { exerciseName, sets };
    });
    return { date, exercises };
  });
}

function pickLastPerformanceLogs(
  rows: WorkoutLogRow[],
  exerciseName: string,
): SetLog[] {
  const todayDow = new Date().getDay();
  const byDate = new Map<string, WorkoutLogRow[]>();
  for (const row of rows) {
    if (row.exercise_name !== exerciseName) {
      continue;
    }
    const dk = localDateKey(new Date(row.date));
    const list = byDate.get(dk) ?? [];
    list.push(row);
    byDate.set(dk, list);
  }

  const dates = Array.from(byDate.keys()).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  const pickForDateKey = (dateKey: string): SetLog[] => {
    const list = byDate.get(dateKey) ?? [];
    return list
      .sort((a, b) => a.set_number - b.set_number)
      .map(r => ({
        exerciseId: '',
        exerciseName: r.exercise_name,
        setNumber: r.set_number,
        reps: r.reps,
        weight: r.weight,
      }));
  };

  for (const dk of dates) {
    const dow = new Date(`${dk}T12:00:00`).getDay();
    if (dow === todayDow) {
      return pickForDateKey(dk);
    }
  }

  if (dates.length > 0) {
    return pickForDateKey(dates[0]);
  }

  return [];
}

export const loadPlanDayById = createAsyncThunk(
  'workout/loadPlanDayById',
  async (planDayId: string, { rejectWithValue }) => {
    const { dayPlan, error } = await fetchPlanDayById(planDayId);
    if (error) {
      return rejectWithValue(error);
    }
    if (!dayPlan) {
      return rejectWithValue('Session not found.');
    }
    return dayPlan;
  },
);

export const fetchDashboardPlanSessions = createAsyncThunk(
  'workout/fetchDashboardPlanSessions',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as AppState;
    const userId = state.auth.session?.user.id;
    if (!userId) {
      return {
        cards: [] as PlanSessionCard[],
        lastPerformed: {} as Record<string, string>,
        planName: null as string | null,
      };
    }
    const selectedPlanId = state.workout.selectedPlanId;
    const { planId, error: resolveErr } = await resolveActivePlanId(selectedPlanId);
    if (resolveErr) {
      return rejectWithValue(resolveErr);
    }
    if (!planId) {
      return {
        cards: [] as PlanSessionCard[],
        lastPerformed: {} as Record<string, string>,
        planName: null as string | null,
      };
    }
    const { name: planName } = await fetchPlanName(planId);
    const { sessions, error: sessionsErr } = await fetchPlanSessionsOverview(planId);
    if (sessionsErr) {
      return rejectWithValue(sessionsErr);
    }
    const ids = sessions.map(s => s.planDayId);
    const { datesByPlanDayId, error: lastErr } = await fetchLastPerformedDatesForPlanDays(
      userId,
      ids,
    );
    if (lastErr) {
      return rejectWithValue(lastErr);
    }
    return { cards: sessions, lastPerformed: datesByPlanDayId, planName };
  },
);

export const selectExercise = createAsyncThunk(
  'workout/selectExercise',
  async (exercise: Exercise) => exercise,
);

export const updateSetLog = createAsyncThunk(
  'workout/updateSetLog',
  async (
    payload: {
      exerciseId: string;
      setNumber: number;
      reps: number | null;
      weight: number | null;
      rpe?: RPEValue | null;
      supabaseId?: string | null;
    },
    { getState },
  ) => {
    const state = getState() as AppState;
    const exercise =
      state.workout.todayWorkout?.exercises.find(e => e.id === payload.exerciseId) ??
      state.workout.selectedExercise;
    if (!exercise || exercise.id !== payload.exerciseId) {
      return { ...payload, exerciseName: '' as const };
    }
    return {
      ...payload,
      exerciseName: exercise.name,
    };
  },
);

export const completeSetLog = createAsyncThunk(
  'workout/completeSetLog',
  async (
    payload: {
      exerciseId: string;
      setNumber: number;
      reps: number;
      weight: number | null;
      rpe: RPEValue | null;
    },
    { getState, rejectWithValue },
  ) => {
    const state = getState() as AppState;
    const userId = state.auth.session?.user.id;
    if (!userId) {
      return rejectWithValue('Not authenticated');
    }
    const exercise =
      state.workout.todayWorkout?.exercises.find(e => e.id === payload.exerciseId) ??
      state.workout.selectedExercise;
    if (!exercise || exercise.id !== payload.exerciseId) {
      return rejectWithValue('Exercise not found');
    }

    const planDayId =
      state.workout.activePlanDayId ?? state.workout.todayWorkout?.plan_day_id ?? null;

    const { data, error } = await supabase
      .from('workout_logs')
      .insert({
        user_id: userId,
        exercise_name: exercise.name,
        set_number: payload.setNumber,
        reps: payload.reps,
        weight: payload.weight,
        rpe: payload.rpe,
        ...(planDayId ? { plan_day_id: planDayId } : {}),
      })
      .select('id')
      .single();

    if (error) {
      return rejectWithValue(error.message);
    }

    return {
      exerciseId: payload.exerciseId,
      exerciseName: exercise.name,
      setNumber: payload.setNumber,
      reps: payload.reps,
      weight: payload.weight,
      rpe: payload.rpe,
      supabaseId: data.id as string,
    };
  },
);

export const fetchProgressionForExercise = createAsyncThunk(
  'workout/fetchProgressionForExercise',
  async (
    payload: { exerciseName: string; rep_range: string },
    { getState, rejectWithValue },
  ) => {
    const state = getState() as AppState;
    const userId = state.auth.session?.user.id;
    if (!userId) {
      return rejectWithValue('Not authenticated');
    }
    const { min, max } = parsePlanRepsString(payload.rep_range);
    try {
      const progression = await getProgressionState(
        userId,
        payload.exerciseName,
        min,
        max,
      );
      return { exerciseName: payload.exerciseName, progression };
    } catch (e) {
      return rejectWithValue(e instanceof Error ? e.message : String(e));
    }
  },
);

export const recordExerciseProgression = createAsyncThunk(
  'workout/recordExerciseProgression',
  async (exercise: Exercise, { getState, rejectWithValue }) => {
    const state = getState() as AppState;
    if (!state.auth.session?.user.id) {
      return rejectWithValue('Not authenticated');
    }

    const logs = state.workout.logs.filter(
      l => l.exerciseId === exercise.id && l.supabaseId,
    );
    const setsPayload = [...logs]
      .sort((a, b) => a.setNumber - b.setNumber)
      .map(l => ({
        setNumber: l.setNumber,
        reps: l.reps ?? 0,
        weight: l.weight,
        rpe: (l.rpe ?? null) as string | null,
      }));

    try {
      const { recommendation, progression } = await applyProgressionFromEdge(
        exercise.name,
        exercise.equipment,
        exercise.rep_range,
        setsPayload,
      );
      return {
        exerciseName: exercise.name,
        recommendation,
        progression: { ...progression, exerciseName: exercise.name },
      };
    } catch (e) {
      return rejectWithValue(e instanceof Error ? e.message : String(e));
    }
  },
);

export const saveWorkout = createAsyncThunk(
  'workout/saveWorkout',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as AppState;
    const userId = state.auth.session?.user.id;
    if (!userId) {
      return rejectWithValue('Not authenticated');
    }
    const logs = state.workout.logs.filter(l => !l.supabaseId);
    if (logs.length === 0) {
      return true;
    }

    const planDayId =
      state.workout.activePlanDayId ?? state.workout.todayWorkout?.plan_day_id ?? null;

    const rows = logs.map(log => ({
      user_id: userId,
      exercise_name: log.exerciseName,
      set_number: log.setNumber,
      reps: log.reps,
      weight: log.weight,
      rpe: log.rpe ?? null,
      ...(planDayId ? { plan_day_id: planDayId } : {}),
    }));

    const { error } = await supabase.from('workout_logs').insert(rows);
    if (error) {
      return rejectWithValue(error.message);
    }
    return true;
  },
);

export const fetchHistory = createAsyncThunk(
  'workout/fetchHistory',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as AppState;
    const userId = state.auth.session?.user.id;
    if (!userId) {
      return rejectWithValue('Not authenticated');
    }

    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      return rejectWithValue(error.message);
    }

    return groupLogsByDate((data ?? []) as WorkoutLogRow[]);
  },
);

export const fetchTodayBodyWeight = createAsyncThunk(
  'workout/fetchTodayBodyWeight',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as AppState;
    const userId = state.auth.session?.user.id;
    if (!userId) {
      return rejectWithValue('Not authenticated');
    }
    const dk = localDateKey(new Date());
    const { data, error } = await supabase
      .from('body_weight_logs')
      .select('weight, logged_date')
      .eq('user_id', userId)
      .eq('logged_date', dk)
      .maybeSingle();

    if (error) {
      return rejectWithValue(error.message);
    }
    const row = data as BodyWeightRow | null;
    return row?.weight ?? null;
  },
);

export const fetchBodyWeightHistory = createAsyncThunk(
  'workout/fetchBodyWeightHistory',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as AppState;
    const userId = state.auth.session?.user.id;
    if (!userId) {
      return rejectWithValue('Not authenticated');
    }

    const { data, error } = await supabase
      .from('body_weight_logs')
      .select('weight, logged_date')
      .eq('user_id', userId)
      .order('logged_date', { ascending: false });

    if (error) {
      return rejectWithValue(error.message);
    }

    return ((data ?? []) as BodyWeightRow[]).map(r => ({
      date: r.logged_date,
      weight: r.weight,
    }));
  },
);

export const saveTodayBodyWeight = createAsyncThunk(
  'workout/saveTodayBodyWeight',
  async (weight: number, { getState, rejectWithValue }) => {
    const state = getState() as AppState;
    const userId = state.auth.session?.user.id;
    if (!userId) {
      return rejectWithValue('Not authenticated');
    }
    const dk = localDateKey(new Date());
    const { error } = await supabase.from('body_weight_logs').insert({
      user_id: userId,
      logged_date: dk,
      weight,
    });
    if (error) {
      return rejectWithValue(error.message);
    }
    return { date: dk, weight };
  },
);

export const fetchLastPerformance = createAsyncThunk(
  'workout/fetchLastPerformance',
  async (exerciseName: string, { getState, rejectWithValue }) => {
    const state = getState() as AppState;
    const userId = state.auth.session?.user.id;
    if (!userId) {
      return rejectWithValue('Not authenticated');
    }

    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('exercise_name', exerciseName)
      .order('date', { ascending: false })
      .limit(400);

    if (error) {
      return rejectWithValue(error.message);
    }

    return {
      exerciseName,
      logs: pickLastPerformanceLogs((data ?? []) as WorkoutLogRow[], exerciseName),
    };
  },
);

const workoutSlice = createSlice({
  name: 'workout',
  initialState,
  reducers: {
    setSelectedPlanId(state, action: PayloadAction<string | null>) {
      state.selectedPlanId = action.payload;
    },
    clearWorkoutError(state) {
      state.error = null;
    },
    clearSessionProgression(state) {
      state.sessionRecommendations = {};
      state.sessionDeload = false;
      state.sessionStartedAt = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loadPlanDayById.pending, state => {
        state.todayWorkoutLoading = true;
        state.todayWorkoutError = null;
        state.todayWorkout = null;
      })
      .addCase(loadPlanDayById.fulfilled, (state, action) => {
        state.todayWorkout = action.payload;
        state.activePlanDayId = action.payload.plan_day_id;
        state.sessionStartedAt = Date.now();
        state.todayWorkoutLoading = false;
        state.todayWorkoutError = null;
        state.error = null;
      })
      .addCase(loadPlanDayById.rejected, (state, action) => {
        state.todayWorkoutLoading = false;
        state.todayWorkout = null;
        state.activePlanDayId = null;
        state.sessionStartedAt = null;
        state.todayWorkoutError = (action.payload as string) ?? 'Could not load workout plan';
      })
      .addCase(fetchDashboardPlanSessions.pending, state => {
        state.planSessionsLoading = true;
        state.planSessionsError = null;
      })
      .addCase(fetchDashboardPlanSessions.fulfilled, (state, action) => {
        state.planSessionsLoading = false;
        state.planSessionCards = action.payload.cards;
        state.lastPerformedByPlanDayId = action.payload.lastPerformed;
        state.activePlanName = action.payload.planName ?? null;
        state.planSessionsError = null;
      })
      .addCase(fetchDashboardPlanSessions.rejected, (state, action) => {
        state.planSessionsLoading = false;
        state.planSessionCards = [];
        state.lastPerformedByPlanDayId = {};
        state.activePlanName = null;
        state.planSessionsError =
          (action.payload as string) ?? 'Could not load plan sessions';
      })
      .addCase(selectExercise.fulfilled, (state, action) => {
        state.selectedExercise = action.payload;
      })
      .addCase(updateSetLog.fulfilled, (state, action) => {
        const {
          exerciseId,
          setNumber,
          reps,
          weight,
          exerciseName,
          rpe,
          supabaseId,
        } = action.payload as {
          exerciseId: string;
          setNumber: number;
          reps: number | null;
          weight: number | null;
          exerciseName?: string;
          rpe?: RPEValue | null;
          supabaseId?: string | null;
        };
        const name =
          exerciseName ??
          state.todayWorkout?.exercises.find(e => e.id === exerciseId)?.name ??
          state.selectedExercise?.name ??
          '';
        if (!name) {
          return;
        }
        const idx = state.logs.findIndex(
          l => l.exerciseId === exerciseId && l.setNumber === setNumber,
        );
        const prev = idx >= 0 ? state.logs[idx] : undefined;
        const entry: SetLog = {
          exerciseId,
          exerciseName: name,
          setNumber,
          reps,
          weight,
          rpe: rpe !== undefined ? rpe : prev?.rpe,
          supabaseId: supabaseId !== undefined ? supabaseId : prev?.supabaseId,
        };
        if (idx >= 0) {
          state.logs[idx] = entry;
        } else {
          state.logs.push(entry);
        }
      })
      .addCase(completeSetLog.fulfilled, (state, action) => {
        const {
          exerciseId,
          exerciseName,
          setNumber,
          reps,
          weight,
          rpe,
          supabaseId,
        } = action.payload;
        const idx = state.logs.findIndex(
          l => l.exerciseId === exerciseId && l.setNumber === setNumber,
        );
        const entry: SetLog = {
          exerciseId,
          exerciseName,
          setNumber,
          reps,
          weight,
          rpe,
          supabaseId,
        };
        if (idx >= 0) {
          state.logs[idx] = entry;
        } else {
          state.logs.push(entry);
        }
      })
      .addCase(completeSetLog.rejected, (state, action) => {
        state.error = (action.payload as string) ?? state.error;
      })
      .addCase(fetchProgressionForExercise.pending, (state, action) => {
        const name = action.meta.arg.exerciseName;
        state.progressionLoading[name] = true;
      })
      .addCase(fetchProgressionForExercise.fulfilled, (state, action) => {
        const { exerciseName, progression } = action.payload;
        state.progressionByExercise[exerciseName] = progression;
        state.progressionLoading[exerciseName] = false;
      })
      .addCase(fetchProgressionForExercise.rejected, (state, action) => {
        const name = action.meta.arg.exerciseName;
        state.progressionLoading[name] = false;
        state.error = (action.payload as string) ?? state.error;
      })
      .addCase(recordExerciseProgression.fulfilled, (state, action) => {
        const { exerciseName, recommendation, progression } = action.payload;
        state.sessionRecommendations[exerciseName] = recommendation;
        state.progressionByExercise[exerciseName] = progression;
        if (recommendation.flag === 'deload') {
          state.sessionDeload = true;
        }
      })
      .addCase(recordExerciseProgression.rejected, (state, action) => {
        state.error = (action.payload as string) ?? state.error;
      })
      .addCase(saveWorkout.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveWorkout.fulfilled, state => {
        state.loading = false;
        state.logs = [];
        state.error = null;
      })
      .addCase(saveWorkout.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Save failed';
      })
      .addCase(fetchHistory.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload;
        state.error = null;
      })
      .addCase(fetchHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Failed to load history';
      })
      .addCase(fetchLastPerformance.pending, (state, action) => {
        const name = action.meta.arg;
        state.lastPerformanceLoading[name] = true;
      })
      .addCase(fetchLastPerformance.fulfilled, (state, action) => {
        const { exerciseName, logs } = action.payload;
        state.lastPerformance[exerciseName] = logs;
        state.lastPerformanceLoading[exerciseName] = false;
      })
      .addCase(fetchLastPerformance.rejected, (state, action) => {
        const name = action.meta.arg;
        state.lastPerformanceLoading[name] = false;
        state.error = (action.payload as string) ?? state.error;
      })
      .addCase(fetchTodayBodyWeight.fulfilled, (state, action) => {
        state.todayBodyWeight = action.payload;
        state.bodyWeightError = null;
      })
      .addCase(fetchTodayBodyWeight.rejected, (state, action) => {
        state.bodyWeightError = (action.payload as string) ?? 'Failed to load weight';
      })
      .addCase(fetchBodyWeightHistory.pending, state => {
        state.bodyWeightLoading = true;
        state.bodyWeightError = null;
      })
      .addCase(fetchBodyWeightHistory.fulfilled, (state, action) => {
        state.bodyWeightLoading = false;
        state.bodyWeightHistory = action.payload;
        state.bodyWeightError = null;
      })
      .addCase(fetchBodyWeightHistory.rejected, (state, action) => {
        state.bodyWeightLoading = false;
        state.bodyWeightError = (action.payload as string) ?? 'Failed to load weight history';
      })
      .addCase(saveTodayBodyWeight.pending, state => {
        state.bodyWeightLoading = true;
        state.bodyWeightError = null;
      })
      .addCase(saveTodayBodyWeight.fulfilled, (state, action) => {
        state.bodyWeightLoading = false;
        state.todayBodyWeight = action.payload.weight;
        const prev = state.bodyWeightHistory ?? [];
        state.bodyWeightHistory = [action.payload, ...prev.filter(e => e.date !== action.payload.date)].sort(
          (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0),
        );
        state.bodyWeightError = null;
      })
      .addCase(saveTodayBodyWeight.rejected, (state, action) => {
        state.bodyWeightLoading = false;
        state.bodyWeightError = (action.payload as string) ?? 'Could not save weight';
      });
  },
});

export const { setSelectedPlanId, clearWorkoutError, clearSessionProgression } =
  workoutSlice.actions;
export default workoutSlice.reducer;
