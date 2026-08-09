// Copies the web app shell into www/, which is what Capacitor bundles into
// the native iOS app. Run this (or `npm run cap:sync`) after editing
// index.html/assets and before opening/building the Xcode project.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const wwwDir = path.join(root, 'www');

fs.mkdirSync(wwwDir, { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(wwwDir, 'index.html'));
// cpSync only overlays files -- it never removes destination files whose
// source was deleted (e.g. a swapped-out avatar set), so www/assets would
// silently accumulate stale files forever. Wipe it first for a true mirror.
fs.rmSync(path.join(wwwDir, 'assets'), { recursive: true, force: true });
fs.cpSync(path.join(root, 'assets'), path.join(wwwDir, 'assets'), { recursive: true });

console.log('Synced index.html + assets → www/');
