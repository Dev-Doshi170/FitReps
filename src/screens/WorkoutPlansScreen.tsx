import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CrtScreen } from '../components/crt';
import type { AppStackParamList } from '../navigation/AppNavigator';
import {
  DEFAULT_PLAN_NAME,
  fetchAllPlans,
  type WorkoutPlanSummary,
} from '../services/workoutPlan';
import { useAppSelector } from '../store';
import { colors, fontFamily, spacing } from '../theme/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'WorkoutPlans'>;
type PlansNav = NativeStackNavigationProp<AppStackParamList, 'WorkoutPlans'>;

export default function WorkoutPlansScreen(_props: Props) {
  const navigation = useNavigation<PlansNav>();
  const selectedPlanId = useAppSelector(s => s.workout.selectedPlanId);
  const [plans, setPlans] = useState<WorkoutPlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { plans: rows, error: err } = await fetchAllPlans();
      if (cancelled) {
        return;
      }
      if (err) {
        setError(err);
        setPlans([]);
      } else {
        setPlans(rows);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveSelectedId = useMemo(() => {
    if (selectedPlanId) {
      return selectedPlanId;
    }
    const byName = plans.find(p => p.name === DEFAULT_PLAN_NAME)?.id;
    return byName ?? plans[0]?.id ?? null;
  }, [selectedPlanId, plans]);

  const openPlanDetail = useCallback(
    (plan: WorkoutPlanSummary) => {
      navigation.navigate('WorkoutPlanDetail', {
        planId: plan.id,
        planName: plan.name,
      });
    },
    [navigation],
  );

  return (
    <CrtScreen flicker={false}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.body}>
          SELECT A PROGRAM. ACTIVE PLAN IS MARKED. SET ACTIVE FROM DETAIL VIEW.
        </Text>

        {loading ? (
          <View style={styles.row}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.muted}>LOADING…</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.err}>{error}</Text> : null}

        {!loading && !error && plans.length === 0 ? (
          <Text style={styles.muted}>NO PLANS IN DATABASE.</Text>
        ) : null}

        {plans.map(plan => {
          const isSelected = effectiveSelectedId === plan.id;
          return (
            <Pressable
              key={plan.id}
              onPress={() => openPlanDetail(plan)}
              style={[styles.card, isSelected && styles.cardOn]}>
              <View style={styles.cardTop}>
                <Text style={styles.planName}>{plan.name.toUpperCase()}</Text>
                {isSelected ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>ACTIVE</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.meta}>{plan.goal}</Text>
              <Text style={styles.small}>
                {plan.level} · {plan.days_per_week} D/WK
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </CrtScreen>
  );
}

const styles = StyleSheet.create({
  pad: {
    paddingBottom: spacing(4),
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: spacing(2),
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing(2),
  },
  muted: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  err: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.danger,
    marginBottom: spacing(1),
  },
  card: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing(2),
    marginBottom: spacing(1.5),
    backgroundColor: colors.surface,
  },
  cardOn: {
    borderColor: colors.accent,
    backgroundColor: colors.activeTint,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  planName: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  badge: {
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.accent,
  },
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  small: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
});
