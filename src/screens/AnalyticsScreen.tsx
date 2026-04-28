import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import BodyWeightChart from '../components/analytics/BodyWeightChart';
import ExerciseProgressChart from '../components/analytics/ExerciseProgressChart';
import MuscleGroupVolumeChart from '../components/analytics/MuscleGroupVolumeChart';
import PersonalRecordsTable from '../components/analytics/PersonalRecordsTable';
import WeeklySummaryCards from '../components/analytics/WeeklySummaryCards';
import { CrtScreen } from '../components/crt';
import { supabase } from '../services/supabase';
import { colors, fontFamily, spacing } from '../theme/theme';

const EXERCISES = ['Squat', 'Bench Press', 'Deadlift', 'Pull Up', 'Overhead Press'];
const FOCUS_TYPES = ['Push', 'Pull', 'Legs', 'Full Body'];
function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.divider} />
    </View>
  );
}

export default function AnalyticsScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [exerciseName, setExerciseName] = useState<string>(EXERCISES[0]);
  const [focus, setFocus] = useState<string>(FOCUS_TYPES[0]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) {
        setUserId(data.user?.id ?? null);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  if (!userId) {
    return (
      <CrtScreen flicker={false} style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.muted}>Sign in to view analytics.</Text>
        </View>
      </CrtScreen>
    );
  }

  return (
    <CrtScreen flicker={false} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader title="Weekly Overview" />
        <View style={styles.fullBleedH}>
          <WeeklySummaryCards userId={userId} />
        </View>

        <SectionHeader title="Strength Progress" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
          {EXERCISES.map(item => (
            <Pressable
              key={item}
              onPress={() => setExerciseName(item)}
              style={[styles.chip, exerciseName === item && styles.chipActive]}>
              <Text style={[styles.chipText, exerciseName === item && styles.chipTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <ExerciseProgressChart userId={userId} exerciseName={exerciseName} />

        <SectionHeader title="Volume by session type" />
        <View style={styles.toggleRow}>
          {FOCUS_TYPES.map(item => (
            <Pressable
              key={item}
              onPress={() => setFocus(item)}
              style={[styles.toggle, focus === item && styles.toggleActive]}>
              <Text style={[styles.toggleText, focus === item && styles.toggleTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <MuscleGroupVolumeChart userId={userId} focus={focus} />

        <SectionHeader title="Body Weight" />
        <BodyWeightChart userId={userId} />

        <SectionHeader title="Personal Records" />
        <PersonalRecordsTable userId={userId} />
      </ScrollView>
    </CrtScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
  },
  content: {
    paddingBottom: 32,
    paddingHorizontal: spacing(2),
    gap: 12,
  },
  fullBleedH: {
    marginHorizontal: -spacing(2),
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  pickerRow: {
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.activeTint,
    borderColor: colors.borderActive,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fontFamily.regular,
  },
  chipTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toggle: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  toggleActive: {
    borderColor: colors.borderActive,
    backgroundColor: colors.activeTint,
  },
  toggleText: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fontFamily.regular,
  },
  toggleTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
});
