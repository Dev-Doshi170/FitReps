import { Box, Text, VStack } from '@gluestack-ui/themed';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PostExerciseSummaryCard from '../components/PostExerciseSummaryCard';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { useAppDispatch, useAppSelector } from '../store';
import { clearSessionProgression } from '../store/slices/workoutSlice';

type Props = NativeStackScreenProps<AppStackParamList, 'WorkoutSessionSummary'>;

export default function WorkoutSessionSummaryScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const plan = useAppSelector(s => s.workout.todayWorkout);
  const sessionRecommendations = useAppSelector(s => s.workout.sessionRecommendations);

  const exercises = plan?.exercises ?? [];

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <VStack space="lg">
          <Text fontWeight="$bold" color="$textLight100" size="lg">
            Session summary
          </Text>
          <Text color="$textLight400" size="sm">
            Next-session targets based on today&apos;s effort and reps.
          </Text>

          {exercises.length === 0 && (
            <Text color="$textLight500">No workout plan loaded.</Text>
          )}

          {exercises.map(ex => {
            const rec = sessionRecommendations?.[ex.name];
            return (
              <Box key={ex.id}>
                <Text fontWeight="$bold" color="$textLight200" mb="$2">
                  {ex.name}
                </Text>
                {rec != null ? (
                  <PostExerciseSummaryCard recommendation={rec} />
                ) : (
                  <Text color="$textLight500" size="sm">
                    No recommendation yet — log all sets for this exercise during your session.
                  </Text>
                )}
              </Box>
            );
          })}
        </VStack>
      </ScrollView>
      <Box px="$4" pb="$4">
        <Pressable
          onPress={() => {
            dispatch(clearSessionProgression());
            navigation.goBack();
          }}
          accessibilityRole="button">
          <Text color="$blue400" size="sm" textAlign="center">
            Clear &amp; close
          </Text>
        </Pressable>
      </Box>
    </SafeAreaView>
  );
}
