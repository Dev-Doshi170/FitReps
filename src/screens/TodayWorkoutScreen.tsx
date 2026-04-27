import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CrtScreen, HardwareButton, ProgressRow } from '../components/crt';
import { hapticLight } from '../lib/haptics';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchProgressionForExercise,
  loadPlanDayById,
  localDateKey,
} from '../store/slices/workoutSlice';
import type { Exercise } from '../store/slices/workoutSlice';
import { colors, crt, fontFamily, spacing } from '../theme/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'TodayWorkout'>;

function ElapsedTimer() {
  const sessionStartedAt = useAppSelector(s => s.workout.sessionStartedAt);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const sec =
    sessionStartedAt != null ? Math.max(0, Math.floor((now - sessionStartedAt) / 1000)) : 0;
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  return (
    <Text style={timerStyles.t} accessibilityLabel={`Elapsed ${mm} minutes ${ss} seconds`}>
      {mm}:{ss}
    </Text>
  );
}

const timerStyles = StyleSheet.create({
  t: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    letterSpacing: 2,
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },
});

export default function TodayWorkoutScreen({ navigation, route }: Props) {
  const dispatch = useAppDispatch();
  const { planDayId } = route.params;
  const plan = useAppSelector(s => s.workout.todayWorkout);
  const planLoading = useAppSelector(s => s.workout.todayWorkoutLoading);
  const planError = useAppSelector(s => s.workout.todayWorkoutError);
  const selectedPlanId = useAppSelector(s => s.workout.selectedPlanId);
  const logs = useAppSelector(s => s.workout.logs);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(loadPlanDayById(planDayId));
  }, [dispatch, planDayId, selectedPlanId]);

  useEffect(() => {
    if (!plan?.exercises?.length || plan.plan_day_id !== planDayId) {
      return;
    }
    for (const ex of plan.exercises) {
      dispatch(
        fetchProgressionForExercise({
          exerciseName: ex.name,
          rep_range: ex.rep_range,
          equipment: ex.equipment,
        }),
      );
    }
  }, [dispatch, plan?.plan_day_id, plan?.exercises, planDayId]);

  const headerRight = useCallback(() => <ElapsedTimer />, []);

  useLayoutEffect(() => {
    if (plan?.session_type != null && plan.plan_day_id === planDayId) {
      const title = `SESSION: ${plan.session_type}`.toUpperCase();
      navigation.setOptions({
        title,
        headerTitle: title,
        headerRight,
      });
    } else {
      navigation.setOptions({
        title: 'SESSION',
        headerTitle: 'SESSION',
        headerRight,
      });
    }
  }, [navigation, plan?.plan_day_id, plan?.session_type, planDayId, headerRight]);

  const openExercise = (exercise: Exercise) => {
    hapticLight();
    navigation.navigate('ExerciseLogging', { exercise });
  };

  const setsDone = useCallback(
    (exerciseId: string) =>
      logs.filter(l => l.exerciseId === exerciseId && l.supabaseId).length,
    [logs],
  );

  if (planLoading) {
    return (
      <CrtScreen flicker={false}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.muted}>LOADING SESSION…</Text>
        </View>
      </CrtScreen>
    );
  }

  if (planError) {
    return (
      <CrtScreen flicker={false}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.err}>{planError}</Text>
        </ScrollView>
      </CrtScreen>
    );
  }

  if (!plan || plan.plan_day_id !== planDayId) {
    return (
      <CrtScreen flicker={false}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.muted}>SESSION NOT FOUND.</Text>
        </ScrollView>
      </CrtScreen>
    );
  }

  const dateStr = localDateKey(new Date());

  return (
    <CrtScreen flicker={false}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.subHead}>
          {dateStr} · {plan.exercises.length} MOVEMENTS
        </Text>

        <View style={styles.warmup}>
          <Text style={styles.warmupLabel}>WARMUP</Text>
          <Text style={styles.warmupBody}>{plan.warmup}</Text>
          <Text style={styles.duration}>TARGET {plan.duration_minutes} MIN</Text>
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.section}>LIFTS</Text>
          <Pressable onPress={() => navigation.navigate('WorkoutSessionSummary')}>
            <Text style={styles.link}>SUMMARY</Text>
          </Pressable>
        </View>

        {plan.exercises.map(exercise => {
          const done = setsDone(exercise.id);
          const expanded = expandedId === exercise.id;
          const current = logs.find(
            l => l.exerciseId === exercise.id && !l.supabaseId,
          );
          const w = current?.weight ?? null;
          const r = current?.reps ?? null;
          const rightMeta = `${exercise.sets} X ${exercise.rep_range} · LAST WT —`;
          return (
            <ProgressRow
              key={exercise.id}
              title={exercise.name}
              subtitleRight={rightMeta}
              setsLogged={done}
              setsTotal={exercise.sets}
              expanded={expanded}
              onPress={() => {
                hapticLight();
                setExpandedId(expanded ? null : exercise.id);
              }}>
              <Text style={styles.expandHint}>
                DRAFT {w != null ? `${w} KG` : '—'} · {r != null ? `${r} REPS` : '—'}
              </Text>
              <HardwareButton
                label="Log sets"
                onPress={() => openExercise(exercise)}
                style={styles.panelBtn}
              />
            </ProgressRow>
          );
        })}

        <View style={styles.finisher}>
          <Text style={styles.finisherLabel}>CARDIO FINISHER — {plan.cardio_finisher.title}</Text>
          <Text style={styles.muted}>{plan.cardio_finisher.duration_minutes} MIN</Text>
          <Text style={styles.finisherBody}>{plan.cardio_finisher.instructions}</Text>
        </View>
      </ScrollView>
    </CrtScreen>
  );
}

const styles = StyleSheet.create({
  pad: {
    paddingBottom: spacing(4),
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(3),
  },
  muted: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing(1),
    letterSpacing: 1,
  },
  err: {
    fontFamily: fontFamily.regular,
    color: colors.danger,
    fontSize: 12,
  },
  subHead: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.textMuted,
    marginBottom: spacing(2),
  },
  warmup: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing(2),
    marginBottom: spacing(2),
    backgroundColor: colors.surface,
  },
  warmupLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: crt.labelLetterSpacing,
    color: colors.textMuted,
    marginBottom: 8,
  },
  warmupBody: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  duration: {
    marginTop: spacing(1),
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.accentSecondary,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(1),
  },
  section: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.text,
  },
  link: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.accent,
  },
  expandHint: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: spacing(2),
  },
  panelBtn: {
    marginTop: spacing(1),
  },
  finisher: {
    marginTop: spacing(2),
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing(2),
  },
  finisherLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.text,
    marginBottom: 4,
  },
  finisherBody: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing(1),
    lineHeight: 16,
  },
});
