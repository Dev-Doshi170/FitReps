import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { HardwareButton, ToggleSwitch } from '../components/crt';
import { hapticLight, hapticMedium } from '../lib/haptics';
import { getExerciseSessionHistory, type ExerciseSessionGroup } from '../lib/progressionService';
import type { ProgressionFlag, ProgressionRecommendation } from '../lib/progressionTypes';
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

function isBodyweightEquipment(equipment: string): boolean {
  const e = equipment.toLowerCase();
  return (
    (e.includes('body') && e.includes('weight')) ||
    e.includes('bodyweight') ||
    e.includes('calisthen')
  );
}

function flagPill(
  flag: ProgressionFlag,
): { label: string; borderColor: string; textColor: string } {
  switch (flag) {
    case 'increase_weight':
      return { label: 'UP WEIGHT', borderColor: colors.accent, textColor: colors.accent };
    case 'increase_reps':
      return { label: 'ADD REPS', borderColor: colors.accentTertiary, textColor: colors.accentTertiary };
    case 'maintain':
      return { label: 'HOLD', borderColor: colors.textMuted, textColor: colors.textMuted };
    case 'deload':
      return { label: 'DELOAD', borderColor: colors.accentSecondary, textColor: colors.accentSecondary };
    default:
      return { label: 'STEADY', borderColor: colors.textMuted, textColor: colors.textMuted };
  }
}

