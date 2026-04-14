import { Box, Divider, HStack, Text, VStack } from '@gluestack-ui/themed';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppTextField } from '../components/ui';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchHistory } from '../store/slices/workoutSlice';
import type { SetLog, WorkoutHistory } from '../store/slices/workoutSlice';

const PAGE_SIZE = 14;

function inDateRange(date: string, from?: string, to?: string): boolean {
  if (from && date < from) {
    return false;
  }
  if (to && date > to) {
    return false;
  }
  return true;
}

function matchesExercise(name: string, filter: string): boolean {
  if (!filter.trim()) {
    return true;
  }
  return name.toLowerCase().includes(filter.trim().toLowerCase());
}

/** Local date string YYYY-MM-DD → "YYYY-MM-DD (Weekday)" */
function formatDateWithWeekday(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
  return `${dateKey} (${weekday})`;
}

export default function HistoryScreen() {
  const dispatch = useAppDispatch();
  const history = useAppSelector(s => s.workout.history);
  const loading = useAppSelector(s => s.workout.loading);

  const [exerciseFilter, setExerciseFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [visibleDayCount, setVisibleDayCount] = useState(PAGE_SIZE);

  useEffect(() => {
    dispatch(fetchHistory());
  }, [dispatch]);

  useEffect(() => {
    setVisibleDayCount(PAGE_SIZE);
  }, [dateFrom, dateTo, exerciseFilter]);

  const filtered: WorkoutHistory[] = useMemo(() => {
    return history
      .filter(h => inDateRange(h.date, dateFrom || undefined, dateTo || undefined))
      .map(h => ({
        date: h.date,
        exercises: h.exercises.filter(ex => matchesExercise(ex.exerciseName, exerciseFilter)),
      }))
      .filter(h => h.exercises.length > 0);
  }, [dateFrom, dateTo, exerciseFilter, history]);

  const displayedDays = useMemo(
    () => filtered.slice(0, visibleDayCount),
    [filtered, visibleDayCount],
  );

  const loadMoreDays = useCallback(() => {
    if (visibleDayCount >= filtered.length) {
      return;
    }
    setVisibleDayCount(c => Math.min(c + PAGE_SIZE, filtered.length));
  }, [visibleDayCount, filtered.length]);

  const renderDay = useCallback(
    ({ item: day }: { item: WorkoutHistory }) => (
      <Box mb="$4">
        <Text fontWeight="$bold" color="$textLight100" size="md" mb="$3">
          {formatDateWithWeekday(day.date)}
        </Text>
        <VStack space="md">
          {day.exercises.map(ex => {
            const key = `${day.date}::${ex.exerciseName}`;
            return (
              <Box key={key}>
                <Text color="$textLight200" fontWeight="$semibold" mb="$2">
                  {ex.exerciseName}
                </Text>
                <VStack space="xs">
                  <HStack
                    borderBottomWidth={1}
                    borderColor="$borderDark700"
                    pb="$1">
                    <Text flex={1} size="xs" color="$textLight400">
                      Set
                    </Text>
                    <Text flex={1} size="xs" color="$textLight400">
                      Reps
                    </Text>
                    <Text flex={1} size="xs" color="$textLight400">
                      Weight
                    </Text>
                  </HStack>
                  {ex.sets
                    .slice()
                    .sort((a, b) => a.setNumber - b.setNumber)
                    .map((s: SetLog) => (
                      <HStack
                        key={`${key}-${s.setNumber}`}
                        borderBottomWidth={1}
                        borderColor="$borderDark700"
                        py="$2">
                        <Text flex={1} color="$textLight200">
                          {s.setNumber}
                        </Text>
                        <Text flex={1} color="$textLight200">
                          {s.reps ?? '—'}
                        </Text>
                        <Text flex={1} color="$textLight200">
                          {s.weight ?? '—'}
                        </Text>
                      </HStack>
                    ))}
                </VStack>
              </Box>
            );
          })}
        </VStack>
        <Divider bg="$borderDark700" mt="$2" />
      </Box>
    ),
    [],
  );

  const keyExtractor = useCallback((item: WorkoutHistory) => item.date, []);

  const listHeader = useMemo(
    () => (
      <VStack space="lg" pb="$2">
        <Text size="2xl" fontWeight="$bold" color="$textLight50">
          History
        </Text>
        {loading ? <Text color="$textLight400">Loading…</Text> : null}
        <VStack space="md">
          <AppTextField
            placeholder="Filter by exercise name"
            value={exerciseFilter}
            onChangeText={setExerciseFilter}
          />
          <HStack space="md">
            <AppTextField
              inputProps={{ flex: 1 }}
              placeholder="From YYYY-MM-DD"
              value={dateFrom}
              onChangeText={setDateFrom}
            />
            <AppTextField
              inputProps={{ flex: 1 }}
              placeholder="To YYYY-MM-DD"
              value={dateTo}
              onChangeText={setDateTo}
            />
          </HStack>
        </VStack>
        {filtered.length === 0 && !loading ? (
          <Text color="$textLight500">No workouts match these filters.</Text>
        ) : null}
      </VStack>
    ),
    [loading, exerciseFilter, dateFrom, dateTo, filtered.length],
  );

  const listFooter = useMemo(() => {
    if (filtered.length === 0 || visibleDayCount >= filtered.length) {
      return <Box height={24} />;
    }
    return (
      <Box py="$4">
        <Text color="$textLight500" size="sm" textAlign="center">
          Scroll for older days…
        </Text>
      </Box>
    );
  }, [filtered.length, visibleDayCount]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <FlatList
        data={displayedDays}
        keyExtractor={keyExtractor}
        renderItem={renderDay}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        onEndReached={loadMoreDays}
        onEndReachedThreshold={0.35}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}
