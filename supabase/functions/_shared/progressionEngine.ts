export type RPEInput = 'easy' | 'medium' | 'hard';

export type EquipmentType = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight';

export interface SetLog {
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

const KG_ROUND = (n: number) => Math.round(n * 100) / 100;

export function weightIncrementKg(
  current: number | null,
  equipmentType: EquipmentType,
  machineIncrementKg = 5,
): number | null {
  if (equipmentType === 'bodyweight') {
    return null;
  }
  const base = current ?? 0;
  switch (equipmentType) {
    case 'barbell':
      return KG_ROUND(base + 2.5);
    case 'dumbbell':
      return KG_ROUND(base + 2);
    case 'machine':
      return KG_ROUND(base + machineIncrementKg);
    default:
      return KG_ROUND(base + machineIncrementKg);
  }
}

function countHardSets(sets: SetLog[]): number {
  return sets.filter(s => s.rpe === 'hard').length;
}

function sessionRpeFromSets(sets: SetLog[]): RPEInput {
  const rated = sets.filter((s): s is SetLog & { rpe: RPEInput } => s.rpe != null);
  if (rated.length === 0) {
    return 'medium';
  }
  let easy = 0;
  let medium = 0;
  let hard = 0;
  for (const s of rated) {
    if (s.rpe === 'easy') {
      easy += 1;
    } else if (s.rpe === 'medium') {
      medium += 1;
    } else {
      hard += 1;
    }
  }
  const max = Math.max(easy, medium, hard);
  if (easy === max) {
    return 'easy';
  }
  if (hard === max) {
    return 'hard';
  }
  return 'medium';
}

function lastCompletedReps(sets: SetLog[]): number | null {
  const withReps = sets.filter(s => s.reps != null && Number.isFinite(s.reps) && s.reps > 0);
  if (withReps.length === 0) {
    return null;
  }
  const last = withReps.reduce((a, b) => (a.setNumber >= b.setNumber ? a : b));
  return last.reps;
}

function repStep(equipmentType: EquipmentType): number {
  return equipmentType === 'bodyweight' ? 2 : 1;
}

function buildNextStateBase(
  state: ProgressionState,
  sessionRpe: RPEInput,
  hardCount: number,
  lastReps: number,
  recommendation: ProgressionRecommendation,
): ProgressionState {
  const { repRangeMax } = state;
  let consecutiveEasySessions = state.consecutiveEasySessions;
  if (lastReps >= repRangeMax && sessionRpe === 'easy') {
    consecutiveEasySessions += 1;
  } else {
    consecutiveEasySessions = 0;
  }

  let consecutiveHardSets: number;
  if (hardCount === 0) {
    consecutiveHardSets = 0;
  } else if (hardCount >= 3) {
    consecutiveHardSets = state.consecutiveHardSets + hardCount;
  } else {
    consecutiveHardSets = hardCount;
  }

  return {
    ...state,
    currentWeight: recommendation.nextWeight,
    currentRepsTarget: recommendation.nextRepsTarget,
    consecutiveHardSets,
    consecutiveEasySessions,
    lastSessionRpe: sessionRpe,
  };
}

export function analyzeProgressionSession(
  state: ProgressionState,
  todaySets: SetLog[],
  equipmentType: EquipmentType,
  options?: { machineIncrementKg?: number },
): { recommendation: ProgressionRecommendation; nextState: ProgressionState } {
  const machineInc = options?.machineIncrementKg ?? 5;
  const { repRangeMin, repRangeMax } = state;

  if (todaySets.length === 0) {
    const recommendation: ProgressionRecommendation = {
      nextWeight: state.currentWeight,
      nextRepsTarget: state.currentRepsTarget,
      recommendation: 'Log at least one set to get a tailored progression.',
      flag: 'maintain',
      alertMessage: null,
    };
    return {
      recommendation,
      nextState: {
        ...state,
        lastSessionRpe: state.lastSessionRpe,
      },
    };
  }

  const hardCount = countHardSets(todaySets);
  const sessionRpe = sessionRpeFromSets(todaySets);
  const lastReps = lastCompletedReps(todaySets);

  if (hardCount >= 3) {
    const deloadWeight =
      equipmentType === 'bodyweight'
        ? null
        : state.currentWeight != null
          ? KG_ROUND(state.currentWeight * 0.9)
          : null;
    const deloadReps =
      equipmentType === 'bodyweight'
        ? Math.max(repRangeMin, state.currentRepsTarget - 2)
        : state.currentRepsTarget;

    const recommendation: ProgressionRecommendation = {
      nextWeight: deloadWeight,
      nextRepsTarget: deloadReps,
      recommendation:
        equipmentType === 'bodyweight'
          ? `You rated ${hardCount} sets as Hard. Drop ~2 reps next session and own the range with clean form before pushing again.`
          : `You rated ${hardCount} sets as Hard. Next session, use about 10% less weight (${deloadWeight ?? '—'} kg) and nail smooth reps.`,
      flag: 'deload',
      alertMessage:
        "You rated 3+ sets as Hard. Consider reducing weight by 10% next session and focusing on form. This is normal — it means you're near your current limit.",
    };

    const nextState: ProgressionState = {
      ...state,
      currentWeight: deloadWeight,
      currentRepsTarget: deloadReps,
      consecutiveHardSets: state.consecutiveHardSets + hardCount,
      consecutiveEasySessions: 0,
      lastSessionRpe: sessionRpe,
    };

    return { recommendation, nextState };
  }

  if (lastReps == null) {
    const recommendation: ProgressionRecommendation = {
      nextWeight: state.currentWeight,
      nextRepsTarget: state.currentRepsTarget,
      recommendation: 'Enter reps for your sets to calculate progression.',
      flag: 'maintain',
      alertMessage: null,
    };
    return {
      recommendation,
      nextState: buildNextStateBase(state, sessionRpe, hardCount, 0, recommendation),
    };
  }

  let recommendation: ProgressionRecommendation;

  if (lastReps >= repRangeMax && (sessionRpe === 'medium' || sessionRpe === 'easy')) {
    const nw = weightIncrementKg(state.currentWeight, equipmentType, machineInc);
    const nextRepsTarget = repRangeMin;
    recommendation = {
      nextWeight: nw,
      nextRepsTarget,
      recommendation:
        equipmentType === 'bodyweight'
          ? `Great work hitting the top of your rep range! Next session aim for ${nextRepsTarget} reps — progress by adding 2 reps per step in-range before leveling up.`
          : `Great work hitting the top of your rep range! Increase weight to ${nw} kg next session and aim for ${repRangeMin} reps.`,
      flag: 'increase_weight',
      alertMessage:
        sessionRpe === 'easy'
          ? 'This felt easy — the weight increase is well-deserved!'
          : null,
    };
  } else if (lastReps < repRangeMax) {
    const step = repStep(equipmentType);
    const nextRepsTarget = Math.min(state.currentRepsTarget + step, repRangeMax);
    recommendation = {
      nextWeight: state.currentWeight,
      nextRepsTarget,
      recommendation: `Aim for ${nextRepsTarget} reps next session with the same weight. You're building toward ${repRangeMax}.`,
      flag: 'increase_reps',
      alertMessage: null,
    };
  } else {
    recommendation = {
      nextWeight: state.currentWeight,
      nextRepsTarget: repRangeMax,
      recommendation:
        'Keep the same weight and reps — this felt hard, and consolidating at this weight is the right move before increasing.',
      flag: 'maintain',
      alertMessage:
        "The top of your rep range felt very hard. Stay here until it feels medium — that's how you know you've truly adapted.",
    };
  }

  const nextState = buildNextStateBase(state, sessionRpe, hardCount, lastReps, recommendation);
  return { recommendation, nextState };
}

export function computeNextSessionRecommendation(
  state: ProgressionState,
  todaySets: SetLog[],
  equipmentType: EquipmentType,
  options?: { machineIncrementKg?: number },
): ProgressionRecommendation {
  return analyzeProgressionSession(state, todaySets, equipmentType, options).recommendation;
}

export function computeNextProgressionState(
  state: ProgressionState,
  todaySets: SetLog[],
  equipmentType: EquipmentType,
  options?: { machineIncrementKg?: number },
): ProgressionState {
  return analyzeProgressionSession(state, todaySets, equipmentType, options).nextState;
}

export function mapEquipmentStringToType(equipment: string): EquipmentType {
  const e = equipment.toLowerCase();
  if (e.includes('body') && e.includes('weight')) {
    return 'bodyweight';
  }
  if (e.includes('bodyweight') || e.includes('calisthen')) {
    return 'bodyweight';
  }
  if (e.includes('dumbbell')) {
    return 'dumbbell';
  }
  if (e.includes('barbell')) {
    return 'barbell';
  }
  if (e.includes('machine') || e.includes('cable') || e.includes('smith')) {
    return 'machine';
  }
  return 'machine';
}
