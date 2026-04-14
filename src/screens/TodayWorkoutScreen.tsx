import { Box, Divider, HStack, Text, VStack } from '@gluestack-ui/themed';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useLayoutEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ExerciseCard from '../components/ExerciseCard';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchProgressionForExercise, setTodayWorkout } from '../store/slices/workoutSlice';
import type { Exercise } from '../store/slices/workoutSlice';

type Props = NativeStackScreenProps<AppStackParamList, 'TodayWorkout'>;

export default function TodayWorkoutScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const plan = useAppSelector(s => s.workout.todayWorkout);
  const planLoading = useAppSelector(s => s.workout.todayWorkoutLoading);
  const planError = useAppSelector(s => s.workout.todayWorkoutError);
  const selectedPlanId = useAppSelector(s => s.workout.selectedPlanId);
  const dow = new Date().getDay();

  useEffect(() => {
    dispatch(setTodayWorkout(dow));
  }, [dispatch, dow, selectedPlanId]);

  useEffect(() => {
    if (!plan?.exercises?.length) {
      return;
    }
    for (const ex of plan.exercises) {
      dispatch(
        fetchProgressionForExercise({
          exerciseName: ex.name,
          rep_range: ex.rep_range,
        }),
      );
    }
  }, [dispatch, plan?.day_name, plan?.exercises]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: plan?.day_name ?? "Today's workout",
    });
  }, [navigation, plan?.day_name]);

  const openExercise = (exercise: Exercise) => {
    navigation.navigate('ExerciseLogging', { exercise });
  };

  if (planLoading) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <Box flex={1} justifyContent="center" alignItems="center" p="$6">
          <ActivityIndicator />
          <Text color="$textLight400" size="sm" mt="$3">
            Loading today&apos;s plan…
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  if (planError) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text color="$red400">{planError}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text color="$textLight300">No workout scheduled for today.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <VStack space="lg">
          <VStack space="xs">
            <Text color="$textLight400">{plan.focus}</Text>
            <Text color="$textLight500" size="sm">
              ~{plan.duration_minutes} minutes
            </Text>
          </VStack>

          <Box
            bg="$backgroundDark800"
            borderRadius="$lg"
            p="$4"
            borderWidth={1}
            borderColor="$borderDark700">
            <Text fontWeight="$bold" color="$textLight100" mb="$2">
              Warmup
            </Text>
            <Text color="$textLight400" size="sm">
              {plan.warmup}
            </Text>
          </Box>

          <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap">
            <Text fontWeight="$bold" color="$textLight200" size="md">
              Lifts
            </Text>
            <Pressable onPress={() => navigation.navigate('WorkoutSessionSummary')}>
              <Text color="$blue400" size="sm">
                Session summary
              </Text>
            </Pressable>
          </HStack>
          <VStack space="md">
            {plan.exercises.map(exercise => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onPress={() => openExercise(exercise)}
              />
            ))}
          </VStack>

          <Divider my="$2" bg="$borderDark700" />

          <Box
            bg="$backgroundDark800"
            borderRadius="$lg"
            p="$4"
            borderWidth={1}
            borderColor="$borderDark700">
            <Text fontWeight="$bold" color="$textLight100" mb="$2">
              Cardio finisher — {plan.cardio_finisher.title}
            </Text>
            <Text color="$textLight400" size="sm" mb="$2">
              {plan.cardio_finisher.duration_minutes} minutes
            </Text>
            <Text color="$textLight500" size="sm">
              {plan.cardio_finisher.instructions}
            </Text>
          </Box>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
