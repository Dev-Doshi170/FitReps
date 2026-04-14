const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const metroResolver = require('metro-resolver');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    resolveRequest(context, moduleName, platform) {
      if (moduleName === 'react-dom') {
        return {
          type: 'sourceFile',
          filePath: path.resolve(__dirname, 'shims/react-dom.js'),
        };
      }
      return metroResolver.resolve(
        { ...context, resolveRequest: metroResolver.resolve },
        moduleName,
        platform,
      );
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
