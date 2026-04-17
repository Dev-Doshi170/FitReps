const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const metroResolver = require('metro-resolver');
const { getBundleModeMetroConfig } = require('react-native-worklets/bundleMode');

const baseConfig = getDefaultConfig(__dirname);
const { assetExts } = baseConfig.resolver;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * Worklets bundle mode is required so Vision Camera frame processors use
 * `createSerializable` instead of LEGACY globals when bridging `runOnJS` args.
 * After changing this file, restart Metro with: npx react-native start --reset-cache
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const merged = mergeConfig(baseConfig, {
  resolver: {
    assetExts: [...assetExts, 'bin', 'tflite'],
  },
});

getBundleModeMetroConfig(merged);

const workletsResolveRequest = merged.resolver.resolveRequest;
merged.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-dom') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'shims/react-dom.js'),
    };
  }
  if (moduleName === '@mediapipe/pose') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'shims/mediapipe-pose.js'),
    };
  }
  if (moduleName === '@tensorflow/tfjs-backend-webgpu') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'shims/tfjs-backend-webgpu.js'),
    };
  }
  return workletsResolveRequest(context, moduleName, platform);
};

module.exports = merged;
