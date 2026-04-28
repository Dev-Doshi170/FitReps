import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { BarChart, type barDataItem } from 'react-native-gifted-charts';

import { getFocusVolumePerSession } from '../../lib/analytics';
import { colors, fontFamily } from '../../theme/theme';
import type { FocusSessionVolumePoint } from '../../types/analytics';

type Props = {
  userId: string;
  focus: string;
};

const primary = colors.accent;
const surface = colors.surface;

export default function MuscleGroupVolumeChart({ userId, focus }: Props) {
  const [points, setPoints] = useState<FocusSessionVolumePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      const result = await getFocusVolumePerSession(userId, focus);
      if (mounted) {
        setPoints(result);
        setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [focus, userId]);

  const chartData = useMemo<barDataItem[]>(
    () =>
      points.map(p => ({
        value: p.total_volume,
        label: p.label,
        frontColor: primary,
      })),
    [points],
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{focus} — volume per session</Text>
      <Text style={styles.subtitle}>Each bar is one logged workout (chronological).</Text>
      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={primary} />
          <Text style={styles.muted}>Loading chart...</Text>
        </View>
      ) : points.length === 0 ? (
        <View style={styles.stateWrap}>
          <Text style={styles.muted}>No data yet</Text>
        </View>
      ) : (
        <BarChart
          data={chartData}
          height={220}
          barWidth={Math.min(28, Math.max(14, 320 / Math.max(chartData.length, 1)))}
          spacing={Math.min(20, Math.max(8, 280 / Math.max(chartData.length, 1)))}
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.axisText}
          noOfSections={5}
          hideRules={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: surface,
    borderRadius: 12,
    padding: 12,
  },
  title: {
    color: colors.accent,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: fontFamily.bold,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 10,
    fontFamily: fontFamily.regular,
  },
  stateWrap: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muted: {
    color: colors.textMuted,
    marginTop: 8,
    fontFamily: fontFamily.regular,
  },
  axisText: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fontFamily.regular,
  },
});
