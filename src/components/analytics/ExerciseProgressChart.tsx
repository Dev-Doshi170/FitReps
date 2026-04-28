import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LineChart, type lineDataItem } from 'react-native-gifted-charts';

import { getExerciseProgress } from '../../lib/analytics';
import { colors, fontFamily } from '../../theme/theme';
import type { ExerciseProgressPoint } from '../../types/analytics';

type Props = {
  userId: string;
  exerciseName: string;
};

const primary = colors.accent;
const warning = colors.accentSecondary;
const surface = colors.surface;

function fmtDateLabel(date: string): string {
  return date.slice(5);
}

export default function ExerciseProgressChart({ userId, exerciseName }: Props) {
  const [points, setPoints] = useState<ExerciseProgressPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartWidth, setChartWidth] = useState(
    () => Dimensions.get('window').width,
  );

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      const result = await getExerciseProgress(userId, exerciseName);
      if (mounted) {
        setPoints(result);
        setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [exerciseName, userId]);

  const weightSeries = useMemo<lineDataItem[]>(
    () =>
      points.map(p => ({
        value: p.best_weight,
        label: fmtDateLabel(p.date),
        dataPointText: `${Math.round(p.best_weight)}`,
      })),
    [points],
  );

  const rmSeries = useMemo<lineDataItem[]>(
    () =>
      points.map(p => ({
        value: p.estimated_1rm,
        label: fmtDateLabel(p.date),
        dataPointText: `${Math.round(p.estimated_1rm)}`,
      })),
    [points],
  );

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={primary} />
        <Text style={styles.muted}>Loading chart...</Text>
      </View>
    );
  }

  if (points.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.muted}>No data yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.legend}>Best Weight</Text>
      <Text style={styles.legendAlt}>Estimated 1RM</Text>
      <View
        onLayout={e => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) {
            setChartWidth(w);
          }
        }}
      >
        <LineChart
          adjustToWidth
          parentWidth={chartWidth}
          areaChart={false}
          data={weightSeries}
          data2={rmSeries}
          color1={primary}
          color2={warning}
          thickness={3}
          height={220}
          noOfSections={5}
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.axisText}
          initialSpacing={8}
          endSpacing={8}
          hideDataPoints={false}
          dataPointsColor1={primary}
          dataPointsColor2={warning}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: surface,
    borderRadius: 12,
    padding: 12,
  },
  muted: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    fontFamily: fontFamily.regular,
  },
  legend: {
    color: primary,
    marginBottom: 4,
    fontWeight: '600',
    fontFamily: fontFamily.bold,
  },
  legendAlt: {
    color: warning,
    marginBottom: 12,
    fontWeight: '600',
    fontFamily: fontFamily.bold,
  },
  axisText: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fontFamily.regular,
  },
});
