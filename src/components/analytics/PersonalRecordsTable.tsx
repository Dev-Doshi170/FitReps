import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { getPersonalRecords } from '../../lib/analytics';
import { colors, fontFamily } from '../../theme/theme';
import type { PersonalRecord } from '../../types/analytics';

type Props = {
  userId: string;
};

const primary = colors.accent;
const surface = colors.surface;

function renderHeader() {
  return (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cell, styles.headerCell]}>Exercise</Text>
      <Text style={[styles.cell, styles.headerCell]}>Max Weight</Text>
      <Text style={[styles.cell, styles.headerCell]}>Date</Text>
    </View>
  );
}

export default function PersonalRecordsTable({ userId }: Props) {
  const [rows, setRows] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      const result = await getPersonalRecords(userId);
      if (mounted) {
        setRows(result);
        setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.stateWrap}>
        <ActivityIndicator color={primary} />
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={styles.stateWrap}>
        <Text style={styles.muted}>No PRs yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {renderHeader()}
      <FlatList
        data={rows}
        keyExtractor={item => `${item.exercise_name}-${item.date}`}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.cell}>🏆 {item.exercise_name}</Text>
            <Text style={styles.cell}>{Math.round(item.max_weight)} kg</Text>
            <Text style={styles.cell}>{item.date.slice(0, 10)}</Text>
          </View>
        )}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${primary}44`,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerRow: {
    backgroundColor: colors.surfaceElevated,
  },
  cell: {
    flex: 1,
    color: colors.text,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 12,
    fontFamily: fontFamily.regular,
  },
  headerCell: {
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
  stateWrap: {
    minHeight: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muted: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
  },
});
