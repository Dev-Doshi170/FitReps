import {
  useFocusEffect,
  useNavigation,
  type CompositeNavigationProp,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CrtScreen, HardwareButton, TapeReel } from '../components/crt';
import { buildTapeDays } from '../lib/weekTape';
import { hapticLight } from '../lib/haptics';
import type { AppStackParamList, MainTabParamList } from '../navigation/AppNavigator';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchDashboardPlanSessions,
  fetchHistory,
  fetchTodayBodyWeight,
  localDateKey,
  saveTodayBodyWeight,
} from '../store/slices/workoutSlice';
import { colors, crt, fontFamily, phosphorTextShadow, spacing } from '../theme/theme';

function sanitizeWeightDraft(raw: string): string {
  const withDot = raw.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const i = withDot.indexOf('.');
  if (i === -1) {
    return withDot;
  }
  return withDot.slice(0, i + 1) + withDot.slice(i + 1).replace(/\./g, '');
}

type DashboardNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<AppStackParamList>
>;

function formatLastPerformed(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return datePart;
}

function computeStreakFromHistory(dates: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = localDateKey(cursor);
    if (!dates.has(key)) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardNav>();
  const dispatch = useAppDispatch();
  const planSessionCards = useAppSelector(s => s.workout.planSessionCards);
  const planSessionsLoading = useAppSelector(s => s.workout.planSessionsLoading);
  const planSessionsError = useAppSelector(s => s.workout.planSessionsError);
  const lastPerformedByPlanDayId = useAppSelector(s => s.workout.lastPerformedByPlanDayId);
  const activePlanName = useAppSelector(s => s.workout.activePlanName);
  const selectedPlanId = useAppSelector(s => s.workout.selectedPlanId);
  const history = useAppSelector(s => s.workout.history);
  const todayBodyWeight = useAppSelector(s => s.workout.todayBodyWeight);
  const bodyWeightLoading = useAppSelector(s => s.workout.bodyWeightLoading);
  const bodyWeightError = useAppSelector(s => s.workout.bodyWeightError);
  const [weightDraft, setWeightDraft] = useState('');
  const [weightInputError, setWeightInputError] = useState<string | null>(null);
  const todayKey = localDateKey(new Date());
  const weightLocked = todayBodyWeight != null;

  const streak = useMemo(() => {
    const days = new Set(history.map(h => h.date));
    return computeStreakFromHistory(days);
  }, [history]);

  const tapeDays = useMemo(() => buildTapeDays(history), [history]);

  const heroCard = planSessionCards[0];
  const heroLastIso = heroCard ? lastPerformedByPlanDayId[heroCard.planDayId] : undefined;

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchDashboardPlanSessions());
    }, [dispatch]),
  );

  useEffect(() => {
    dispatch(fetchHistory());
    dispatch(fetchTodayBodyWeight());
  }, [dispatch, selectedPlanId]);

  useEffect(() => {
    if (todayBodyWeight != null) {
      setWeightDraft(String(todayBodyWeight));
    }
  }, [todayBodyWeight]);

  const saveWeight = () => {
    hapticLight();
    setWeightInputError(null);
    const normalized = weightDraft.trim().replace(',', '.');
    const w = parseFloat(normalized);
    if (normalized === '' || Number.isNaN(w) || w <= 0 || w > 500) {
      setWeightInputError('Enter a number between 0 and 500.');
      return;
    }
    dispatch(saveTodayBodyWeight(w));
  };

  const bumpWeight = (delta: number) => {
    hapticLight();
    const base = parseFloat(weightDraft.replace(',', '.')) || 0;
    const next = Math.round((base + delta) * 10) / 10;
    if (next > 0 && next <= 500) {
      setWeightDraft(String(next));
    }
  };

  const planLabel = (activePlanName ?? 'ACTIVE PLAN').toUpperCase();
  const dayLabel = heroCard
    ? `${heroCard.sessionType} ${heroCard.focus}`.toUpperCase()
    : 'NO SESSION';

  return (
    <CrtScreen flicker>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}>
        <View style={styles.statusStrip}>
          <Text style={styles.statusText} numberOfLines={1}>
            STREAK: {streak} DAYS
          </Text>
          <Text style={styles.pipe}>|</Text>
          <View style={styles.planRow}>
            <View style={styles.blinkDot} />
            <Text style={styles.statusText} numberOfLines={1}>
              PLAN: {planLabel}
            </Text>
          </View>
          <Text style={styles.pipe}>|</Text>
          <Text style={styles.statusText} numberOfLines={1}>
            DAY: {dayLabel}
          </Text>
        </View>

        <View style={styles.fullBleedH}>
          <TapeReel days={tapeDays} />
        </View>

        {planSessionsLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>LOADING PLAN…</Text>
          </View>
        ) : planSessionsError ? (
          <View style={styles.box}>
            <Text style={styles.err}>{planSessionsError}</Text>
          </View>
        ) : !heroCard ? (
          <View style={styles.box}>
            <Text style={styles.muted}>NO SESSIONS FOR ACTIVE PLAN.</Text>
          </View>
        ) : (
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <Text style={styles.heroTitle}>
                {(heroCard.sessionType + ' DAY').toUpperCase()}
              </Text>
              <View style={styles.clockRow}>
                <Text style={styles.clockIcon}>[</Text>
                <Text style={styles.lastDate}>
                  {heroLastIso ? formatLastPerformed(heroLastIso) : 'NEVER'}
                </Text>
              </View>
            </View>
            <Text style={styles.heroFocus}>{heroCard.focus}</Text>
            <ScrollView
              horizontal
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pills}>
              {heroCard.exerciseNames.map((name, i) => (
                <View key={`${name}-${i}`} style={styles.pill}>
                  <Text style={styles.pillText} numberOfLines={1}>
                    {name}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <HardwareButton
              label="START SESSION"
              onPress={() => {
                hapticLight();
                navigation.navigate('TodayWorkout', { planDayId: heroCard.planDayId });
              }}
              style={styles.startBtn}
            />
          </View>
        )}

        <Text style={styles.sectionLabel}>FORM & POSTURE /</Text>
        <HardwareButton
          label="OPEN FORM TRACKER"
          variant="outlined"
          onPress={() => {
            hapticLight();
            navigation.navigate('FormTracking');
          }}
          style={styles.formTrackBtn}
        />

        <Text style={styles.sectionLabel}>BODY MASS /</Text>
        <View style={styles.bodyMassRow}>
          <TextInput
            style={[
              styles.bodyMassInput,
              weightLocked ? styles.bodyMassInputLocked : phosphorTextShadow,
            ]}
            value={weightLocked ? String(todayBodyWeight ?? '') : weightDraft}
            onChangeText={t => {
              if (weightLocked) {
                return;
              }
              setWeightDraft(sanitizeWeightDraft(t));
              setWeightInputError(null);
            }}
            editable={!weightLocked}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor={colors.textMuted}
            underlineColorAndroid="transparent"
            maxLength={8}
            accessibilityLabel="Body mass in kilograms"
          />
          <View style={styles.massActions}>
            <Pressable
              onPress={() => bumpWeight(-0.5)}
              disabled={weightLocked}
              style={({ pressed }) => [styles.squareBtn, pressed && styles.squareBtnPressed]}>
              <Text style={styles.squareBtnText}>-</Text>
            </Pressable>
            <Pressable
              onPress={() => bumpWeight(0.5)}
              disabled={weightLocked}
              style={({ pressed }) => [styles.squareBtn, pressed && styles.squareBtnPressed]}>
              <Text style={styles.squareBtnText}>+</Text>
            </Pressable>
            {!weightLocked ? (
              <HardwareButton
                label="LOG"
                variant="outlined"
                onPress={saveWeight}
                disabled={bodyWeightLoading}
                style={styles.logBtn}
              />
            ) : null}
          </View>
        </View>
        {weightInputError ? <Text style={styles.err}>{weightInputError}</Text> : null}
        {bodyWeightError ? <Text style={styles.err}>{bodyWeightError}</Text> : null}
        <Text style={styles.dateHint}>
          {todayKey}
          {weightLocked ? ' · LOGGED' : ''}
        </Text>

        <Pressable onPress={() => navigation.navigate('WeightHistory')} style={styles.link}>
          <Text style={styles.linkText}>OPEN MASS ARCHIVE</Text>
        </Pressable>

        {planSessionCards.length > 1 ? (
          <>
            <Text style={styles.sectionLabel}>OTHER SESSIONS</Text>
            {planSessionCards.slice(1).map(card => {
              const lastIso = lastPerformedByPlanDayId[card.planDayId];
              return (
                <View key={card.planDayId} style={styles.altRow}>
                  <Text style={styles.altTitle}>{card.sessionType.toUpperCase()}</Text>
                  <Text style={styles.altMeta}>
                    {lastIso ? formatLastPerformed(lastIso) : '—'}
                  </Text>
                  <HardwareButton
                    label="OPEN"
                    variant="outlined"
                    onPress={() => {
                      hapticLight();
                      navigation.navigate('TodayWorkout', { planDayId: card.planDayId });
                    }}
                    style={styles.altBtn}
                  />
                </View>
              );
            })}
          </>
        ) : null}
      </ScrollView>
    </CrtScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing(4),
    paddingHorizontal: spacing(2),
  },
  fullBleedH: {
    marginHorizontal: -spacing(2),
  },
  statusStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing(1),
    marginBottom: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  statusText: {
    fontFamily: fontFamily.regular,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.textMuted,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  pipe: {
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    fontSize: 9,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '40%',
  },
  blinkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentTertiary,
  },
  loadingBox: {
    padding: spacing(3),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  loadingText: {
    marginTop: spacing(1),
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 2,
  },
  box: {
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  err: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
  },
  muted: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  hero: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing(2),
    marginBottom: spacing(2),
    backgroundColor: colors.surface,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing(1),
  },
  heroTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.text,
    flex: 1,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clockIcon: {
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    fontSize: 10,
  },
  lastDate: {
    fontFamily: fontFamily.regular,
    fontSize: 9,
    color: colors.textMuted,
    maxWidth: 120,
  },
  heroFocus: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: spacing(1),
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing(2),
    flexWrap: 'wrap',
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 140,
    backgroundColor: colors.bg,
  },
  pillText: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.text,
  },
  startBtn: {
    width: '100%',
  },
  formTrackBtn: {
    width: '100%',
    marginBottom: spacing(2),
  },
  sectionLabel: {
    fontFamily: fontFamily.regular,
    fontSize: crt.labelFontSize,
    letterSpacing: crt.labelLetterSpacing,
    color: colors.textMuted,
    marginBottom: spacing(1),
    marginTop: spacing(1),
  },
  bodyMassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing(2),
    marginBottom: spacing(1),
  },
  bodyMassInput: {
    flex: 1,
    minWidth: 120,
    minHeight: 44,
    fontFamily: fontFamily.bold,
    fontSize: 32,
    letterSpacing: 6,
    fontVariant: ['tabular-nums'],
    color: colors.accent,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  bodyMassInputLocked: {
    color: colors.textMuted,
    textShadowRadius: 0,
  },
  massActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  squareBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopColor: colors.textMuted,
    borderLeftColor: colors.textMuted,
    borderRightColor: colors.bg,
    borderBottomColor: colors.bg,
  },
  squareBtnPressed: {
    borderColor: colors.accent,
  },
  squareBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.accent,
  },
  logBtn: {
    minWidth: 72,
    minHeight: 44,
    paddingHorizontal: spacing(1),
  },
  dateHint: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.textMuted,
  },
  link: {
    marginTop: spacing(1),
    paddingVertical: spacing(1),
  },
  linkText: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.accentSecondary,
  },
  altRow: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing(1.5),
    marginBottom: spacing(1),
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  altTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
  altMeta: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.textMuted,
    flexBasis: '40%',
  },
  altBtn: {
    minHeight: 36,
    paddingHorizontal: spacing(1),
  },
});
