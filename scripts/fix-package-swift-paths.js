// `npx cap sync` writes local SPM package `path:` references using the OS's
// native path separator -- on Windows that's backslashes, which macOS/Xcode
// won't resolve (SPM treats them as literal characters, not separators),
// silently breaking any plugin's native code from linking into the Xcode
// build. Since development happens on both Windows and macOS for this
// project, normalize to forward slashes after every sync regardless of
// which OS ran it.
const fs = require('fs');
const path = require('path');

const pkgSwiftPath = path.join(__dirname, '..', 'ios', 'App', 'CapApp-SPM', 'Package.swift');
if (!fs.existsSync(pkgSwiftPath)) process.exit(0);

const before = fs.readFileSync(pkgSwiftPath, 'utf8');
const after = before.replace(/(path:\s*")([^"]*)(")/g, (m, pre, p, post) => pre + p.replace(/\\/g, '/') + post);

if (after !== before) {
  fs.writeFileSync(pkgSwiftPath, after);
  console.log('Fixed Windows-style backslash path(s) in Package.swift');
}
