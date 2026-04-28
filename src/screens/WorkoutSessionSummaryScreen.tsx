import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CrtScreen, HardwareButton } from '../components/crt';
import { hapticLight } from '../lib/haptics';
import type { AppStackParamList } from '../navigation/AppNavigator';
import {
  selectPrsHitCount,
  selectSessionDurationMs,
  selectSessionVolumeKg,
  selectSetsCompleted,
} from '../store/selectors/sessionStats';
import { useAppDispatch, useAppSelector } from '../store';
import type { SetLog } from '../store/slices/workoutSlice';
import { clearSessionProgression } from '../store/slices/workoutSlice';
import { colors, fontFamily, spacing } from '../theme/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'WorkoutSessionSummary'>;

function noteFromFlag(flag: string | null | undefined): string {
  if (flag === 'increase_weight' || flag === 'increase_reps') {
    return 'PR';
  }
  if (flag === 'deload') {
    return 'DELOAD';
  }
  if (flag === 'maintain') {
    return 'MAINTAIN';
  }
  return '—';
}

function bestSetStr(exerciseId: string, logs: SetLog[]): string {
  let best = 0;
  let label = '—';
  for (const l of logs) {
    if (l.exerciseId !== exerciseId || !l.supabaseId) {
      continue;
    }
    if (l.weight != null && l.reps != null) {
      const v = l.weight * l.reps;
      if (v >= best) {
        best = v;
        label = `${l.weight}KG X ${l.reps}`;
      }
    }
  }
  return label;
}

function GlitchTitle({ text }: { text: string }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(x, { toValue: -1, duration: 100, useNativeDriver: true }),
        Animated.timing(x, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [x]);

  return (
    <Animated.Text style={[styles.glitchTitle, { transform: [{ translateX: x }] }]}>
      {text}
    </Animated.Text>
  );
}

export default function WorkoutSessionSummaryScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const plan = useAppSelector(s => s.workout.todayWorkout);
  const logs = useAppSelector(s => s.workout.logs);
  const sessionRecommendations = useAppSelector(s => s.workout.sessionRecommendations);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const volume = useAppSelector(selectSessionVolumeKg);
  const sets = useAppSelector(selectSetsCompleted);
  const prs = useAppSelector(selectPrsHitCount);
  const durationMs = useAppSelector(s => selectSessionDurationMs(s, now));

  const exercises = plan?.exercises ?? [];

  const stats = useMemo(
    () => [
      { label: 'TOTAL VOLUME', value: Math.round(volume) },
      { label: 'SETS COMPLETED', value: sets },
      { label: 'DURATION S', value: Math.round(durationMs / 1000) },
      { label: 'PR SIGNALS', value: prs },
    ],
    [durationMs, prs, sets, volume],
  );

  return (
    <CrtScreen flicker={false}>
      <ScrollView
        contentContainerStyle={styles.pad}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}>
        <GlitchTitle text="SESSION COMPLETE" />

        <View style={styles.grid}>
          {stats.map(s => (
            <View key={s.label} style={styles.cell}>
              <Text style={styles.cellLabel}>{s.label}</Text>
              <Text style={styles.cellValue}>{s.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.tableHead}>EXERCISE | BEST SET | NOTES</Text>
        {exercises.length === 0 ? (
          <Text style={styles.muted}>NO PLAN LOADED.</Text>
        ) : (
          exercises.map(ex => {
            const rec = sessionRecommendations?.[ex.name];
            return (
              <Text key={ex.id} style={styles.tableRow} numberOfLines={2}>
                {ex.name.padEnd(14).slice(0, 14)} | {bestSetStr(ex.id, logs).padEnd(14).slice(0, 14)}{' '}
                | {noteFromFlag(rec?.flag ?? null)}
              </Text>
            );
          })
        )}

        <Text style={styles.nextHead}>{'> NEXT TARGETS:'}</Text>
        {exercises.map(ex => {
          const rec = sessionRecommendations?.[ex.name];
          const line =
            rec?.nextWeight != null
              ? `${ex.name}: ${rec.nextWeight} KG`
              : `${ex.name}: —`;
          return (
            <Text key={`n-${ex.id}`} style={styles.nextLine}>
              {line}
            </Text>
          );
        })}
        <Text style={styles.cursor}>_</Text>
      </ScrollView>

      <View style={styles.footer}>
        <HardwareButton
          label="END TRANSMISSION"
          variant="outlined"
          onPress={() => {
            hapticLight();
            dispatch(clearSessionProgression());
            navigation.goBack();
          }}
        />
      </View>
    </CrtScreen>
  );
}

const styles = StyleSheet.create({
  pad: {
    paddingBottom: spacing(4),
    paddingHorizontal: spacing(2),
  },
  glitchTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    letterSpacing: 2,
    color: colors.accent,
    marginBottom: spacing(2),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
    marginBottom: spacing(2),
  },
  cell: {
    width: '48%',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing(1.5),
    backgroundColor: colors.activeTint,
  },
  cellLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.textMuted,
    marginBottom: 4,
  },
  cellValue: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    color: colors.accent,
  },
  tableHead: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.textMuted,
    marginBottom: 8,
    marginTop: spacing(1),
  },
  tableRow: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.text,
    marginBottom: 6,
    lineHeight: 16,
  },
  muted: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  nextHead: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.accent,
    marginTop: spacing(2),
    marginBottom: 8,
  },
  nextLine: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  cursor: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.accent,
    marginTop: 4,
  },
  footer: {
    padding: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
});
