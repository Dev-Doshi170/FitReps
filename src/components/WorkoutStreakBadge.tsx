import { Badge, BadgeText, HStack, Text } from '@gluestack-ui/themed';
import { useMemo } from 'react';

import { useAppSelector } from '../store';
import type { WorkoutHistory } from '../store/slices/workoutSlice';

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function computeStreak(history: WorkoutHistory[]): number {
  const days = new Set(history.map(h => h.date));
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = localDateKey(cursor);
    if (!days.has(key)) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function WorkoutStreakBadge() {
  const history = useAppSelector(s => s.workout.history);
  const streak = useMemo(() => computeStreak(history), [history]);

  return (
    <Badge size="md" variant="solid" action="warning" borderRadius="$full" px="$3" py="$1">
      <HStack alignItems="center" space="xs">
        <Text fontSize="$sm">🔥</Text>
        <BadgeText fontWeight="$bold">
          {streak} day{streak === 1 ? '' : 's'}
        </BadgeText>
      </HStack>
    </Badge>
  );
}
