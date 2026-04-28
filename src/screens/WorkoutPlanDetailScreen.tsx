import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CrtScreen, HardwareButton } from '../components/crt';
import type { AppStackParamList } from '../navigation/AppNavigator';
import {
  DEFAULT_PLAN_NAME,
  fetchPlanDetail,
  type WorkoutPlanDetail,
} from '../services/workoutPlan';
import { useAppDispatch, useAppSelector } from '../store';
import { setSelectedPlanId } from '../store/slices/workoutSlice';
import { colors, fontFamily, spacing } from '../theme/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'WorkoutPlanDetail'>;

export default function WorkoutPlanDetailScreen({ route }: Props) {
  const { planId, planName } = route.params;
  const dispatch = useAppDispatch();
  const selectedPlanId = useAppSelector(s => s.workout.selectedPlanId);
  const [detail, setDetail] = useState<WorkoutPlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { detail: d, error: err } = await fetchPlanDetail(planId);
      if (cancelled) {
        return;
      }
      if (err) {
        setError(err);
        setDetail(null);
      } else {
        setDetail(d);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [planId]);

  const isActivePlan =
    selectedPlanId === planId ||
    (selectedPlanId == null && planName === DEFAULT_PLAN_NAME);

  const onUsePlan = useCallback(() => {
    dispatch(setSelectedPlanId(planId));
  }, [dispatch, planId]);

  return (
    <CrtScreen flicker={false}>
      <ScrollView
        contentContainerStyle={styles.pad}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.muted}>LOADING…</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.err}>{error}</Text> : null}

        {!loading && detail ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.name}>{detail.name.toUpperCase()}</Text>
              <Text style={styles.meta}>{detail.goal}</Text>
              <Text style={styles.small}>
                {detail.level} · {detail.daysPerWeek} SESSIONS/WK
              </Text>
            </View>

            <HardwareButton
              label={isActivePlan ? 'ACTIVE CHANNEL' : 'SET ACTIVE'}
              variant={isActivePlan ? 'outlined' : 'filled'}
              onPress={onUsePlan}
              disabled={isActivePlan}
            />

            <Text style={styles.section}>SPLIT</Text>
            <Text style={styles.body}>
              EACH BLOCK IS A SESSION. START ANY SESSION FROM TODAY TAB.
            </Text>

            {detail.sessions.map(session => (
              <View key={`${session.day}-${session.sessionType}`} style={styles.session}>
                <Text style={styles.sessionTitle}>{session.sessionType.toUpperCase()} DAY</Text>
                <Text style={styles.meta}>{session.focus}</Text>
                <Text style={styles.small}>~{session.durationMinutes} MIN</Text>
                <View style={styles.divider} />
                <Text style={styles.exHead}>EXERCISES</Text>
                {session.exercises.map((ex, i) => (
                  <Text key={`${ex.name}-${i}`} style={styles.exLine}>
                    {String(i + 1).padStart(2, '0')} {ex.name} · {ex.sets}X{ex.reps}
                  </Text>
                ))}
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </CrtScreen>
  );
}

const styles = StyleSheet.create({
  pad: {
    paddingBottom: spacing(4),
    paddingHorizontal: spacing(2),
  },
  center: {
    alignItems: 'center',
    padding: spacing(3),
  },
  muted: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 8,
  },
  err: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.danger,
    marginBottom: spacing(1),
  },
  hero: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing(2),
    marginBottom: spacing(2),
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 6,
  },
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  small: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  section: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    marginTop: spacing(2),
    marginBottom: 6,
    color: colors.text,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: spacing(2),
    lineHeight: 15,
  },
  session: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing(1.5),
    marginBottom: spacing(1.5),
    backgroundColor: colors.surface,
  },
  sessionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.accent,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing(1),
  },
  exHead: {
    fontFamily: fontFamily.regular,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.textMuted,
    marginBottom: 6,
  },
  exLine: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.text,
    marginBottom: 4,
  },
});
