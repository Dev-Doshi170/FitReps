import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CrtScreen, HardwareButton } from '../components/crt';
import { hapticLight } from '../lib/haptics';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchHistory } from '../store/slices/workoutSlice';
import type { SetLog, WorkoutHistory } from '../store/slices/workoutSlice';
import { colors, crt, fontFamily, spacing } from '../theme/theme';

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

function exerciseVolume(sets: SetLog[]): number {
  return sets.reduce((sum, s) => {
    if (s.reps != null && s.weight != null) {
      return sum + s.reps * s.weight;
    }
    return sum;
  }, 0);
}

function dayVolume(day: WorkoutHistory): number {
  return day.exercises.reduce((sum, ex) => sum + exerciseVolume(ex.sets), 0);
}

export default function HistoryScreen() {
  const dispatch = useAppDispatch();
  const history = useAppSelector(s => s.workout.history);
  const loading = useAppSelector(s => s.workout.loading);

  const [exerciseFilter, setExerciseFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [visibleDayCount, setVisibleDayCount] = useState(PAGE_SIZE);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

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
    ({ item: day }: { item: WorkoutHistory }) => {
      const vol = dayVolume(day);
      const expanded = expandedDate === day.date;
      return (
        <View style={styles.dayBlock}>
          <Text style={styles.sep}>{`── ${day.date} ─────────────────────`}</Text>
          <Pressable
            onPress={() => {
              hapticLight();
              setExpandedDate(expanded ? null : day.date);
            }}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
            <Text style={styles.rowLeft} numberOfLines={1}>
              SESSION LOG
            </Text>
            <Text style={styles.rowMid}>{Math.round(vol)} KG</Text>
            <Text style={styles.rowRight}>—</Text>
          </Pressable>
          {expanded ? (
            <View style={styles.detail}>
              <Text style={styles.thead}>EXERCISE REPS WT</Text>
              {day.exercises.map(ex => (
                <View key={ex.exerciseName} style={styles.exBlock}>
                  <Text style={styles.exName}>{ex.exerciseName}</Text>
                  {ex.sets
                    .slice()
                    .sort((a, b) => a.setNumber - b.setNumber)
                    .map(s => (
                      <Text key={s.setNumber} style={styles.exRow}>
                        {String(s.setNumber).padStart(2, '0')} {s.reps ?? '—'} {s.weight ?? '—'}
                      </Text>
                    ))}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      );
    },
    [expandedDate],
  );

  const keyExtractor = useCallback((item: WorkoutHistory) => item.date, []);

  return (
    <CrtScreen flicker={false}>
      <FlatList
        data={displayedDays}
        keyExtractor={keyExtractor}
        renderItem={renderDay}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        onEndReached={loadMoreDays}
        onEndReachedThreshold={0.35}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>MISSION ARCHIVE</Text>
            {loading ? <Text style={styles.muted}>LOADING…</Text> : null}
            <Text style={styles.filterLabel}>[ EXERCISE ]</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={colors.textMuted}
              placeholder="__________"
              value={exerciseFilter}
              onChangeText={setExerciseFilter}
            />
            <View style={styles.rangeRow}>
              <View style={styles.rangeCol}>
                <Text style={styles.filterLabel}>[ DATE FROM ]</Text>
                <TextInput
                  style={styles.input}
                  placeholderTextColor={colors.textMuted}
                  placeholder="YYYY-MM-DD"
                  value={dateFrom}
                  onChangeText={setDateFrom}
                />
              </View>
              <View style={styles.rangeCol}>
                <Text style={styles.filterLabel}>[ DATE TO ]</Text>
                <TextInput
                  style={styles.input}
                  placeholderTextColor={colors.textMuted}
                  placeholder="YYYY-MM-DD"
                  value={dateTo}
                  onChangeText={setDateTo}
                />
              </View>
              <HardwareButton
                label="APPLY"
                variant="outlined"
                onPress={() => hapticLight()}
                style={styles.apply}
              />
            </View>
            {filtered.length === 0 && !loading ? (
              <Text style={styles.muted}>NO MATCHES.</Text>
            ) : null}
          </View>
        }
        ListFooterComponent={
          visibleDayCount < filtered.length ? (
            <Pressable onPress={loadMoreDays} style={styles.loadMore}>
              <Text style={styles.loadMoreText}>LOAD MORE</Text>
            </Pressable>
          ) : (
            <View style={{ height: 24 }} />
          )
        }
      />
    </CrtScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing(4),
    paddingHorizontal: spacing(2),
  },
  header: {
    marginBottom: spacing(2),
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    letterSpacing: crt.labelLetterSpacing,
    color: colors.textMuted,
    marginBottom: spacing(1),
  },
  muted: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 8,
  },
  filterLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.textMuted,
    marginTop: spacing(1),
  },
  input: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
    paddingVertical: 8,
    marginBottom: 4,
  },
  rangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'flex-end',
    marginTop: spacing(1),
  },
  rangeCol: {
    flex: 1,
    minWidth: 120,
  },
  apply: {
    minHeight: 40,
    paddingHorizontal: spacing(1),
  },
  dayBlock: {
    marginBottom: spacing(2),
  },
  sep: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing(1.5),
    backgroundColor: colors.surface,
  },
  rowPressed: {
    borderColor: colors.accent,
  },
  rowLeft: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.text,
  },
  rowMid: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.accent,
    marginHorizontal: 8,
  },
  rowRight: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.textMuted,
    width: 40,
    textAlign: 'right',
  },
  detail: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.borderSubtle,
    padding: spacing(1.5),
    backgroundColor: colors.bg,
  },
  thead: {
    fontFamily: fontFamily.regular,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.textMuted,
    marginBottom: 8,
  },
  exBlock: {
    marginBottom: spacing(1),
  },
  exName: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.text,
    marginBottom: 4,
  },
  exRow: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.textMuted,
  },
  loadMore: {
    padding: spacing(2),
    alignItems: 'center',
  },
  loadMoreText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.accent,
  },
});
