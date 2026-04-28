import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getWeeklySummary } from '../../lib/analytics';
import { colors, fontFamily, spacing } from '../../theme/theme';
import type { WeeklyStats } from '../../types/analytics';

type Props = {
  userId: string;
};

const primary = colors.accent;
const surface = colors.surface;

function formatKg(value: number): string {
  return `${Math.round(value).toLocaleString()} kg`;
}

export default function WeeklySummaryCards({ userId }: Props) {
  const [rows, setRows] = useState<WeeklyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      const result = await getWeeklySummary(userId);
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

  const latestFour = useMemo(() => rows.slice(-4).reverse(), [rows]);

  if (loading) {
    return (
      <View style={styles.stateWrap}>
        <ActivityIndicator color={primary} />
      </View>
    );
  }

  if (latestFour.length === 0) {
    return (
      <View style={styles.stateWrap}>
        <Text style={styles.muted}>No weekly summary yet</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {latestFour.map(week => (
        <View key={week.week_start} style={styles.card}>
          <Text style={styles.week}>Week of {week.week_start}</Text>
          <Text style={styles.label}>Sessions</Text>
          <Text style={styles.value}>{week.total_sessions}</Text>
          <Text style={styles.label}>Volume</Text>
          <Text style={styles.value}>{formatKg(week.total_volume)}</Text>
          <Text style={styles.label}>Avg RPE</Text>
          <Text style={styles.value}>{week.avg_rpe.toFixed(1)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 12,
    paddingBottom: 4,
    paddingHorizontal: spacing(2),
  },
  card: {
    width: 210,
    backgroundColor: surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: `${primary}66`,
  },
  week: {
    color: colors.accent,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: fontFamily.bold,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fontFamily.regular,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
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
