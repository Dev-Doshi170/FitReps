/**
 * First-session target load/reps from body weight + experience. Keep outputs simple; round to gym plates.
 */
export type GymExperience = 'beginner' | 'intermediate' | 'advanced';

const EXP: Record<GymExperience, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

type Movement = 'legs' | 'push' | 'pull' | 'shoulders' | 'isolation';

function pickMovement(nameLower: string): Movement {
  if (/(squat|leg|lunge|dead|rdl|romanian|glute|calf|hamstring|quads?|sled|hip thrust)/.test(nameLower)) {
    return 'legs';
  }
  if (/(bench|chest|pectoral|triceps|dip|push.?down|skull|fly|crossover|pullover)/.test(nameLower)) {
    return 'push';
  }
  if (/(row|pull|lat|biceps|face pull|hammer|rear delt|pulldown|chin-?up)/.test(nameLower)) {
    return 'pull';
  }
  if (/(shoulder|ohp|overhead|lateral raise|arnold|military|rear delt)/.test(nameLower)) {
    return 'shoulders';
  }
  return 'isolation';
}

function isBodyweightEquipment(equipment: string): boolean {
  const e = equipment.toLowerCase();
  return (
    (e.includes('body') && e.includes('weight')) ||
    e.includes('bodyweight') ||
    e.includes('calisthen')
  );
}

/** One scale per column: [beginner, intermediate, advanced] as a fraction of body weight (total bar / stack). */
const SCALES: Record<Movement, [number, number, number]> = {
  legs: [0.5, 0.68, 0.86],
  push: [0.32, 0.48, 0.64],
  pull: [0.3, 0.44, 0.58],
  shoulders: [0.2, 0.28, 0.36],
  isolation: [0.12, 0.17, 0.24],
};

function roundForEquipment(kg: number, equipment: string): number {
  const e = equipment.toLowerCase();
  const n = Math.max(2.5, kg);
  if (e.includes('dumbbell') || e.includes('cable') || e.includes('kettle')) {
    return Math.round(n * 2) / 2;
  }
  if (e.includes('machine')) {
    return Math.round(n / 5) * 5;
  }
  if (e.includes('barbell') || e.includes('olymp')) {
    return Math.round(n / 2.5) * 2.5;
  }
  return Math.round(n * 2) / 2;
}

export function suggestInitialLoad(args: {
  bodyWeightKg: number;
  experience: GymExperience;
  exerciseName: string;
  equipment: string;
  repMin: number;
  repMax: number;
}): { weightKg: number | null; reps: number } {
  const { bodyWeightKg, experience, exerciseName, equipment, repMin, repMax } = args;
  const n = exerciseName.toLowerCase();

  if (isBodyweightEquipment(equipment)) {
    const add = experience === 'advanced' ? 2 : experience === 'intermediate' ? 1 : 0;
    return { weightKg: null, reps: Math.min(repMax, repMin + add) };
  }

  const move = pickMovement(n);
  const [a, b, c] = SCALES[move];
  const idx = EXP[experience];
  const base = [a, b, c][idx] * bodyWeightKg;
  const rounded = roundForEquipment(base, equipment);
  return { weightKg: rounded, reps: repMin };
}
