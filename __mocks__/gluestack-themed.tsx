import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text as RNText,
  TextInput,
  View,
} from 'react-native';

export const GluestackUIProvider = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

const wrapView =
  (testID?: string) =>
  ({ children, ...props }: any) =>
    (
      <View testID={testID} {...props}>
        {children}
      </View>
    );

export const Box = wrapView('box');
export const VStack = wrapView('vstack');
export const HStack = wrapView('hstack');
export const Center = wrapView('center');
export const Badge = wrapView('badge');
export const Divider = wrapView('divider');
export const Input = wrapView('input');

export const BadgeText = (props: any) => <RNText {...props} />;
export const ButtonText = (props: any) => <RNText {...props} />;

export const Text = (props: any) => <RNText {...props} />;

export const ButtonSpinner = () => <ActivityIndicator />;

export const Button = ({ children, onPress, isDisabled, ...rest }: any) => (
  <Pressable accessibilityRole="button" onPress={onPress} disabled={isDisabled} {...rest}>
    {children}
  </Pressable>
);

export const InputField = (props: any) => <TextInput {...props} />;

export { Pressable };
