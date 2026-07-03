/**
 * Babel config. `babel-preset-expo` with `jsxImportSource: 'nativewind'` plus the
 * `nativewind/babel` preset wires up className → style transforms for NativeWind v4.
 *
 * The Reanimated/Worklets Babel plugin is intentionally NOT listed here:
 * `babel-preset-expo` (SDK 56) auto-injects `react-native-worklets/plugin` when
 * the package is installed, and adding it manually would register it twice.
 */
module.exports = function (api) {
  api.cache(true);
  // Strip console.* from release bundles (keep error/warn for crash triage).
  // Android logs are world-readable via `adb logcat`, so a stray debug
  // console.log(response) would otherwise leak user data from shipped builds.
  const plugins = [];
  if (process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production') {
    plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
  }
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins,
  };
};