function formatHistoryDate(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function parseWeightDraft(raw: string): number | null {
  const t = raw.trim().replace(',', '.');
  if (t === '') {
    return null;
  }
  const n = parseFloat(t);
  return Number.isNaN(n) ? null : n;
}

function parseRepsDraft(raw: string): number | null {
  const t = raw.trim();
  if (t === '') {
    return null;
  }
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
}

function nextSessionNumbers(rec: ProgressionRecommendation, useLb: boolean) {
  const w = rec.nextWeight;
  if (w == null) {
    return { line: `${rec.nextRepsTarget} reps` };
  }
  const display = useLb ? Math.round(w * LB * 10) / 10 : Math.round(w * 10) / 10;
  const unit = useLb ? 'lb' : 'kg';
  return {
    line: `${display} ${unit} × ${rec.nextRepsTarget} reps`,
  };
}

export default function ExerciseLoggingScreen({ navigation, route }: Props) {
  const { exercise } = route.params;
  const dispatch = useAppDispatch();
  const userId = useAppSelector(s => s.auth.session?.user.id);
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
  const hasPriorSession = lastData.length > 0;
  const startHint = useAppSelector(
    s => s.workout.startSuggestionByExercise[exercise.name],
  );

  const [useLb, setUseLb] = useState(false);
  const [weightFocused, setWeightFocused] = useState(false);
  const [weightDraft, setWeightDraft] = useState('');
  const [repsFocused, setRepsFocused] = useState(false);
  const [repsDraft, setRepsDraft] = useState('');
  const [awaitingRpe, setAwaitingRpe] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<ExerciseSessionGroup[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const finalizedRef = useRef(false);

  const isBw = useMemo(() => isBodyweightEquipment(exercise.equipment), [exercise.equipment]);

  useEffect(() => {
    dispatch(selectExercise(exercise));
  }, [dispatch, exercise]);

  useEffect(() => {
    dispatch(
      fetchProgressionForExercise({
        exerciseName: exercise.name,
        rep_range: exercise.rep_range,
        equipment: exercise.equipment,
      }),
    );
  }, [dispatch, exercise.name, exercise.rep_range, exercise.equipment]);

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

  const firstSessionReps = useCallback(() => {
    if (startHint == null || hasPriorSession || !progression) {
      return null;
    }
    return startHint.reps;
  }, [startHint, hasPriorSession, progression]);

  const sessionRepsForSet = useCallback(
    (setNumber: number) => {
      if (!progression) {
        return 0;
      }
      const lr = lastForSet(setNumber).reps;
      if (lr != null) {
        return lr;
      }
      const h = firstSessionReps();
      if (h != null) {
        return h;
      }
      return progression.currentRepsTarget;
    },
    [firstSessionReps, lastForSet, progression],
  );

  const nextSessionInfo = useMemo(
    () => (recommendation != null ? nextSessionNumbers(recommendation, useLb) : null),
    [recommendation, useLb],
  );

  /** Logged last time often has weight when `progression_state` still has null (e.g. bodyweight-typed work with assistance). */
  const effectiveTargetWeight = useCallback(
    (setNumber: number) => {
      if (!progression) {
        return null;
      }
      const fromLast = lastForSet(setNumber).weight;
      if (fromLast != null) {
        return fromLast;
      }
      if (!hasPriorSession && startHint?.weight != null) {
        return startHint.weight;
      }
      return progression.currentWeight;
    },
    [lastForSet, hasPriorSession, startHint, progression],
  );

  const activeSet = useMemo(() => {
    for (let i = 1; i <= exercise.sets; i += 1) {
      if (!getLog(i)?.supabaseId) {
        return i;
      }
    }
    return exercise.sets;
  }, [exercise.sets, getLog]);

  const targetHeadline = useMemo(() => {
    if (!progression) {
      return null;
    }
    const r = sessionRepsForSet(activeSet);
    const w = effectiveTargetWeight(activeSet);
    if (w == null) {
      return { line: `${r} reps` };
    }
    const dw = useLb ? Math.round(w * LB * 10) / 10 : Math.round(w * 10) / 10;
    const u = useLb ? 'lb' : 'kg';
    return { line: `${dw} ${u} × ${r} reps` };
  }, [activeSet, effectiveTargetWeight, progression, sessionRepsForSet, useLb]);

  const applyPlanTargetToActiveSet = useCallback(() => {
    if (!progression) {
      return;
    }
    dispatch(
      updateSetLog({
        exerciseId: exercise.id,
        setNumber: activeSet,
        reps: sessionRepsForSet(activeSet),
        weight: effectiveTargetWeight(activeSet),
      }),
    );
    hapticLight();
  }, [activeSet, dispatch, exercise.id, effectiveTargetWeight, progression, sessionRepsForSet]);

  /** Merge last-session weight when progression has no row yet; re-run when `last` finishes loading. */
  useEffect(() => {
    if (lastLoading || progressionLoading || !progression) {
      return;
    }
    for (let setNumber = 1; setNumber <= exercise.sets; setNumber += 1) {
      const existing = exerciseLogs.find(l => l.setNumber === setNumber);
      if (existing?.supabaseId) {
        continue;
      }
      const last = lastForSet(setNumber);
      const finalReps =
        existing != null && existing.reps != null
          ? existing.reps
          : last.reps != null
            ? last.reps
            : !hasPriorSession && startHint
              ? startHint.reps
              : progression.currentRepsTarget;
      const finalWeight =
        existing != null && existing.weight != null
          ? existing.weight
          : last.weight != null
            ? last.weight
            : !hasPriorSession && startHint?.weight != null
              ? startHint.weight
              : progression.currentWeight;

      const noChange =
        existing != null &&
        existing.reps === finalReps &&
        (existing.weight === finalWeight || (existing.weight == null && finalWeight == null));
      if (noChange) {
        continue;
      }

      dispatch(
        updateSetLog({
          exerciseId: exercise.id,
          setNumber,
          reps: finalReps,
          weight: finalWeight,
        }),
      );
    }
  }, [
    dispatch,
    exercise.id,
    exercise.sets,
    exerciseLogs,
    lastForSet,
    hasPriorSession,
    lastLoading,
    progression,
    progressionLoading,
    startHint,
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

  const loadSessionHistory = useCallback(async () => {
    if (!userId) {
      return;
    }
    setHistoryLoading(true);
    try {
      const rows = await getExerciseSessionHistory(userId, exercise.name, 16);
      setSessionHistory(rows);
    } catch {
      setSessionHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [userId, exercise.name]);

  useEffect(() => {
    loadSessionHistory();
  }, [loadSessionHistory]);

  useEffect(() => {
    if (allSetsSynced) {
      loadSessionHistory();
    }
  }, [allSetsSynced, loadSessionHistory]);

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
    if (row?.reps == null) {
      Alert.alert('Incomplete', 'Set reps before logging.');
      return;
    }
    if (!isBw && row?.weight == null) {
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

  const repsDisplay = String(reps);

  useEffect(() => {
    if (weightFocused) {
      setWeightDraft(weightLabel);
    }
  }, [weightLabel, weightFocused]);

  useEffect(() => {
    if (repsFocused) {
      setRepsDraft(repsDisplay);
    }
  }, [repsDisplay, repsFocused]);

  useEffect(() => {
    setWeightFocused(false);
    setRepsFocused(false);
  }, [activeSet]);

  return (
    <View style={styles.root}>
      {sessionDeload ? (
        <View style={styles.warn}>
          <Text style={styles.warnText}>DELOAD SIGNAL — CHECK RECOMMENDATION.</Text>
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}>
        <Text style={styles.h1}>{exercise.name}</Text>
        <Text style={styles.lastLine}>Last: {lastLine}</Text>

        {!progressionLoading && progression != null && targetHeadline != null ? (
          <View style={styles.targetCard}>
            <Text style={styles.targetTitle}>Aim for this log</Text>
            <Text style={styles.targetHeadline}>{targetHeadline.line}</Text>
            <Text style={styles.targetRange}>
              Range {progression.repRangeMin}–{progression.repRangeMax} · {exercise.rep_range}
            </Text>
            {allSetsSynced ? null : (
              <Pressable
                onPress={applyPlanTargetToActiveSet}
                style={({ pressed }) => [styles.targetApply, pressed && styles.targetApplyPressed]}
                accessibilityRole="button"
                accessibilityLabel="Apply plan target to active set">
                <Text style={styles.targetApplyText}>Use target on set {activeSet}</Text>
              </Pressable>
            )}
          </View>
        ) : progressionLoading ? (
          <Text style={styles.progLoadingText}>Loading progression…</Text>
        ) : null}

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
              <View
                style={[styles.stepperValueWrap, weightFocused && styles.stepperValueWrapFocused]}>
                <TextInput
                  style={styles.stepperInput}
                  value={weightFocused ? weightDraft : weightLabel}
                  onChangeText={setWeightDraft}
                  onFocus={() => {
                    setWeightFocused(true);
                    setWeightDraft(weightLabel);
                  }}
                  onBlur={() => {
                    setWeightFocused(false);
                    const trimmed = weightDraft.trim();
                    const parsed = parseWeightDraft(weightDraft);
                    if (trimmed === '') {
                      dispatch(
                        updateSetLog({
                          exerciseId: exercise.id,
                          setNumber: activeSet,
                          reps: current?.reps ?? null,
                          weight: null,
                        }),
                      );
                      return;
                    }
                    if (parsed == null) {
                      return;
                    }
                    const clamped = Math.min(wMax, Math.max(wMin, parsed));
                    setWeightFromKnob(clamped);
                  }}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.accent}
                  underlineColorAndroid="transparent"
                  accessibilityLabel="Weight"
                />
              </View>
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
              <View style={[styles.stepperValueWrap, repsFocused && styles.stepperValueWrapFocused]}>
                <TextInput
                  style={styles.stepperInput}
                  value={repsFocused ? repsDraft : repsDisplay}
                  onChangeText={setRepsDraft}
                  onFocus={() => {
                    setRepsFocused(true);
                    setRepsDraft(repsDisplay);
                  }}
                  onBlur={() => {
                    setRepsFocused(false);
                    const trimmed = repsDraft.trim();
                    const parsed = parseRepsDraft(repsDraft);
                    if (trimmed === '') {
                      dispatch(
                        updateSetLog({
                          exerciseId: exercise.id,
                          setNumber: activeSet,
                          reps: null,
                          weight: current?.weight ?? null,
                        }),
                      );
                      return;
                    }
                    if (parsed == null) {
                      return;
                    }
                    const clamped = Math.min(50, Math.max(1, parsed));
                    setRepsFromKnob(clamped);
                  }}
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.accent}
                  underlineColorAndroid="transparent"
                  accessibilityLabel="Reps"
                />
              </View>
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

        <Pressable
          onPress={() => {
            hapticLight();
            setHistoryOpen(h => !h);
          }}
          style={({ pressed }) => [styles.historyHeader, pressed && styles.historyHeaderOn]}
          accessibilityRole="button"
          accessibilityState={{ expanded: historyOpen }}
          accessibilityLabel="Toggle previous sessions">
          <Text style={styles.historyHeaderText}>
            {historyOpen ? '▼' : '▶'}  Previous sessions
          </Text>
          {historyLoading ? <Text style={styles.historyMeta}>loading</Text> : null}
        </Pressable>
        {historyOpen ? (
          <View style={styles.historyBody}>
            {sessionHistory.length === 0 && !historyLoading ? (
              <Text style={styles.historyEmpty}>No past logs for this lift yet.</Text>
            ) : null}
            {sessionHistory.map(sess => (
              <View key={sess.dateKey} style={styles.historySess}>
                <Text style={styles.historyDate}>{formatHistoryDate(sess.dateKey)}</Text>
                {sess.sets.map(s => (
                  <Text
                    key={`${sess.dateKey}-${s.setNumber}`}
                    style={styles.historySetLine}>
                    {s.setNumber}. {s.weight != null ? `${s.weight} kg` : '—'} × {s.reps ?? '—'}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {recommendation != null && nextSessionInfo != null ? (
          <View style={styles.nextSessionCard}>
            <View style={styles.nextRow}>
              <Text style={styles.nextSessionTitle}>Next session</Text>
              {recommendation.flag != null && (
                <View
                  style={[
                    styles.flagPill,
                    { borderColor: flagPill(recommendation.flag).borderColor },
                  ]}>
                  <Text
                    style={[styles.flagPillText, { color: flagPill(recommendation.flag).textColor }]}>
                    {flagPill(recommendation.flag).label}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.nextNumbers}>{nextSessionInfo.line}</Text>
          </View>
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
  stepperValueWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    borderBottomWidth: 0,
  },
  stepperValueWrapFocused: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderActive,
  },
  stepperInput: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
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
  targetCard: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    padding: spacing(1.5),
    marginBottom: spacing(2),
    gap: 8,
  },
  targetTitle: {
    fontFamily: fontFamily.bold,
    fontSize: crt.labelFontSize,
    letterSpacing: 2,
    color: colors.textMuted,
  },
  targetHeadline: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.accent,
  },
  targetRange: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.text,
  },
  targetNote: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  targetApply: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceElevated,
  },
  targetApplyPressed: {
    backgroundColor: colors.activeTint,
  },
  targetApplyText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.accent,
  },
  progLoadingText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing(1.5),
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing(1.25),
    marginBottom: 0,
    backgroundColor: colors.surface,
  },
  historyHeaderOn: {
    borderColor: colors.textMuted,
  },
  historyHeaderText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.text,
  },
  historyMeta: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.textMuted,
  },
  historyBody: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.borderSubtle,
    padding: spacing(1.5),
    marginBottom: spacing(2),
    backgroundColor: colors.bg,
    gap: spacing(1.5),
  },
  historyEmpty: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  historySess: {
    gap: 4,
  },
  historyDate: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.accentSecondary,
  },
  historySetLine: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.text,
    marginLeft: 4,
  },
  nextSessionCard: {
    marginTop: spacing(1),
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing(1.5),
    backgroundColor: colors.activeTint,
    gap: 8,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  nextSessionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.text,
  },
  flagPill: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  flagPillText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
  },
  nextNumbers: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.accent,
  },
  nextSub: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.textMuted,
  },
  nextBlurb: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  alertBox: {
    borderWidth: 1,
    borderColor: colors.accentSecondary,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    padding: spacing(1),
  },
  alertText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  footer: {
    padding: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
});
