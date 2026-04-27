import type { ComponentProps } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CameraScreen from '../screens/CameraScreen';
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
import CrtHeader from './CrtHeader';
import HardwareTabBar from './HardwareTabBar';

export type MainTabParamList = {
  Dashboard: undefined;
  History: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  TodayWorkout: { planDayId: string };
  ExerciseLogging: { exercise: Exercise };
  WorkoutSessionSummary: undefined;
  WeightHistory: undefined;
  WorkoutPlans: undefined;
  WorkoutPlanDetail: { planId: string; planName: string };
  FormTracking: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function CrtTabBar(props: ComponentProps<typeof HardwareTabBar>) {
  return <HardwareTabBar {...props} />;
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={CrtTabBar}
      screenOptions={{
        headerShown: false,
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'TODAY' }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ tabBarLabel: 'ARCHIVE' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'OPERATOR' }}
      />
    </Tab.Navigator>
  );
}

const stackScreenOptions = {
  header: CrtHeader,
  headerShown: true,
  animation: 'fade' as const,
};

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="TodayWorkout"
        component={TodayWorkoutScreen}
        options={{
          title: 'SESSION',
          headerTitle: 'SESSION',
        }}
      />
      <Stack.Screen
        name="ExerciseLogging"
        component={ExerciseLoggingScreen}
        options={({ route }) => ({
          title: route.params.exercise.name.toUpperCase(),
          headerTitle: route.params.exercise.name.toUpperCase(),
        })}
      />
      <Stack.Screen
        name="WorkoutSessionSummary"
        component={WorkoutSessionSummaryScreen}
        options={{
          title: 'SESSION COMPLETE',
          headerTitle: 'SESSION COMPLETE',
        }}
      />
      <Stack.Screen
        name="WeightHistory"
        component={WeightHistoryScreen}
        options={{
          title: 'BODY MASS LOG',
          headerTitle: 'BODY MASS LOG',
        }}
      />
      <Stack.Screen
        name="WorkoutPlans"
        component={WorkoutPlansScreen}
        options={{
          title: 'PLAN CATALOG',
          headerTitle: 'PLAN CATALOG',
        }}
      />
      <Stack.Screen
        name="WorkoutPlanDetail"
        component={WorkoutPlanDetailScreen}
        options={({ route }) => ({
          title: route.params.planName.toUpperCase(),
          headerTitle: route.params.planName.toUpperCase(),
        })}
      />
      <Stack.Screen
        name="FormTracking"
        component={CameraScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
