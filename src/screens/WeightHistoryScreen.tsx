import { useCallback, useEffect, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { CrtScreen } from '../components/crt';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchBodyWeightHistory } from '../store/slices/workoutSlice';
import type { BodyWeightEntry } from '../store/slices/workoutSlice';
import { colors, fontFamily, spacing } from '../theme/theme';

function formatDate(dateKey: string): string {
  return dateKey;
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
      <View style={styles.header}>
        {loading ? <Text style={styles.muted}>LOADING…</Text> : null}
        {error ? <Text style={styles.err}>{error}</Text> : null}
        {!loading && entries.length === 0 && !error ? (
          <Text style={styles.muted}>NO MASS ENTRIES.</Text>
        ) : null}
      </View>
    ),
    [loading, error, entries.length],
  );

  const renderRow = useCallback(
    ({ item }: { item: BodyWeightEntry }) => (
      <View style={styles.row}>
        <Text style={styles.left}>{formatDate(item.date)}</Text>
        <Text style={styles.right}>{item.weight} KG</Text>
      </View>
    ),
    [],
  );

  const keyExtractor = useCallback((item: BodyWeightEntry) => item.date, []);

  return (
    <CrtScreen flicker={false}>
      <FlatList
        data={entries}
        keyExtractor={keyExtractor}
        renderItem={renderRow}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      />
    </CrtScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing(4),
  },
  header: {
    marginBottom: spacing(2),
  },
  muted: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  err: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.danger,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingVertical: spacing(1.5),
  },
  left: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.text,
  },
  right: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.accent,
  },
});
