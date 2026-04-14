import { Badge, BadgeText, Box, HStack, Pressable, Text, VStack } from '@gluestack-ui/themed';

import type { Exercise } from '../store/slices/workoutSlice';

type Props = {
  exercise: Exercise;
  onPress: () => void;
};

export default function ExerciseCard({ exercise, onPress }: Props) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Box
        bg="$backgroundDark800"
        borderRadius="$lg"
        p="$4"
        borderWidth={1}
        borderColor="$borderDark700">
        <VStack space="sm">
          <Text fontWeight="$bold" color="$textLight50" size="md">
            {exercise.name}
          </Text>
          <Text color="$textLight400" size="sm">
            {exercise.sets} sets × {exercise.rep_range} reps
          </Text>
          <HStack space="sm" flexWrap="wrap">
            <Badge action="info" variant="outline" borderRadius="$md">
              <BadgeText>{exercise.type}</BadgeText>
            </Badge>
            <Badge action="info" variant="outline" borderRadius="$md">
              <BadgeText>{exercise.equipment}</BadgeText>
            </Badge>
          </HStack>
        </VStack>
      </Box>
    </Pressable>
  );
}
