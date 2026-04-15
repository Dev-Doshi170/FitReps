import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

/** Meaningful interaction feedback — maps to light impact. */
export function hapticLight() {
  ReactNativeHapticFeedback.trigger('impactLight', options);
}

export function hapticMedium() {
  ReactNativeHapticFeedback.trigger('impactMedium', options);
}

export function hapticSelection() {
  ReactNativeHapticFeedback.trigger('selection', options);
}
