import {
  analyzeProgressionSession,
  computeNextSessionRecommendation,
  mapEquipmentStringToType,
  type ProgressionState,
} from '../supabase/functions/_shared/progressionEngine';

const baseState: ProgressionState = {
  exerciseName: 'Bench',
  currentWeight: 60,
  currentRepsTarget: 8,
  repRangeMin: 8,
  repRangeMax: 12,
  consecutiveHardSets: 0,
  consecutiveEasySessions: 0,
  lastSessionRpe: null,
};

describe('computeNextSessionRecommendation', () => {
  it('flags deload when 3+ hard sets', () => {
    const sets = [1, 2, 3].map(n => ({
      setNumber: n,
      reps: 8,
      weight: 60,
      rpe: 'hard' as const,
    }));
    const rec = computeNextSessionRecommendation(baseState, sets, 'barbell');
    expect(rec.flag).toBe('deload');
    expect(rec.alertMessage).toMatch(/3\+ sets as Hard/i);
  });

  it('increases weight at top of range with medium effort', () => {
    const sets = [
      { setNumber: 1, reps: 12, weight: 60, rpe: 'medium' as const },
    ];
    const rec = computeNextSessionRecommendation(baseState, sets, 'barbell');
    expect(rec.flag).toBe('increase_weight');
    expect(rec.nextWeight).toBe(62.5);
    expect(rec.nextRepsTarget).toBe(8);
  });

  it('maintains at top of range when effort is hard', () => {
    const sets = [
      { setNumber: 1, reps: 12, weight: 60, rpe: 'hard' as const },
    ];
    const rec = computeNextSessionRecommendation(baseState, sets, 'barbell');
    expect(rec.flag).toBe('maintain');
    expect(rec.nextWeight).toBe(60);
    expect(rec.alertMessage).not.toBeNull();
  });

  it('increases reps when below range top', () => {
    const sets = [
      { setNumber: 1, reps: 10, weight: 60, rpe: 'medium' as const },
    ];
    const rec = computeNextSessionRecommendation(baseState, sets, 'dumbbell');
    expect(rec.flag).toBe('increase_reps');
    expect(rec.nextWeight).toBe(60);
    expect(rec.nextRepsTarget).toBe(9);
  });
});

describe('analyzeProgressionSession', () => {
  it('updates consecutive easy sessions at top with easy RPE', () => {
    const sets = [
      { setNumber: 1, reps: 12, weight: 60, rpe: 'easy' as const },
    ];
    const { nextState } = analyzeProgressionSession(baseState, sets, 'barbell');
    expect(nextState.consecutiveEasySessions).toBe(1);
  });
});

describe('mapEquipmentStringToType', () => {
  it('maps common catalog strings', () => {
    expect(mapEquipmentStringToType('Barbell')).toBe('barbell');
    expect(mapEquipmentStringToType('Dumbbell')).toBe('dumbbell');
    expect(mapEquipmentStringToType('Machine')).toBe('machine');
    expect(mapEquipmentStringToType('Body weight')).toBe('bodyweight');
  });
});
