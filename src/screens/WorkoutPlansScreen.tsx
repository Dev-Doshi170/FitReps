import { Box, HStack, Text, VStack } from '@gluestack-ui/themed';
import { useNavigation } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppStackParamList } from '../navigation/AppNavigator';
import {
  DEFAULT_PLAN_NAME,
  fetchAllPlans,
  type WorkoutPlanSummary,
} from '../services/workoutPlan';
import { useAppSelector } from '../store';

type Props = NativeStackScreenProps<AppStackParamList, 'WorkoutPlans'>;

type PlansNav = NativeStackNavigationProp<AppStackParamList, 'WorkoutPlans'>;

export default function WorkoutPlansScreen(_props: Props) {
  const navigation = useNavigation<PlansNav>();
  const selectedPlanId = useAppSelector(s => s.workout.selectedPlanId);
  const [plans, setPlans] = useState<WorkoutPlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { plans: rows, error: err } = await fetchAllPlans();
      if (cancelled) {
        return;
      }
      if (err) {
        setError(err);
        setPlans([]);
      } else {
        setPlans(rows);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveSelectedId = useMemo(() => {
    if (selectedPlanId) {
      return selectedPlanId;
    }
    const byName = plans.find(p => p.name === DEFAULT_PLAN_NAME)?.id;
    return byName ?? plans[0]?.id ?? null;
  }, [selectedPlanId, plans]);

  const openPlanDetail = useCallback(
    (plan: WorkoutPlanSummary) => {
      navigation.navigate('WorkoutPlanDetail', {
        planId: plan.id,
        planName: plan.name,
      });
    },
    [navigation],
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <VStack space="lg">
          <Text size="2xl" fontWeight="$bold" color="$textLight50">
            Workout plans
          </Text>
          <Text color="$textLight500" size="sm">
            Tap a plan to see the split (Push, Pull, Legs, etc.) and every exercise. The active plan
            is highlighted; set it from the plan detail screen.
          </Text>

          {loading ? (
            <HStack space="sm" alignItems="center">
              <ActivityIndicator />
              <Text color="$textLight400" size="sm">
                Loading plans…
              </Text>
            </HStack>
          ) : null}

          {error ? (
            <Text color="$red400" size="sm">
              {error}
            </Text>
          ) : null}

          {!loading && !error && plans.length === 0 ? (
            <Text color="$textLight500">No plans found. Seed your database with a workout plan.</Text>
          ) : null}

          <VStack space="md">
            {plans.map(plan => {
              const isSelected = effectiveSelectedId === plan.id;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => openPlanDetail(plan)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityHint="Opens session breakdown and exercises">
                  <Box
                    bg={isSelected ? '$backgroundDark700' : '$backgroundDark800'}
                    borderRadius="$lg"
                    p="$4"
                    borderWidth={2}
                    borderColor={isSelected ? '$blue500' : '$borderDark700'}>
                    <HStack justifyContent="space-between" alignItems="flex-start" space="md">
                      <VStack space="xs" flex={1}>
                        <Text color="$textLight50" fontWeight="$bold" size="lg">
                          {plan.name}
                        </Text>
                        <Text color="$textLight400" size="sm">
                          {plan.goal}
                        </Text>
                        <HStack space="md" flexWrap="wrap">
                          <Text color="$textLight500" size="xs">
                            Level: {plan.level}
                          </Text>
                          <Text color="$textLight500" size="xs">
                            {plan.days_per_week} days / week
                          </Text>
                        </HStack>
                      </VStack>
                      {isSelected ? (
                        <Box bg="$blue600" px="$2" py="$1" borderRadius="$sm">
                          <Text size="xs" fontWeight="$bold" color="$textLight0">
                            Selected
                          </Text>
                        </Box>
                      ) : null}
                    </HStack>
                  </Box>
                </Pressable>
              );
            })}
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
