// const path = require('path');
// const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
// const { getBundleModeMetroConfig } = require('react-native-worklets/bundleMode');

// const baseConfig = getDefaultConfig(__dirname);

// /**
//  * Metro configuration
//  * https://reactnative.dev/docs/metro
//  *
//  * Worklets bundle mode is required so Vision Camera frame processors use
//  * `createSerializable` instead of LEGACY globals when bridging `runOnJS` args.
//  * After changing this file, restart Metro with: npx react-native start --reset-cache
//  *
//  * @type {import('@react-native/metro-config').MetroConfig}
//  */
// const merged = mergeConfig(baseConfig, {});

// getBundleModeMetroConfig(merged);

// const workletsResolveRequest = merged.resolver.resolveRequest;
// merged.resolver.resolveRequest = (context, moduleName, platform) => {
//   if (moduleName === 'react-dom') {
//     return {
//       type: 'sourceFile',
//       filePath: path.resolve(__dirname, 'shims/react-dom.js'),
//     };
//   }
//   return workletsResolveRequest(context, moduleName, platform);
// };

// module.exports = merged;


const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { getBundleModeMetroConfig } = require('react-native-worklets/bundleMode');

const baseConfig = getDefaultConfig(__dirname);

// 👇 ADD THIS
const {
  resolver: { assetExts },
} = baseConfig;

/**
 * Metro configuration
 */
const merged = mergeConfig(baseConfig, {
  resolver: {
    assetExts: [...assetExts, 'bin'], // ✅ ADD .bin support
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
  return workletsResolveRequest(context, moduleName, platform);
};

module.exports = merged;