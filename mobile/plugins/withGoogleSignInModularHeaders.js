/**
 * Expo config plugin — make the Google Sign-In Cocoapods integrate on iOS.
 *
 * `@react-native-google-signin/google-signin` v16 pulls in GoogleSignIn 8.x,
 * which depends on `AppCheckCore` — a Swift pod that in turn depends on
 * `GoogleUtilities` and `RecaptchaInterop`. Those don't define Clang modules, so
 * with CocoaPods' default static libraries the build fails:
 *   "The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and
 *    `RecaptchaInterop`, which do not define modules."
 *
 * The fix Cocoapods itself recommends is to opt those specific pods into modular
 * headers. We do it surgically (only these three pods) rather than a global
 * `use_modular_headers!` so we don't disturb other native modules (react-native-maps
 * etc.), and via a config plugin so it survives `expo prebuild` on EAS — a hand
 * edit of the generated Podfile would be wiped on the next prebuild.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const POD_LINES = [
  "  pod 'GoogleUtilities', :modular_headers => true",
  "  pod 'RecaptchaInterop', :modular_headers => true",
  "  pod 'AppCheckCore', :modular_headers => true",
].join('\n');

module.exports = function withGoogleSignInModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');
      if (!contents.includes("pod 'AppCheckCore', :modular_headers")) {
        // Insert right after the app target opens so the pods are in scope.
        contents = contents.replace(/(target '[^']+' do\n)/, `$1${POD_LINES}\n`);
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
};
