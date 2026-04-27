const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');

module.exports = function (api) {
  // Re-bundle when .env changes (otherwise Metro/Babel can keep stale injected values).
  api.cache.using(() => {
    try {
      return fs.statSync(envPath).mtimeMs.toString();
    } catch {
      return 'missing-env';
    }
  });

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: envPath,
          safe: false,
          allowlist: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
        },
      ],
      'react-native-worklets-core/plugin',
      // Reanimated docs: this plugin must be last.
      'react-native-reanimated/plugin',
      '@babel/plugin-transform-class-static-block',
    ],
  };
};
