import { HStack, Pressable, Text, VStack } from '@gluestack-ui/themed';
import { useMemo } from 'react';

import type { RPEValue } from '../store/slices/workoutSlice';
import { AppTextField } from './ui';
import ProgressBadge from './ProgressBadge';

type Props = {
  exerciseId: string;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  lastReps: number | null;
  lastWeight: number | null;
  rpe: RPEValue | null | undefined;
  completed: boolean;
  onRepsChange: (value: number | null) => void;
  onWeightChange: (value: number | null) => void;
  onComplete: (rpe: RPEValue | null) => void;
};

function parseNumber(raw: string): number | null {
  if (raw.trim() === '') {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export default function SetLogRow({
  exerciseId: _exerciseId,
  setNumber,
  reps,
  weight,
  lastReps,
  lastWeight,
  rpe,
  completed,
  onRepsChange,
  onWeightChange,
  onComplete,
}: Props) {
  const readyForRpe = useMemo(() => {
    return reps != null && weight != null;
  }, [reps, weight]);

  return (
    <VStack
      py="$2"
      borderBottomWidth={1}
      borderColor="$borderDark700"
      space="sm">
      <HStack alignItems="center" space="xs">
        <Text w="$10" color="$textLight200" size="sm">
          {setNumber}
        </Text>
        <HStack w="$32" alignItems="center" space="xs">
          <AppTextField
            inputProps={{ size: 'sm', w: '$20', isDisabled: completed }}
            keyboardType="numeric"
            value={weight === null ? '' : String(weight)}
            onChangeText={t => onWeightChange(parseNumber(t))}
            placeholder="0"
            textAlign="center"
          />
          <ProgressBadge current={weight} last={lastWeight} />
        </HStack>
        <HStack w="$24" alignItems="center" space="xs">
          <AppTextField
            inputProps={{ size: 'sm', w: '$20', isDisabled: completed }}
            keyboardType="numeric"
            value={reps === null ? '' : String(reps)}
            onChangeText={t => onRepsChange(parseNumber(t))}
            placeholder="0"
            textAlign="center"
          />
          <ProgressBadge current={reps} last={lastReps} />
        </HStack>
        <Text flex={1} color="$textLight500" size="xs" textAlign="center">
          {lastReps ?? '—'}
        </Text>
        <Text flex={1} color="$textLight500" size="xs" textAlign="center">
          {lastWeight ?? '—'}
        </Text>
      </HStack>

      {readyForRpe && !completed && (
        <VStack space="xs" pl="$10">
          <Text color="$textLight500" size="xs">
            Effort
          </Text>
          <HStack flexWrap="wrap" space="sm" alignItems="center">
            {(
              [
                { key: 'easy' as const, label: 'EASY' },
                { key: 'medium' as const, label: 'MED' },
                { key: 'hard' as const, label: 'HARD' },
              ] as const
            ).map(opt => (
              <Pressable
                key={opt.key}
                onPress={() => onComplete(opt.key)}
                accessibilityRole="button"
                accessibilityLabel={`${opt.label} effort`}>
                <HStack
                  bg="$backgroundDark700"
                  px="$3"
                  py="$1.5"
                  borderRadius="$full"
                  borderWidth={1}
                  borderColor="$borderDark600"
                  space="xs"
                  alignItems="center">
                  <Text color="$textLight200" size="xs">
                    {opt.label}
                  </Text>
                </HStack>
              </Pressable>
            ))}
            <Pressable onPress={() => onComplete(null)} accessibilityRole="button">
              <Text color="$textLight500" size="xs" textDecorationLine="underline">
                Skip
              </Text>
            </Pressable>
          </HStack>
        </VStack>
      )}

      {completed && (
        <Text pl="$10" color="$textLight400" size="xs">
          {rpe != null ? `Logged — ${rpe}` : 'Logged (no RPE)'}
        </Text>
      )}
    </VStack>
  );
}
