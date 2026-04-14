import { Box, ButtonText, HStack, Text, VStack } from '@gluestack-ui/themed';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PostExerciseSummaryCard from '../components/PostExerciseSummaryCard';
import SetLogRow from '../components/SetLogRow';
import { AppButton } from '../components/ui';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { useLastPerformance } from '../hooks/useLastPerformance';
import { useAppDispatch, useAppSelector } from '../store';
import {
  completeSetLog,
  fetchProgressionForExercise,
  recordExerciseProgression,
  saveWorkout,
  selectExercise,
  updateSetLog,
} from '../store/slices/workoutSlice';

type Props = NativeStackScreenProps<AppStackParamList, 'ExerciseLogging'>;

export default function ExerciseLoggingScreen({ navigation, route }: Props) {
  const { exercise } = route.params;
  const dispatch = useAppDispatch();
  const logs = useAppSelector(s => s.workout.logs);
  const saving = useAppSelector(s => s.workout.loading);
  const sessionDeload = useAppSelector(s => s.workout.sessionDeload);
  const recommendation = useAppSelector(
    s => s.workout.sessionRecommendations?.[exercise.name],
  );
  const progression = useAppSelector(
    s => s.workout.progressionByExercise?.[exercise.name],
  );
  const progressionLoading = useAppSelector(
    s => s.workout.progressionLoading?.[exercise.name] ?? false,
  );

  const { data: lastData, loading: lastLoading } = useLastPerformance(exercise.name);

  const finalizedRef = useRef(false);

  useEffect(() => {
    dispatch(selectExercise(exercise));
  }, [dispatch, exercise]);

  useEffect(() => {
    dispatch(
      fetchProgressionForExercise({
        exerciseName: exercise.name,
        rep_range: exercise.rep_range,
      }),
    );
  }, [dispatch, exercise.name, exercise.rep_range]);

  const exerciseLogs = useMemo(
    () => logs.filter(l => l.exerciseId === exercise.id),
    [exercise.id, logs],
  );

  const getLog = useCallback(
    (setNumber: number) => exerciseLogs.find(l => l.setNumber === setNumber),
    [exerciseLogs],
  );

  const lastForSet = useCallback(
    (setNumber: number) => {
      const row = lastData.find(l => l.setNumber === setNumber);
      return {
        reps: row?.reps ?? null,
        weight: row?.weight ?? null,
      };
    },
    [lastData],
  );

  const didPrefill = useRef(false);
  useEffect(() => {
    if (lastLoading || progressionLoading || !progression) {
      return;
    }
    if (didPrefill.current) {
      return;
    }
    didPrefill.current = true;
    for (let setNumber = 1; setNumber <= exercise.sets; setNumber += 1) {
      const existing = exerciseLogs.find(l => l.setNumber === setNumber);
      if (existing?.reps != null || existing?.weight != null) {
        continue;
      }
      const last = lastForSet(setNumber);
      dispatch(
        updateSetLog({
          exerciseId: exercise.id,
          setNumber,
          reps: progression.currentRepsTarget,
          weight: last.weight ?? progression.currentWeight,
        }),
      );
    }
  }, [
    dispatch,
    exercise.id,
    exercise.sets,
    exerciseLogs,
    lastForSet,
    lastLoading,
    progression,
    progressionLoading,
  ]);

  const allSetsSynced = useMemo(() => {
    for (let i = 1; i <= exercise.sets; i += 1) {
      const row = getLog(i);
      if (!row?.supabaseId) {
        return false;
      }
    }
    return true;
  }, [exercise.sets, getLog]);

  useEffect(() => {
    if (!allSetsSynced) {
      finalizedRef.current = false;
      return;
    }
    if (finalizedRef.current) {
      return;
    }
    finalizedRef.current = true;
    void dispatch(recordExerciseProgression(exercise));
  }, [allSetsSynced, dispatch, exercise]);

  const onSave = useCallback(async () => {
    const resultAction = await dispatch(saveWorkout());
    if (saveWorkout.fulfilled.match(resultAction)) {
      Alert.alert('Saved', 'Workout logged successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Save failed', String(resultAction.payload ?? 'Unknown error'));
    }
  }, [dispatch, navigation]);

  const onCompleteSet = useCallback(
    (setNumber: number, rpe: 'easy' | 'medium' | 'hard' | null) => {
      const current = getLog(setNumber);
      const reps = current?.reps;
      if (reps == null) {
        return;
      }
      void dispatch(
        completeSetLog({
          exerciseId: exercise.id,
          setNumber,
          reps,
          weight: current?.weight ?? null,
          rpe,
        }),
      );
    },
    [dispatch, exercise.id, getLog],
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <VStack flex={1} bg="$backgroundDark950">
        {sessionDeload && (
          <Box px="$4" py="$2" bg="$amber900" borderBottomWidth={1} borderColor="$amber700">
            <Text color="$amber100" size="sm">
              Heads up — some exercises felt very hard today. Check recommendations below.
            </Text>
          </Box>
        )}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 16 }}>
          <VStack space="md">
            <Text color="$textLight400" size="sm">
              {lastLoading || progressionLoading
                ? 'Loading plan & last performance…'
                : ' '}
            </Text>
            <Box
              bg="$backgroundDark800"
              borderRadius="$lg"
              p="$4"
              borderWidth={1}
              borderColor="$borderDark700">
              <HStack
                borderBottomWidth={1}
                borderColor="$borderDark700"
                pb="$2"
                mb="$1"
                alignItems="center">
                <Text w="$10" fontWeight="$bold" color="$textLight200" size="xs">
                  Set
                </Text>
                <Text w="$32" fontWeight="$bold" color="$textLight200" size="xs">
                  Weight
                </Text>
                <Text w="$24" fontWeight="$bold" color="$textLight200" size="xs">
                  Reps
                </Text>
                <Text flex={1} fontWeight="$bold" color="$textLight200" size="xs" textAlign="center">
                  Last Wt
                </Text>
                <Text flex={1} fontWeight="$bold" color="$textLight200" size="xs" textAlign="center">
                  Last Reps
                </Text>
              </HStack>
              {Array.from({ length: exercise.sets }, (_, i) => {
                const setNumber = i + 1;
                const current = getLog(setNumber);
                const last = lastForSet(setNumber);
                return (
                  <SetLogRow
                    key={setNumber}
                    exerciseId={exercise.id}
                    setNumber={setNumber}
                    reps={current?.reps ?? null}
                    weight={current?.weight ?? null}
                    lastReps={last.reps}
                    lastWeight={last.weight}
                    rpe={current?.rpe}
                    completed={Boolean(current?.supabaseId)}
                    onRepsChange={reps =>
                      dispatch(
                        updateSetLog({
                          exerciseId: exercise.id,
                          setNumber,
                          reps,
                          weight: current?.weight ?? null,
                        }),
                      )
                    }
                    onWeightChange={weight =>
                      dispatch(
                        updateSetLog({
                          exerciseId: exercise.id,
                          setNumber,
                          reps: current?.reps ?? null,
                          weight,
                        }),
                      )
                    }
                    onComplete={rpe => onCompleteSet(setNumber, rpe)}
                  />
                );
              })}
            </Box>
            {recommendation != null && <PostExerciseSummaryCard recommendation={recommendation} />}
          </VStack>
        </ScrollView>
        <Box px="$4" pb="$4" pt="$2" borderTopWidth={1} borderColor="$borderDark800">
          <AppButton size="lg" onPress={onSave} isLoading={saving}>
            <ButtonText>{saving ? 'Saving…' : 'Save Workout'}</ButtonText>
          </AppButton>
        </Box>
      </VStack>
    </SafeAreaView>
  );
}
