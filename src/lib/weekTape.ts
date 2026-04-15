import type { TapeDay, TapeDayStatus } from '../components/crt/TapeReel';
import { localDateKey } from '../store/slices/workoutSlice';
import type { WorkoutHistory } from '../store/slices/workoutSlice';

const LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

/** Monday-start week slots with workout completion for tape reel UI. */
export function buildTapeDays(history: WorkoutHistory[], now = new Date()): TapeDay[] {
  const todayKey = localDateKey(now);
  const trained = new Set(history.map(h => h.date));

  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(12, 0, 0, 0);

  return LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = localDateKey(d);
    let status: TapeDayStatus;
    if (key === todayKey) {
      status = trained.has(key) ? 'done' : 'today';
    } else if (key < todayKey) {
      status = trained.has(key) ? 'done' : 'empty';
    } else {
      status = 'future';
    }
    return { label, status };
  });
}
