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
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
