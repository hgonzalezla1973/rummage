// Regenerates the iOS app icon from the same RummageMark design used live
// on the site (see index.html's RummageMark component) -- orange gradient
// pin, paper ring, white dot -- on an ink-900 background, matching how the
// mark actually appears against the app's dark nav bar. Xcode 14+ uses a
// single 1024x1024 "universal" icon (see AppIcon.appiconset/Contents.json),
// so there's only the one file to produce.
const sharp = require('sharp');
const path = require('path');

const svg = `
<svg width="1024" height="1024" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
  <rect width="80" height="80" fill="#1A1A1A"/>
  <defs>
    <linearGradient id="g" x1="8" y1="8" x2="72" y2="72" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#9C2D10"/>
      <stop offset="1" stop-color="#E8491D"/>
    </linearGradient>
  </defs>
  <g transform="translate(8,8)">
    <path d="M32 4C18.7 4 8 14.6 8 27.7c0 6.2 3 12 7.4 17.6 3.9 4.9 8.8 9.2 12.3 12.1a6 6 0 0 0 8.6 0c3.5-2.9 8.4-7.2 12.3-12.1C53 39.7 56 33.9 56 27.7 56 14.6 45.3 4 32 4Z" fill="url(#g)"/>
    <circle cx="32" cy="26.5" r="10.5" fill="#F1EFE9"/>
    <circle cx="32" cy="26.5" r="4" fill="#FFFFFF"/>
  </g>
</svg>
`;

const outPath = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png');

sharp(Buffer.from(svg))
  .resize(1024, 1024)
  .flatten({ background: '#1A1A1A' }) // iOS rejects icons with any alpha channel
  .png()
  .toFile(outPath)
  .then(() => console.log('Wrote', outPath))
  .catch(err => { console.error(err); process.exit(1); });
