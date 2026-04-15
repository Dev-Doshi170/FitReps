import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HardwareButton, ToggleSwitch } from '../components/crt';
import { hapticLight, hapticMedium } from '../lib/haptics';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { useLastPerformance } from '../hooks/useLastPerformance';
import { useAppDispatch, useAppSelector } from '../store';
import type { RPEValue } from '../store/slices/workoutSlice';
import {
  completeSetLog,
  fetchProgressionForExercise,
  recordExerciseProgression,
  saveWorkout,
  selectExercise,
  updateSetLog,
} from '../store/slices/workoutSlice';
import { colors, crt, fontFamily, spacing } from '../theme/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ExerciseLogging'>;

const LB = 2.2046226218;

export default function ExerciseLoggingScreen({ navigation, route }: Props) {
  const { exercise } = route.params;
  const dispatch = useAppDispatch();
  const logs = useAppSelector(s => s.workout.logs);
  const saving = useAppSelector(s => s.workout.loading);
  const sessionDeload = useAppSelector(s => s.workout.sessionDeload);
  const recommendation = useAppSelector(
    s => s.workout.sessionRecommendations?.[exercise.name],
  );
  const progression = useAppSelector(
    s => s.workout.progressionByExercise?.[exercise.name],
  );
  const progressionLoading = useAppSelector(
    s => s.workout.progressionLoading?.[exercise.name] ?? false,
  );

  const { data: lastData, loading: lastLoading } = useLastPerformance(exercise.name);

  const [useLb, setUseLb] = useState(false);
  const [awaitingRpe, setAwaitingRpe] = useState(false);
  const finalizedRef = useRef(false);

  useEffect(() => {
    dispatch(selectExercise(exercise));
  }, [dispatch, exercise]);

  useEffect(() => {
    dispatch(
      fetchProgressionForExercise({
        exerciseName: exercise.name,
        rep_range: exercise.rep_range,
      }),
    );
  }, [dispatch, exercise.name, exercise.rep_range]);

  const exerciseLogs = useMemo(
    () => logs.filter(l => l.exerciseId === exercise.id),
    [exercise.id, logs],
  );

  const getLog = useCallback(
    (setNumber: number) => exerciseLogs.find(l => l.setNumber === setNumber),
    [exerciseLogs],
  );

  const lastForSet = useCallback(
    (setNumber: number) => {
      const row = lastData.find(l => l.setNumber === setNumber);
      return {
        reps: row?.reps ?? null,
        weight: row?.weight ?? null,
      };
    },
    [lastData],
  );

  const activeSet = useMemo(() => {
    for (let i = 1; i <= exercise.sets; i += 1) {
      if (!getLog(i)?.supabaseId) {
        return i;
      }
    }
    return exercise.sets;
  }, [exercise.sets, getLog]);

  const didPrefill = useRef(false);
  useEffect(() => {
    if (lastLoading || progressionLoading || !progression) {
      return;
    }
    if (didPrefill.current) {
      return;
    }
    didPrefill.current = true;
    for (let setNumber = 1; setNumber <= exercise.sets; setNumber += 1) {
      const existing = exerciseLogs.find(l => l.setNumber === setNumber);
      if (existing?.reps != null || existing?.weight != null) {
        continue;
      }
      const last = lastForSet(setNumber);
      dispatch(
        updateSetLog({
          exerciseId: exercise.id,
          setNumber,
          reps: progression.currentRepsTarget,
          weight: last.weight ?? progression.currentWeight,
        }),
      );
    }
  }, [
    dispatch,
    exercise.id,
    exercise.sets,
    exerciseLogs,
    lastForSet,
    lastLoading,
    progression,
    progressionLoading,
  ]);

  const allSetsSynced = useMemo(() => {
    for (let i = 1; i <= exercise.sets; i += 1) {
      const row = getLog(i);
      if (!row?.supabaseId) {
        return false;
      }
    }
    return true;
  }, [exercise.sets, getLog]);

  useEffect(() => {
    if (!allSetsSynced) {
      finalizedRef.current = false;
      return;
    }
    if (finalizedRef.current) {
      return;
    }
    finalizedRef.current = true;
    dispatch(recordExerciseProgression(exercise));
  }, [allSetsSynced, dispatch, exercise]);

  const onSave = useCallback(async () => {
    const resultAction = await dispatch(saveWorkout());
    if (saveWorkout.fulfilled.match(resultAction)) {
      Alert.alert('Saved', 'Workout logged successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Save failed', String(resultAction.payload ?? 'Unknown error'));
    }
  }, [dispatch, navigation]);

  const current = getLog(activeSet);
  const kg = current?.weight ?? 0;
  const reps = current?.reps ?? 0;

  const displayWeight = useLb ? kg * LB : kg;
  const wMin = useLb ? 0 : 0;
  const wMax = useLb ? 500 : 220;
  const wStep = useLb ? 2.5 : 1;

  const setWeightFromKnob = (v: number) => {
    const kgVal = useLb ? v / LB : v;
    dispatch(
      updateSetLog({
        exerciseId: exercise.id,
        setNumber: activeSet,
        reps: current?.reps ?? null,
        weight: Math.round(kgVal * 10) / 10,
      }),
    );
  };

  const setRepsFromKnob = (v: number) => {
    dispatch(
      updateSetLog({
        exerciseId: exercise.id,
        setNumber: activeSet,
        reps: Math.round(v),
        weight: current?.weight ?? null,
      }),
    );
  };

  const bumpWeight = (delta: number) => {
    const next = Math.round((displayWeight + delta) * 10) / 10;
    const clamped = Math.min(wMax, Math.max(wMin, next));
    setWeightFromKnob(clamped);
  };

  const bumpReps = (delta: number) => {
    const next = Math.min(50, Math.max(1, Math.round(reps + delta)));
    setRepsFromKnob(next);
  };

  const commitSet = (rpe: RPEValue | null) => {
    const row = getLog(activeSet);
    const r = row?.reps;
    if (r == null) {
      return;
    }
    hapticMedium();
    dispatch(
      completeSetLog({
        exerciseId: exercise.id,
        setNumber: activeSet,
        reps: r,
        weight: row?.weight ?? null,
        rpe,
      }),
    );
    setAwaitingRpe(false);
  };

  const onLogSetPress = () => {
    if (awaitingRpe) {
      return;
    }
    const row = getLog(activeSet);
    if (row?.supabaseId) {
      return;
    }
    if (row?.reps == null || row?.weight == null) {
      Alert.alert('Incomplete', 'Set weight and reps before logging.');
      return;
    }
    hapticLight();
    setAwaitingRpe(true);
  };

  const last = lastForSet(activeSet);
  const lastLine =
    last.weight != null || last.reps != null
      ? `${last.weight ?? '—'} KG × ${last.reps ?? '—'}`
      : 'no prior data';

  const weightLabel =
    displayWeight === Math.round(displayWeight)
      ? String(Math.round(displayWeight))
      : String(Math.round(displayWeight * 10) / 10);

  return (
    <View style={styles.root}>
      {sessionDeload ? (
        <View style={styles.warn}>
          <Text style={styles.warnText}>DELOAD SIGNAL — CHECK RECOMMENDATION.</Text>
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>{exercise.name}</Text>
        <Text style={styles.lastLine}>Last: {lastLine}</Text>

        <View style={styles.panel}>
          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Weight ({useLb ? 'lb' : 'kg'})</Text>
            <View style={styles.stepperControls}>
              <Pressable
                onPress={() => bumpWeight(-wStep)}
                style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Decrease weight">
                <Text style={styles.stepperBtnText}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{weightLabel}</Text>
              <Pressable
                onPress={() => bumpWeight(wStep)}
                style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Increase weight">
                <Text style={styles.stepperBtnText}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.unitInline}>
            <Text style={styles.unitInlineText}>kg</Text>
            <ToggleSwitch value={useLb} onChange={setUseLb} />
            <Text style={styles.unitInlineText}>lb</Text>
          </View>

          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Reps</Text>
            <View style={styles.stepperControls}>
              <Pressable
                onPress={() => bumpReps(-1)}
                style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Decrease reps">
                <Text style={styles.stepperBtnText}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{reps}</Text>
              <Pressable
                onPress={() => bumpReps(1)}
                style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Increase reps">
                <Text style={styles.stepperBtnText}>+</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={onLogSetPress}
            style={({ pressed }) => [styles.logSetBtn, pressed && styles.logSetBtnPressed]}>
            <Text style={styles.logSetText}>Log set</Text>
          </Pressable>
        </View>

        {awaitingRpe ? (
          <View style={styles.rpeBox}>
            <Text style={styles.rpeTitle}>EFFORT</Text>
            <View style={styles.rpeRow}>
              {(['easy', 'medium', 'hard'] as const).map(k => (
                <Pressable
                  key={k}
                  onPress={() => commitSet(k)}
                  style={({ pressed }) => [styles.rpeBtn, pressed && styles.rpeBtnOn]}>
                  <Text style={styles.rpeBtnText}>{k.toUpperCase()}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => commitSet(null)} style={styles.rpeSkip}>
                <Text style={styles.rpeSkipText}>SKIP</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <Text style={styles.stripTitle}>Sets</Text>
        <View style={styles.setList}>
          {Array.from({ length: exercise.sets }, (_, i) => {
            const sn = i + 1;
            const row = getLog(sn);
            const done = Boolean(row?.supabaseId);
            const active = sn === activeSet && !done;
            return (
              <View
                key={sn}
                style={[styles.setRow, done && styles.setRowDone, active && styles.setRowActive]}>
                <Text style={[styles.setRowNum, active && styles.setRowCurrentText]}>{sn}</Text>
                <Text style={[styles.setRowBody, active && styles.setRowCurrentText]}>
                  {done && row?.weight != null && row?.reps != null
                    ? `${row.weight} kg × ${row.reps}`
                    : active
                      ? 'current'
                      : '—'}
                </Text>
              </View>
            );
          })}
        </View>

        {recommendation != null ? (
          <Text style={styles.recOneLine} numberOfLines={3}>
            Tip: {recommendation.recommendation}
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <HardwareButton label="Save workout" variant="outlined" onPress={onSave} disabled={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  warn: {
    padding: spacing(1.5),
    borderBottomWidth: 1,
    borderColor: colors.accentSecondary,
    backgroundColor: colors.surface,
  },
  warnText: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.accentSecondary,
    letterSpacing: 1,
  },
  scroll: {
    padding: spacing(2),
    paddingBottom: spacing(4),
  },
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  lastLine: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing(2),
  },
  panel: {
    gap: spacing(1.5),
    marginBottom: spacing(2),
    maxWidth: 360,
    alignSelf: 'center',
    width: '100%',
  },
  stepperRow: {
    gap: 8,
  },
  stepperLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stepperBtn: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  stepperBtnPressed: {
    borderColor: colors.accent,
    backgroundColor: colors.activeTint,
  },
  stepperBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: colors.text,
    lineHeight: 22,
  },
  stepperValue: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
  },
  unitInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'center',
  },
  unitInlineText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  logSetBtn: {
    marginTop: spacing(0.5),
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderTopColor: colors.textMuted,
    borderLeftColor: colors.textMuted,
    borderRightColor: '#050505',
    borderBottomColor: '#050505',
    backgroundColor: colors.surfaceElevated,
  },
  logSetBtnPressed: {
    borderColor: colors.accent,
  },
  logSetText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.accent,
  },
  rpeBox: {
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing(1.5),
    marginBottom: spacing(2),
    backgroundColor: colors.activeTint,
  },
  rpeTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.text,
    marginBottom: 8,
  },
  rpeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  rpeBtn: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  rpeBtnOn: {
    borderColor: colors.accent,
  },
  rpeBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.text,
  },
  rpeSkip: {
    padding: 8,
  },
  rpeSkipText: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  stripTitle: {
    fontFamily: fontFamily.regular,
    fontSize: crt.labelFontSize,
    color: colors.textMuted,
    marginBottom: 8,
  },
  setList: {
    gap: 6,
    marginBottom: spacing(2),
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  setRowDone: {
    borderColor: colors.accent,
  },
  setRowActive: {
    borderColor: colors.accentSecondary,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
  },
  setRowCurrentText: {
    color: colors.accentSecondary,
  },
  setRowNum: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.textMuted,
    width: 20,
  },
  setRowBody: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.text,
  },
  recOneLine: {
    marginTop: spacing(1),
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  footer: {
    padding: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
});
