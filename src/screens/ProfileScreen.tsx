import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CrtScreen, HardwareButton, ToggleSwitch } from '../components/crt';
import { hapticLight } from '../lib/haptics';
import type { AppStackParamList, MainTabParamList } from '../navigation/AppNavigator';
import { useAppDispatch, useAppSelector } from '../store';
import { localDateKey } from '../store/slices/workoutSlice';
import type { WorkoutHistory } from '../store/slices/workoutSlice';
import { logoutUser } from '../store/slices/authSlice';
import { colors, crt, fontFamily, spacing } from '../theme/theme';

type ProfileNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NativeStackNavigationProp<AppStackParamList>
>;

function streakDays(history: WorkoutHistory[]): number {
  const days = new Set(history.map(h => h.date));
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = localDateKey(cursor);
    if (!days.has(key)) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function totalVolumeKg(history: WorkoutHistory[]): number {
  let v = 0;
  for (const day of history) {
    for (const ex of day.exercises) {
      for (const s of ex.sets) {
        if (s.reps != null && s.weight != null) {
          v += s.reps * s.weight;
        }
      }
    }
  }
  return Math.round(v);
}

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileNav>();
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);
  const loading = useAppSelector(s => s.auth.loading);
  const history = useAppSelector(s => s.workout.history);
  const [soundOn, setSoundOn] = useState(false);
  const [hapticsOn, setHapticsOn] = useState(true);

  const sessions = history.length;
  const volume = useMemo(() => totalVolumeKg(history), [history]);
  const streak = useMemo(() => streakDays(history), [history]);

  const onLogOut = async () => {
    const result = await dispatch(logoutUser());
    if (logoutUser.rejected.match(result)) {
      Alert.alert('Log out failed', String(result.payload ?? 'Unknown error'));
    }
  };

  return (
    <CrtScreen flicker={false}>
      <ScrollView
        contentContainerStyle={styles.pad}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}>
        <Text style={styles.title}>OPERATOR PROFILE</Text>

        <View style={styles.card}>
          <Text style={styles.email}>{user?.email ?? '—'}</Text>
          <Text style={styles.clearance}>CLEARANCE LEVEL: STANDARD USER</Text>
        </View>

        <View style={styles.strip}>
          <View style={styles.stripCell}>
            <Text style={styles.stripLabel}>SESSIONS</Text>
            <Text style={styles.stripVal}>{sessions}</Text>
          </View>
          <View style={styles.stripCell}>
            <Text style={styles.stripLabel}>VOLUME KG</Text>
            <Text style={styles.stripVal}>{volume}</Text>
          </View>
          <View style={styles.stripCell}>
            <Text style={styles.stripLabel}>STREAK</Text>
            <Text style={styles.stripVal}>{streak}D</Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            hapticLight();
            navigation.navigate('WorkoutPlans');
          }}
          style={styles.planLink}>
          <Text style={styles.planLinkText}>PLAN CATALOG</Text>
        </Pressable>

        <View style={styles.settings}>
          <View style={styles.setRow}>
            <Text style={styles.setLabel}>AUDIO CUES</Text>
            <ToggleSwitch value={soundOn} onChange={setSoundOn} />
          </View>
          <View style={styles.dashed} />
          <View style={styles.setRow}>
            <Text style={styles.setLabel}>HAPTICS</Text>
            <ToggleSwitch value={hapticsOn} onChange={setHapticsOn} />
          </View>
          <View style={styles.dashed} />
        </View>

        <HardwareButton label="TERMINATE SESSION" variant="danger" onPress={onLogOut} disabled={loading} />
      </ScrollView>
    </CrtScreen>
  );
}

const styles = StyleSheet.create({
  pad: {
    paddingBottom: spacing(4),
    paddingHorizontal: spacing(2),
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    letterSpacing: crt.labelLetterSpacing,
    color: colors.textMuted,
    marginBottom: spacing(2),
  },
  card: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing(2),
    marginBottom: spacing(2),
  },
  email: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.text,
    marginBottom: 8,
  },
  clearance: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.textMuted,
  },
  strip: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing(2),
  },
  stripCell: {
    flex: 1,
    padding: spacing(1.5),
    borderRightWidth: 1,
    borderRightColor: colors.borderSubtle,
  },
  stripLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 8,
    letterSpacing: 2,
    color: colors.textMuted,
    marginBottom: 4,
  },
  stripVal: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.accent,
  },
  planLink: {
    paddingVertical: spacing(1),
    marginBottom: spacing(2),
  },
  planLinkText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.accentSecondary,
  },
  settings: {
    marginBottom: spacing(2),
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(1.5),
  },
  setLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.text,
  },
  dashed: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderSubtle,
  },
});
