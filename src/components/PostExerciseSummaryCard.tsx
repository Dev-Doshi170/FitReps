import { Box, HStack, Text, VStack } from '@gluestack-ui/themed';

import type { ProgressionRecommendation } from '../lib/progressionTypes';

type Props = {
  recommendation: ProgressionRecommendation;
};

const FLAG_COLORS: Record<
  NonNullable<ProgressionRecommendation['flag']>,
  { bg: string; text: string; label: string }
> = {
  increase_weight: { bg: '$green700', text: '$textLight0', label: 'Progress' },
  increase_reps: { bg: '$blue700', text: '$textLight0', label: 'Reps' },
  maintain: { bg: '$backgroundDark600', text: '$textLight200', label: 'Hold' },
  deload: { bg: '$amber600', text: '$textLight0', label: 'Recovery' },
};

export default function PostExerciseSummaryCard({ recommendation }: Props) {
  const flag = recommendation.flag;
  const colors =
    flag != null ? FLAG_COLORS[flag] : FLAG_COLORS.maintain;

  return (
    <VStack
      mt="$3"
      p="$3"
      bg="$backgroundDark800"
      borderRadius="$lg"
      borderWidth={1}
      borderColor="$borderDark700"
      space="sm">
      <HStack alignItems="center" space="sm" flexWrap="wrap">
        <Text fontWeight="$bold" color="$textLight100" size="sm">
          Next session
        </Text>
        {flag != null && (
          <Box px="$2" py="$1" borderRadius="$full" bg={colors.bg}>
            <Text color={colors.text} size="xs" fontWeight="$bold">
              {colors.label}
            </Text>
          </Box>
        )}
      </HStack>
      <Text color="$textLight300" size="sm">
        {recommendation.recommendation}
      </Text>
      {recommendation.alertMessage != null && recommendation.alertMessage !== '' && (
        <HStack
          space="sm"
          bg="$amber950"
          borderRadius="$md"
          p="$2"
          borderWidth={1}
          borderColor="$amber700"
          alignItems="flex-start">
          <Text size="sm">ℹ️</Text>
          <Text flex={1} color="$amber100" size="sm">
            {recommendation.alertMessage}
          </Text>
        </HStack>
      )}
    </VStack>
  );
}
