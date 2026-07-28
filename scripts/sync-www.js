// Copies the web app shell into www/, which is what Capacitor bundles into
// the native iOS app. Run this (or `npm run cap:sync`) after editing
// index.html/assets and before opening/building the Xcode project.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const wwwDir = path.join(root, 'www');

// Unused raw source photos that live in assets/avatars/ but were never
// wired into the app (not referenced anywhere in index.html) -- kept
// locally for reference, deliberately excluded from what actually ships.
const EXCLUDE = new Set(['1400.jpg', '3102.jpg']);

fs.mkdirSync(wwwDir, { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(wwwDir, 'index.html'));
fs.cpSync(path.join(root, 'assets'), path.join(wwwDir, 'assets'), {
  recursive: true,
  filter: (src) => !EXCLUDE.has(path.basename(src)),
});

console.log('Synced index.html + assets → www/ (excluding unused source photos)');
