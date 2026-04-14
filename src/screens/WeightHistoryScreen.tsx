import { HStack, Text, VStack } from '@gluestack-ui/themed';
import { useCallback, useEffect, useMemo } from 'react';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppDispatch, useAppSelector } from '../store';
import { fetchBodyWeightHistory } from '../store/slices/workoutSlice';
import type { BodyWeightEntry } from '../store/slices/workoutSlice';

function formatDateWithWeekday(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
  return `${dateKey} (${weekday})`;
}

export default function WeightHistoryScreen() {
  const dispatch = useAppDispatch();
  const entries = useAppSelector(s => s.workout.bodyWeightHistory ?? []);
  const loading = useAppSelector(s => s.workout.bodyWeightLoading);
  const error = useAppSelector(s => s.workout.bodyWeightError);

  useEffect(() => {
    dispatch(fetchBodyWeightHistory());
  }, [dispatch]);

  const listHeader = useMemo(
    () => (
      <VStack space="md" pb="$4">
        {loading ? <Text color="$textLight400">Loading…</Text> : null}
        {error ? (
          <Text color="$red400" size="sm">
            {error}
          </Text>
        ) : null}
        {!loading && entries.length === 0 && !error ? (
          <Text color="$textLight500">No weight entries yet. Log today’s weight on the Dashboard.</Text>
        ) : null}
      </VStack>
    ),
    [loading, error, entries.length],
  );

  const renderRow = useCallback(
    ({ item }: { item: BodyWeightEntry }) => (
      <HStack
        borderBottomWidth={1}
        borderColor="$borderDark700"
        py="$3"
        justifyContent="space-between"
        alignItems="center">
        <Text color="$textLight200" flex={1}>
          {formatDateWithWeekday(item.date)}
        </Text>
        <Text color="$textLight50" fontWeight="$semibold">
          {item.weight}
        </Text>
      </HStack>
    ),
    [],
  );

  const keyExtractor = useCallback((item: BodyWeightEntry) => item.date, []);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <FlatList
        data={entries}
        keyExtractor={keyExtractor}
        renderItem={renderRow}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}
