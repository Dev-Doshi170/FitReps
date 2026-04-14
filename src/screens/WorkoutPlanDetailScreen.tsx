import { Box, ButtonText, Divider, Text, VStack } from '@gluestack-ui/themed';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../components/ui';
import type { AppStackParamList } from '../navigation/AppNavigator';
import {
  DEFAULT_PLAN_NAME,
  fetchPlanDetail,
  type WorkoutPlanDetail,
} from '../services/workoutPlan';
import { useAppDispatch, useAppSelector } from '../store';
import { setSelectedPlanId } from '../store/slices/workoutSlice';

type Props = NativeStackScreenProps<AppStackParamList, 'WorkoutPlanDetail'>;

export default function WorkoutPlanDetailScreen({ route, navigation }: Props) {
  const { planId, planName } = route.params;
  const dispatch = useAppDispatch();
  const selectedPlanId = useAppSelector(s => s.workout.selectedPlanId);
  const [detail, setDetail] = useState<WorkoutPlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: planName });
  }, [navigation, planName]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { detail: d, error: err } = await fetchPlanDetail(planId);
      if (cancelled) {
        return;
      }
      if (err) {
        setError(err);
        setDetail(null);
      } else {
        setDetail(d);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [planId]);

  /** Matches list screen: explicit selection, or default plan name when nothing stored yet. */
  const isActivePlan =
    selectedPlanId === planId ||
    (selectedPlanId == null && planName === DEFAULT_PLAN_NAME);

  const onUsePlan = useCallback(() => {
    dispatch(setSelectedPlanId(planId));
  }, [dispatch, planId]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <VStack space="lg">
          {loading ? (
            <VStack space="sm" alignItems="center" py="$8">
              <ActivityIndicator />
              <Text color="$textLight400" size="sm">
                Loading plan…
              </Text>
            </VStack>
          ) : null}

          {error ? (
            <Text color="$red400" size="sm">
              {error}
            </Text>
          ) : null}

          {!loading && detail ? (
            <>
              <Box
                bg="$backgroundDark800"
                borderRadius="$lg"
                p="$4"
                borderWidth={1}
                borderColor="$borderDark700">
                <VStack space="sm">
                  <Text color="$textLight50" fontWeight="$bold" size="xl">
                    {detail.name}
                  </Text>
                  <Text color="$textLight400" size="sm">
                    {detail.goal}
                  </Text>
                  <Text color="$textLight500" size="xs">
                    {detail.level} · {detail.daysPerWeek} training days / week
                  </Text>
                </VStack>
              </Box>

              <AppButton
                onPress={onUsePlan}
                isDisabled={isActivePlan}
                variant={isActivePlan ? 'outline' : 'solid'}>
                <ButtonText color="$textLight50">
                  {isActivePlan ? 'This is your active plan' : 'Use this plan'}
                </ButtonText>
              </AppButton>

              <Text color="$textLight300" fontWeight="$semibold" size="md">
                Split & sessions
              </Text>
              <Text color="$textLight500" size="sm">
                Each day shows the session focus (for example Push, Pull, Legs) and the exercises in
                order.
              </Text>

              <VStack space="lg">
                {detail.sessions.map(session => (
                  <Box
                    key={`${session.day}-${session.sessionType}`}
                    bg="$backgroundDark800"
                    borderRadius="$lg"
                    p="$4"
                    borderWidth={1}
                    borderColor="$borderDark700">
                    <VStack space="md">
                      <VStack space="xs">
                        <Text color="$textLight400" size="xs" textTransform="uppercase">
                          {session.day}
                        </Text>
                        <Text color="$textLight50" fontWeight="$bold" size="lg">
                          {session.sessionType}
                        </Text>
                        <Text color="$textLight400" size="sm">
                          {session.focus}
                        </Text>
                        <Text color="$textLight500" size="xs">
                          ~{session.durationMinutes} min
                        </Text>
                      </VStack>
                      <Divider bg="$borderDark700" />
                      <VStack space="sm">
                        <Text color="$textLight500" size="xs" fontWeight="$semibold">
                          Exercises
                        </Text>
                        {session.exercises.map((ex, i) => (
                          <Text key={`${ex.name}-${i}`} color="$textLight200" size="sm">
                            {i + 1}. {ex.name}
                            <Text color="$textLight500" size="xs">
                              {' '}
                              · {ex.sets}×{ex.reps}
                            </Text>
                          </Text>
                        ))}
                      </VStack>
                    </VStack>
                  </Box>
                ))}
              </VStack>
            </>
          ) : null}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
