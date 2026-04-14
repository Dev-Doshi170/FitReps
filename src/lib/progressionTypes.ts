/**
 * Types for progressive overload UI and API responses.
 * Implementation lives in `supabase/functions/_shared/progressionEngine.ts` (Edge Function).
 */

export type RPEInput = 'easy' | 'medium' | 'hard';

export type EquipmentType = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight';

export interface EngineSetLog {
  setNumber: number;
  reps: number;
  weight: number | null;
  rpe: RPEInput | null;
}

export interface ProgressionState {
  exerciseName: string;
  currentWeight: number | null;
  currentRepsTarget: number;
  repRangeMin: number;
  repRangeMax: number;
  consecutiveHardSets: number;
  consecutiveEasySessions: number;
  lastSessionRpe: RPEInput | null;
}

export type ProgressionFlag =
  | 'increase_weight'
  | 'increase_reps'
  | 'maintain'
  | 'deload'
  | null;

export interface ProgressionRecommendation {
  nextWeight: number | null;
  nextRepsTarget: number;
  recommendation: string;
  flag: ProgressionFlag;
  alertMessage: string | null;
}
