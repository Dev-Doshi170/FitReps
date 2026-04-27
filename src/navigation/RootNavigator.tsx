import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Center } from '@gluestack-ui/themed';

import OnboardingScreen from '../screens/OnboardingScreen';
import { useAppDispatch, useAppSelector } from '../store';
import { restoreSession } from '../store/slices/authSlice';
import { fetchUserProfile } from '../store/slices/workoutSlice';
import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';

export default function RootNavigator() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(s => s.auth.isAuthenticated);
  const userProfile = useAppSelector(s => s.workout.userProfile);
  const userProfileStatus = useAppSelector(s => s.workout.userProfileStatus);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    dispatch(restoreSession()).finally(() => setSessionReady(true));
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchUserProfile());
    }
  }, [isAuthenticated, dispatch]);

  if (!sessionReady) {
    return (
      <Center flex={1} bg="$backgroundDark950">
        <ActivityIndicator size="large" />
      </Center>
    );
  }

  if (
    isAuthenticated &&
    (userProfileStatus === 'idle' || userProfileStatus === 'loading')
  ) {
    return (
      <Center flex={1} bg="$backgroundDark950">
        <ActivityIndicator size="large" />
      </Center>
    );
  }

  if (isAuthenticated && !userProfile?.onboarding_complete) {
    return <OnboardingScreen />;
  }

  return (
    <NavigationContainer theme={DarkTheme}>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
