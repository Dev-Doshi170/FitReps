import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LineChart, type lineDataItem } from 'react-native-gifted-charts';

import { getBodyWeightTrend } from '../../lib/analytics';
import { colors, fontFamily } from '../../theme/theme';
import type { BodyWeightPoint } from '../../types/analytics';

type Props = {
  userId: string;
};

const success = colors.accent;
const warning = colors.accentTertiary;
const surface = colors.surface;

function getTrend(points: BodyWeightPoint[]): lineDataItem[] {
  const n = points.length;
  if (n < 2) {
    return points.map(p => ({ value: p.weight, label: p.logged_date.slice(5) }));
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i += 1) {
    const y = points[i].weight;
    sumX += i;
    sumY += y;
    sumXY += i * y;
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;
  return points.map((p, i) => ({
    value: slope * i + intercept,
    label: p.logged_date.slice(5),
  }));
}

export default function BodyWeightChart({ userId }: Props) {
  const [points, setPoints] = useState<BodyWeightPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartWidth, setChartWidth] = useState(
    () => Dimensions.get('window').width,
  );

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      const result = await getBodyWeightTrend(userId);
      if (mounted) {
        setPoints(result);
        setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const data = useMemo<lineDataItem[]>(
    () => points.map(p => ({ value: p.weight, label: p.logged_date.slice(5) })),
    [points],
  );
  const trend = useMemo(() => getTrend(points), [points]);

  return (
    <View style={styles.card}>
      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={success} />
          <Text style={styles.muted}>Loading chart...</Text>
        </View>
      ) : points.length === 0 ? (
        <View style={styles.stateWrap}>
          <Text style={styles.muted}>No data yet</Text>
        </View>
      ) : (
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
            data={data}
            data2={trend}
            color1={success}
            color2={warning}
            thickness={3}
            height={220}
            noOfSections={5}
            initialSpacing={8}
            yAxisTextStyle={styles.axisText}
            xAxisLabelTextStyle={styles.axisText}
            hideDataPoints={false}
            dataPointsColor1={success}
            dataPointsColor2={warning}
          />
        </View>
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
