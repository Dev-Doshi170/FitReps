import { DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from '../screens/DashboardScreen';
import ExerciseLoggingScreen from '../screens/ExerciseLoggingScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TodayWorkoutScreen from '../screens/TodayWorkoutScreen';
import WeightHistoryScreen from '../screens/WeightHistoryScreen';
import WorkoutPlanDetailScreen from '../screens/WorkoutPlanDetailScreen';
import WorkoutPlansScreen from '../screens/WorkoutPlansScreen';
import WorkoutSessionSummaryScreen from '../screens/WorkoutSessionSummaryScreen';
import type { Exercise } from '../store/slices/workoutSlice';

export type MainTabParamList = {
  Dashboard: undefined;
  History: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  TodayWorkout: undefined;
  ExerciseLogging: { exercise: Exercise };
  WorkoutSessionSummary: undefined;
  WeightHistory: undefined;
  WorkoutPlans: undefined;
  WorkoutPlanDetail: { planId: string; planName: string };
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: DarkTheme.colors.card },
        tabBarActiveTintColor: DarkTheme.colors.text,
        tabBarInactiveTintColor: DarkTheme.colors.border,
      }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TodayWorkout"
        component={TodayWorkoutScreen}
        options={{
          title: "Today's workout",
          headerStyle: { backgroundColor: DarkTheme.colors.card },
          headerTintColor: DarkTheme.colors.text,
        }}
      />
      <Stack.Screen
        name="ExerciseLogging"
        component={ExerciseLoggingScreen}
        options={({ route }) => ({
          title: route.params.exercise.name,
          headerStyle: { backgroundColor: DarkTheme.colors.card },
          headerTintColor: DarkTheme.colors.text,
        })}
      />
      <Stack.Screen
        name="WorkoutSessionSummary"
        component={WorkoutSessionSummaryScreen}
        options={{
          title: 'Session summary',
          headerStyle: { backgroundColor: DarkTheme.colors.card },
          headerTintColor: DarkTheme.colors.text,
        }}
      />
      <Stack.Screen
        name="WeightHistory"
        component={WeightHistoryScreen}
        options={{
          title: 'Weight history',
          headerStyle: { backgroundColor: DarkTheme.colors.card },
          headerTintColor: DarkTheme.colors.text,
        }}
      />
      <Stack.Screen
        name="WorkoutPlans"
        component={WorkoutPlansScreen}
        options={{
          title: 'Workout plans',
          headerStyle: { backgroundColor: DarkTheme.colors.card },
          headerTintColor: DarkTheme.colors.text,
        }}
      />
      <Stack.Screen
        name="WorkoutPlanDetail"
        component={WorkoutPlanDetailScreen}
        options={{
          headerStyle: { backgroundColor: DarkTheme.colors.card },
          headerTintColor: DarkTheme.colors.text,
        }}
      />
    </Stack.Navigator>
  );
}
