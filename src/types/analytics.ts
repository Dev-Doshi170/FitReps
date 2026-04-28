export type ExerciseProgressPoint = {
  date: string;
  best_weight: number;
  estimated_1rm: number;
};

export type MuscleGroupVolumePoint = {
  date: string;
  total_volume: number;
  session_count: number;
};

/** One completed workout for a given plan session type (Push / Pull / …). */
export type FocusSessionVolumePoint = {
  performed_at: string;
  total_volume: number;
  label: string;
};

export type WeeklyStats = {
  week_start: string;
  total_sessions: number;
  total_volume: number;
  avg_rpe: number;
};

export type PersonalRecord = {
  exercise_name: string;
  max_weight: number;
  date: string;
};

export type BodyWeightPoint = {
  logged_date: string;
  weight: number;
};
