import { Box, ButtonText, HStack, Text, VStack } from '@gluestack-ui/themed';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../components/ui';
import type { AppStackParamList, MainTabParamList } from '../navigation/AppNavigator';
import { useAppDispatch, useAppSelector } from '../store';
import { logoutUser } from '../store/slices/authSlice';

type ProfileNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NativeStackNavigationProp<AppStackParamList>
>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileNav>();
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);
  const loading = useAppSelector(s => s.auth.loading);

  const onLogOut = async () => {
    const result = await dispatch(logoutUser());
    if (logoutUser.rejected.match(result)) {
      Alert.alert('Log out failed', String(result.payload ?? 'Unknown error'));
    }
  };

  const onLogin = () => {
    Alert.alert(
      'Login',
      'You are already signed in. Log out below to open the login screen, then sign in again.',
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <VStack space="lg">
          <Text size="2xl" fontWeight="$bold" color="$textLight50">
            Profile
          </Text>

          <Box
            bg="$backgroundDark800"
            borderRadius="$lg"
            p="$4"
            borderWidth={1}
            borderColor="$borderDark700">
            <VStack space="sm">
              <Text size="sm" color="$textLight400">
                Email
              </Text>
              <Text color="$textLight50">{user?.email ?? '—'}</Text>
            </VStack>
          </Box>

          <Pressable
            onPress={() => navigation.navigate('WorkoutPlans')}
            accessibilityRole="button">
            <Box
              bg="$backgroundDark800"
              borderRadius="$lg"
              p="$4"
              borderWidth={1}
              borderColor="$borderDark700">
              <HStack justifyContent="space-between" alignItems="center">
                <VStack space="xs" flex={1}>
                  <Text color="$textLight50" fontWeight="$semibold">
                    Workout plans
                  </Text>
                  <Text color="$textLight500" size="sm">
                    View programs and choose your active plan
                  </Text>
                </VStack>
                <Text color="$textLight400" size="xl">
                  ›
                </Text>
              </HStack>
            </Box>
          </Pressable>

          <VStack space="md">
            <AppButton
              size="lg"
              variant="outline"
              borderColor="$borderDark500"
              onPress={onLogin}>
              <ButtonText color="$textLight50">Login</ButtonText>
            </AppButton>
            <AppButton
              size="lg"
              variant="outline"
              borderColor="$error500"
              onPress={onLogOut}
              isLoading={loading}
              showSpinner>
              <ButtonText color="$error400">Log out</ButtonText>
            </AppButton>
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
