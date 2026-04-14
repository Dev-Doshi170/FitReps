import { Box, HStack, Text, VStack } from '@gluestack-ui/themed';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import WorkoutStreakBadge from '../components/WorkoutStreakBadge';
import { AppButton, AppTextField } from '../components/ui';
import type { AppStackParamList, MainTabParamList } from '../navigation/AppNavigator';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchHistory,
  fetchTodayBodyWeight,
  saveTodayBodyWeight,
  localDateKey,
  setTodayWorkout,
} from '../store/slices/workoutSlice';

type DashboardNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<AppStackParamList>
>;

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardNav>();
  const dispatch = useAppDispatch();
  const plan = useAppSelector(s => s.workout.todayWorkout);
  const planLoading = useAppSelector(s => s.workout.todayWorkoutLoading);
  const planError = useAppSelector(s => s.workout.todayWorkoutError);
  const selectedPlanId = useAppSelector(s => s.workout.selectedPlanId);
  const todayBodyWeight = useAppSelector(s => s.workout.todayBodyWeight);
  const bodyWeightLoading = useAppSelector(s => s.workout.bodyWeightLoading);
  const bodyWeightError = useAppSelector(s => s.workout.bodyWeightError);
  const [weightDraft, setWeightDraft] = useState('');
  const [weightInputError, setWeightInputError] = useState<string | null>(null);
  const dow = new Date().getDay();
  const isWeekend = dow === 0 || dow === 6;
  const todayKey = localDateKey(new Date());
  const weightLocked = todayBodyWeight != null;

  useEffect(() => {
    dispatch(setTodayWorkout(dow));
    dispatch(fetchHistory());
    dispatch(fetchTodayBodyWeight());
  }, [dispatch, dow, selectedPlanId]);

  useEffect(() => {
    if (todayBodyWeight != null) {
      setWeightDraft(String(todayBodyWeight));
    }
  }, [todayBodyWeight]);

  const saveWeight = () => {
    setWeightInputError(null);
    const normalized = weightDraft.trim().replace(',', '.');
    const w = parseFloat(normalized);
    if (normalized === '' || Number.isNaN(w) || w <= 0 || w > 500) {
      setWeightInputError('Enter a number between 0 and 500.');
      return;
    }
    dispatch(saveTodayBodyWeight(w));
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <VStack space="lg">
          <HStack justifyContent="space-between" alignItems="center">
            <Text size="2xl" fontWeight="$bold" color="$textLight50">
              Today
            </Text>
            <WorkoutStreakBadge />
          </HStack>

          <Box
            bg="$backgroundDark800"
            borderRadius="$lg"
            p="$4"
            borderWidth={1}
            borderColor="$borderDark700">
            <Text fontWeight="$bold" color="$textLight100" mb="$1">
              Body weight
            </Text>
            <Text color="$textLight500" size="sm" mb="$3">
              {todayKey}
              {weightLocked ? ' · Logged' : ''}
            </Text>
            <AppTextField
              placeholder="Weight"
              value={weightDraft}
              onChangeText={text => {
                setWeightInputError(null);
                setWeightDraft(text);
              }}
              editable={!weightLocked}
              keyboardType="decimal-pad"
              inputProps={{ opacity: weightLocked ? 0.85 : 1 }}
            />
            {weightInputError ? (
              <Text color="$red400" size="sm" mt="$2">
                {weightInputError}
              </Text>
            ) : null}
            {bodyWeightError ? (
              <Text color="$red400" size="sm" mt="$2">
                {bodyWeightError}
              </Text>
            ) : null}
            {!weightLocked ? (
              <AppButton
                mt="$3"
                onPress={saveWeight}
                isLoading={bodyWeightLoading}
                showSpinner>
                Save weight
              </AppButton>
            ) : null}
            <Pressable
              onPress={() => navigation.navigate('WeightHistory')}
              style={{ marginTop: 12 }}
              accessibilityRole="button">
              <Text color="$textLight400" size="sm" textDecorationLine="underline">
                View weight history
              </Text>
            </Pressable>
          </Box>

          {!isWeekend && planLoading ? (
            <Box
              bg="$backgroundDark800"
              borderRadius="$lg"
              p="$4"
              borderWidth={1}
              borderColor="$borderDark700"
              alignItems="center">
              <ActivityIndicator />
              <Text color="$textLight400" size="sm" mt="$2">
                Loading today&apos;s plan…
              </Text>
            </Box>
          ) : !isWeekend && planError ? (
            <Box
              bg="$backgroundDark800"
              borderRadius="$lg"
              p="$4"
              borderWidth={1}
              borderColor="$borderDark700">
              <Text color="$red400" size="sm">
                {planError}
              </Text>
            </Box>
          ) : !plan ? (
            <Box
              bg="$backgroundDark800"
              borderRadius="$lg"
              p="$4"
              borderWidth={1}
              borderColor="$borderDark700">
              <Text color="$textLight300">
                {isWeekend
                  ? 'Rest day — no programmed session for the weekend.'
                  : 'Rest day — no workout scheduled for today.'}
              </Text>
            </Box>
          ) : (
            <Box
              bg="$backgroundDark800"
              borderRadius="$lg"
              p="$4"
              borderWidth={1}
              borderColor="$borderDark700">
              <VStack space="md">
                <VStack space="xs">
                  <Text color="$textLight50" fontWeight="$semibold" size="lg">
                    {plan.day_name}
                  </Text>
                  <Text color="$textLight400">{plan.focus}</Text>
                  <Text color="$textLight500" size="sm">
                    ~{plan.duration_minutes} minutes
                  </Text>
                </VStack>
                <AppButton onPress={() => navigation.navigate('TodayWorkout')}>
                  Start workout
                </AppButton>
              </VStack>
            </Box>
          )}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
