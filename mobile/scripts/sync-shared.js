/**
 * Vendors the monorepo's shared workspace (`app/shared`) into the mobile project
 * as `app/mobile/_shared` so Metro can bundle it.
 *
 * Why this exists: the app's `constants`/`types` barrels re-export the shared
 * domain types + constants that the backend also uses (single source of truth).
 * Metro only reliably crawls files **under the project root** — on Windows its
 * file crawler does not index `watchFolders` that live outside the project (here
 * `app/shared` is a sibling of `app/mobile`), so importing across that boundary
 * leaves the modules unresolved. Mirroring `app/shared` into an in-root `_shared`
 * folder sidesteps that entirely and works identically on every OS and on EAS.
 *
 * `_shared` is generated (gitignored) and refreshed on `postinstall` + `prestart`,
 * so it never drifts from `app/shared`. The barrels import from `../_shared/*`.
 */
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname.endsWith('scripts') ? path.resolve(__dirname, '..') : __dirname;
const sourceDir = path.resolve(projectRoot, '..', 'shared');
const targetDir = path.join(projectRoot, '_shared');

/** Recursively copy `from` → `to`, skipping node_modules / build output. */
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

function main() {
  if (!fs.existsSync(sourceDir)) {
    console.warn(`[sync-shared] source not found: ${sourceDir} — skipping.`);
    return;
  }
  fs.rmSync(targetDir, { recursive: true, force: true });
  copyDir(sourceDir, targetDir);
  // Mark as generated so nobody hand-edits the mirror.
  fs.writeFileSync(
    path.join(targetDir, 'README.generated.md'),
    '# Generated mirror\n\nThis folder is a copy of `app/shared`, vendored by `scripts/sync-shared.js`\n' +
      'so Metro can bundle it. Do not edit — change `app/shared` and re-run `npm run sync:shared`.\n',
  );
  console.log(`[sync-shared] mirrored app/shared → app/mobile/_shared`);
}

main();
