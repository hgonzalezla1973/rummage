/**
 * Rummage Backend — server.js
 *
 * Scrapes garage/estate/yard sale listings from Craigslist and OfferUp
 * using a headless Chrome browser (puppeteer-core + your installed Chrome).
 *
 * Sources:
 *   - Craigslist  garage & moving sales (gms category)
 *   - OfferUp     "yard sale" / "estate sale" keyword search
 *   - Google      optional — set GOOGLE_API_KEY + GOOGLE_CX in .env
 *
 * GET /api/listings?zip=90601&radius=10
 * GET /api/health
 *
 * Setup:
 *   npm install
 *   node server.js
 */

'use strict';

// Load .env if present
try { require('fs').readFileSync('.env','utf8').split('\n').forEach(l=>{ const [k,...v]=l.replace(/#.*/,'').trim().split('='); if(k&&v.length) process.env[k.trim()]=v.join('=').trim(); }); } catch(_){}

const express   = require('express');
const cors      = require('cors');
const puppeteer = require('puppeteer-core');
const path      = require('path');

const app  = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// In-memory verification codes: email → { code, expiresAt }
const verifyCodes = new Map();

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /api/send-verification  { email }
app.post('/api/send-verification', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email || !/\S+@\S+\.\S+/.test(email))
    return res.status(400).json({ error: 'Invalid email' });

  const code = makeCode();
  verifyCodes.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 });

  const html = `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px">
    <div style="text-align:center;margin-bottom:24px">
      <div style="display:inline-block;width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,#7C3AED,#A855F7);line-height:64px;font-size:32px">🏷️</div>
      <h1 style="font-size:26px;font-weight:900;color:#18112E;margin:16px 0 4px;letter-spacing:-0.03em">Verify your email</h1>
      <p style="color:#5E5380;font-size:14px;margin:0">Enter this code in Rummage to confirm your account.</p>
    </div>
    <div style="background:#F5F3FF;border-radius:12px;padding:28px;text-align:center;margin:0 0 24px">
      <div style="font-size:42px;font-weight:900;letter-spacing:12px;color:#7C3AED;font-family:monospace">${code}</div>
      <p style="color:#8880A0;font-size:12px;margin:10px 0 0">Expires in 10 minutes</p>
    </div>
    <p style="color:#8880A0;font-size:13px;text-align:center;line-height:1.6">
      If you didn't create a Rummage account, you can safely ignore this email.
    </p>
  </div>`;

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`\n📬 DEV MODE — verification code for ${email}: ${code}\n`);
    return res.json({ ok: true, devMode: true });
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'Rummage <onboarding@resend.dev>',
        to:      [email],
        subject: `${code} is your Rummage verification code`,
        html,
        text: `Your Rummage verification code is: ${code}\n\nExpires in 10 minutes.`,
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || r.statusText);
    console.log(`✉️  Verification email sent to ${email} (id: ${data.id})`);
    res.json({ ok: true });
  } catch (err) {
    console.error('Resend error:', err.message);
    res.status(500).json({ error: 'Failed to send email: ' + err.message });
  }
});

// POST /api/check-code  { email, code }
app.post('/api/check-code', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const code  = (req.body.code  || '').trim();
  const entry = verifyCodes.get(email);

  if (!entry)              return res.status(400).json({ error: 'No code found for this email' });
  if (Date.now() > entry.expiresAt) { verifyCodes.delete(email); return res.status(400).json({ error: 'Code expired' }); }
  if (entry.code !== code) return res.status(400).json({ error: 'Incorrect code' });

  verifyCodes.delete(email);
  res.json({ ok: true });
});

// ── Image proxy (bypasses hotlink protection on estatesales.org) ─────────────
app.get('/api/img', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing url');

  let parsed;
  try { parsed = new URL(url); } catch { return res.status(400).send('Invalid url'); }

  const allowed = ['estatesales.org', 'www.estatesales.org', 'images.craigslist.org', 'thumbs3.ebaystatic.com', 'amazonaws.com', 'cloudfront.net', 'tlcdn.workers.dev', 'imgix.net', 'offerup.com', 'offerupcdn.com'];
  const host = parsed.hostname.replace(/^www\./, '');
  if (!allowed.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h))) {
    return res.status(403).send('Domain not allowed');
  }

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer':         `${parsed.protocol}//${parsed.hostname}/`,
        'Accept':          'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!r.ok) return res.status(r.status).send('Upstream error');
    const ct = r.headers.get('content-type') || 'image/jpeg';
    res.set('Content-Type', ct);
    res.set('Cache-Control', 'public, max-age=3600');
    const buf = await r.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (err) {
    console.warn('Image proxy error:', err.message);
    res.status(502).send('Proxy error');
  }
});

// ── Serve the frontend ────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ── Chrome path (Windows default; adjust if needed) ───────────────────────────
const CHROME_PATH =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// ── LA-area neighborhood → coordinates (avoids Nominatim for common CL locations) ──
const LA_NEIGHBORHOODS = {
  // Near Whittier
  'whittier':{'lat':33.9792,'lng':-118.0328},'south whittier':{'lat':33.9278,'lng':-118.0264},
  'la habra':{'lat':33.9317,'lng':-117.9462},'la habra heights':{'lat':33.9619,'lng':-117.9608},
  'la mirada':{'lat':33.9172,'lng':-118.0128},'norwalk':{'lat':33.9022,'lng':-118.0817},
  'santa fe springs':{'lat':33.9428,'lng':-118.0889},'pico rivera':{'lat':33.9831,'lng':-118.0967},
  'hacienda heights':{'lat':33.9931,'lng':-117.9686},'rowland heights':{'lat':33.9753,'lng':-117.9017},
  'industry':{'lat':34.0153,'lng':-117.9617},'la puente':{'lat':34.0264,'lng':-117.9492},
  // SGV
  'el monte':{'lat':34.0686,'lng':-118.0275},'west covina':{'lat':34.0686,'lng':-117.9189},
  'covina':{'lat':34.0900,'lng':-117.8903},'walnut':{'lat':34.0211,'lng':-117.8614},
  'diamond bar':{'lat':34.0289,'lng':-117.8103},'pomona':{'lat':34.0553,'lng':-117.7500},
  'ontario':{'lat':34.0633,'lng':-117.6509},'chino':{'lat':34.0122,'lng':-117.6886},
  'chino hills':{'lat':33.9939,'lng':-117.7334},'azusa':{'lat':34.1336,'lng':-117.9072},
  'glendora':{'lat':34.1361,'lng':-117.8653},'san dimas':{'lat':34.1066,'lng':-117.8072},
  'monrovia':{'lat':34.1481,'lng':-117.9981},'arcadia':{'lat':34.1397,'lng':-118.0353},
  'san gabriel':{'lat':34.0961,'lng':-118.1056},'temple city':{'lat':34.1067,'lng':-118.0572},
  'rosemead':{'lat':34.0803,'lng':-118.0728},'monterey park':{'lat':34.0625,'lng':-118.1228},
  'alhambra':{'lat':34.0953,'lng':-118.1270},'san marino':{'lat':34.1211,'lng':-118.1067},
  'pasadena':{'lat':34.1478,'lng':-118.1445},'altadena':{'lat':34.1900,'lng':-118.1317},
  'duarte':{'lat':34.1394,'lng':-117.9772},'irwindale':{'lat':34.1139,'lng':-117.9278},
  'montebello':{'lat':34.0142,'lng':-118.1139},'commerce':{'lat':34.0003,'lng':-118.1622},
  // South Bay
  'torrance':{'lat':33.8358,'lng':-118.3406},'hawthorne':{'lat':33.9164,'lng':-118.3525},
  'inglewood':{'lat':33.9617,'lng':-118.3531},'gardena':{'lat':33.8883,'lng':-118.3089},
  'carson':{'lat':33.8317,'lng':-118.2820},'long beach':{'lat':33.7701,'lng':-118.1937},
  'lakewood':{'lat':33.8536,'lng':-118.1339},'signal hill':{'lat':33.8047,'lng':-118.1667},
  'redondo beach':{'lat':33.8492,'lng':-118.3884},'hermosa beach':{'lat':33.8622,'lng':-118.3995},
  'manhattan beach':{'lat':33.8847,'lng':-118.4109},'el segundo':{'lat':33.9192,'lng':-118.4164},
  'lawndale':{'lat':33.8872,'lng':-118.3528},'compton':{'lat':33.8958,'lng':-118.2203},
  'lynwood':{'lat':33.9303,'lng':-118.2114},'south gate':{'lat':33.9547,'lng':-118.2125},
  'downey':{'lat':33.9400,'lng':-118.1328},'bellflower':{'lat':33.8881,'lng':-118.1170},
  'cerritos':{'lat':33.8659,'lng':-118.0650},'artesia':{'lat':33.8653,'lng':-118.0836},
  'paramount':{'lat':33.8894,'lng':-118.1597},'south bay':{'lat':33.8600,'lng':-118.3200},
  'bell':{'lat':33.9775,'lng':-118.1872},'bell gardens':{'lat':33.9653,'lng':-118.1536},
  // San Fernando Valley
  'burbank':{'lat':34.1808,'lng':-118.3090},'glendale':{'lat':34.1425,'lng':-118.2551},
  'van nuys':{'lat':34.1897,'lng':-118.4488},'north hollywood':{'lat':34.1872,'lng':-118.3830},
  'studio city':{'lat':34.1400,'lng':-118.3964},'sherman oaks':{'lat':34.1511,'lng':-118.4481},
  'encino':{'lat':34.1600,'lng':-118.5011},'tarzana':{'lat':34.1672,'lng':-118.5489},
  'reseda':{'lat':34.2006,'lng':-118.5337},'northridge':{'lat':34.2308,'lng':-118.5353},
  'canoga park':{'lat':34.2003,'lng':-118.5981},'woodland hills':{'lat':34.1683,'lng':-118.6058},
  'calabasas':{'lat':34.1347,'lng':-118.6608},'sun valley':{'lat':34.2153,'lng':-118.3747},
  'panorama city':{'lat':34.2217,'lng':-118.4447},'pacoima':{'lat':34.2611,'lng':-118.4044},
  'sylmar':{'lat':34.3008,'lng':-118.4494},'granada hills':{'lat':34.2783,'lng':-118.5028},
  'chatsworth':{'lat':34.2572,'lng':-118.5986},'mission hills':{'lat':34.2658,'lng':-118.4586},
  // Westside
  'santa monica':{'lat':34.0195,'lng':-118.4912},'venice':{'lat':33.9850,'lng':-118.4695},
  'culver city':{'lat':34.0211,'lng':-118.3965},'westwood':{'lat':34.0636,'lng':-118.4468},
  'west la':{'lat':34.0511,'lng':-118.4453},'brentwood':{'lat':34.0597,'lng':-118.4770},
  'pacific palisades':{'lat':34.0431,'lng':-118.5264},'malibu':{'lat':34.0259,'lng':-118.7798},
  'west hollywood':{'lat':34.0900,'lng':-118.3617},'beverly hills':{'lat':34.0736,'lng':-118.4004},
  'bel air':{'lat':34.0872,'lng':-118.4594},
  // Central LA
  'los angeles':{'lat':34.0522,'lng':-118.2437},'downtown':{'lat':34.0430,'lng':-118.2673},
  'hollywood':{'lat':34.0928,'lng':-118.3287},'silver lake':{'lat':34.0870,'lng':-118.2717},
  'echo park':{'lat':34.0783,'lng':-118.2606},'los feliz':{'lat':34.1086,'lng':-118.2928},
  'atwater village':{'lat':34.1175,'lng':-118.2572},'eagle rock':{'lat':34.1397,'lng':-118.2125},
  'highland park':{'lat':34.1100,'lng':-118.1906},'el sereno':{'lat':34.0967,'lng':-118.1622},
  'lincoln heights':{'lat':34.0731,'lng':-118.2028},'boyle heights':{'lat':34.0336,'lng':-118.2072},
  'east la':{'lat':34.0244,'lng':-118.1622},'koreatown':{'lat':34.0586,'lng':-118.3003},
  'mid-city':{'lat':34.0358,'lng':-118.3403},'mid city':{'lat':34.0358,'lng':-118.3403},
  'leimert park':{'lat':34.0039,'lng':-118.3278},'crenshaw':{'lat':34.0203,'lng':-118.3339},
  'watts':{'lat':33.9428,'lng':-118.2481},'glassell park':{'lat':34.1214,'lng':-118.2358},
  // Orange County
  'anaheim':{'lat':33.8353,'lng':-117.9145},'fullerton':{'lat':33.8703,'lng':-117.9242},
  'yorba linda':{'lat':33.8886,'lng':-117.8131},'brea':{'lat':33.9167,'lng':-117.9003},
  'placentia':{'lat':33.8722,'lng':-117.8703},'buena park':{'lat':33.8675,'lng':-118.0003},
  'orange':{'lat':33.7879,'lng':-117.8531},'santa ana':{'lat':33.7455,'lng':-117.8677},
  'costa mesa':{'lat':33.6411,'lng':-117.9187},'irvine':{'lat':33.6846,'lng':-117.8265},
  'huntington beach':{'lat':33.6603,'lng':-117.9992},'garden grove':{'lat':33.7743,'lng':-117.9378},
  // Inland Empire / Riverside County
  'menifee':{'lat':33.6971,'lng':-117.1849},'sun city':{'lat':33.7073,'lng':-117.1981},
  'murrieta':{'lat':33.5539,'lng':-117.2139},'temecula':{'lat':33.4936,'lng':-117.1484},
  'hemet':{'lat':33.7475,'lng':-116.9719},'perris':{'lat':33.7825,'lng':-117.2286},
  'moreno valley':{'lat':33.9425,'lng':-117.2297},'riverside':{'lat':33.9806,'lng':-117.3755},
  'corona':{'lat':33.8753,'lng':-117.5664},'norco':{'lat':33.9322,'lng':-117.5489},
  'lake elsinore':{'lat':33.6681,'lng':-117.3273},'wildomar':{'lat':33.5989,'lng':-117.2803},
  'jurupa valley':{'lat':33.9972,'lng':-117.4854},'eastvale':{'lat':33.9514,'lng':-117.5821},
  'nuevo':{'lat':33.8003,'lng':-117.1540},'homeland':{'lat':33.7461,'lng':-117.1059},
  'winchester':{'lat':33.7020,'lng':-117.0885},'mead valley':{'lat':33.8197,'lng':-117.2706},
  'romoland':{'lat':33.7406,'lng':-117.1712},'san jacinto':{'lat':33.7839,'lng':-116.9589},
  'beaumont':{'lat':33.9294,'lng':-116.9772},'banning':{'lat':33.9253,'lng':-116.8761},
  'cathedral city':{'lat':33.7800,'lng':-116.4669},'palm springs':{'lat':33.8303,'lng':-116.5453},
  'indio':{'lat':33.7206,'lng':-116.2156},'la quinta':{'lat':33.6634,'lng':-116.3100},
  'riverside county':{'lat':33.9806,'lng':-117.3755},
  // San Bernardino County
  'ontario':{'lat':34.0633,'lng':-117.6509},'rancho cucamonga':{'lat':34.1064,'lng':-117.5931},
  'chino':{'lat':34.0122,'lng':-117.6889},'chino hills':{'lat':33.9898,'lng':-117.7326},
  'fontana':{'lat':34.0922,'lng':-117.4350},'rialto':{'lat':34.1064,'lng':-117.3703},
  'san bernardino':{'lat':34.1083,'lng':-117.2898},'redlands':{'lat':34.0556,'lng':-117.1825},
  'colton':{'lat':34.0739,'lng':-117.3136},'upland':{'lat':34.0975,'lng':-117.6484},
  'montclair':{'lat':34.0775,'lng':-117.6897},'pomona':{'lat':34.0551,'lng':-117.7500},
  'san dimas':{'lat':34.1067,'lng':-117.8067},'la verne':{'lat':34.1006,'lng':-117.7678},
};

// ── In-memory cache ───────────────────────────────────────────────────────────
const cache     = new Map();
const CACHE_TTL = 8 * 60 * 1000; // 8 minutes

function fromCache(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;
  return null;
}
function toCache(key, data) { cache.set(key, { ts: Date.now(), data }); }

// ── ZIP → lat/lng ─────────────────────────────────────────────────────────────
const ZIP_COORDS = {
  '90601': { lat: 33.9731, lng: -118.0311 },
  '90602': { lat: 33.9787, lng: -118.0181 },
  '90603': { lat: 33.9468, lng: -117.9978 },
  '90604': { lat: 33.9320, lng: -118.0025 },
  '90605': { lat: 33.9542, lng: -118.0239 },
  '90606': { lat: 33.9787, lng: -118.0447 },
  '90638': { lat: 33.9178, lng: -118.0067 },
  '90650': { lat: 33.9028, lng: -118.0894 },
  '90660': { lat: 33.9917, lng: -118.1097 },
  '90670': { lat: 33.9517, lng: -118.0517 },
  '91010': { lat: 34.0281, lng: -117.9681 },
  '91702': { lat: 34.0739, lng: -117.8353 },
  '91706': { lat: 34.0664, lng: -117.9700 },
  '91710': { lat: 34.0172, lng: -117.6881 },
  '91711': { lat: 34.0959, lng: -117.7153 },
  '91740': { lat: 34.1297, lng: -117.8589 },
  '91741': { lat: 34.1117, lng: -117.8606 },
  '91744': { lat: 34.0333, lng: -117.9528 },
  '91745': { lat: 34.0122, lng: -117.9742 },
  '91746': { lat: 34.0578, lng: -118.0128 },
  '91748': { lat: 33.9828, lng: -117.9578 },
  '91765': { lat: 34.0239, lng: -117.8167 },
  '91766': { lat: 34.0556, lng: -117.7528 },
  '91770': { lat: 34.0453, lng: -118.0764 },
};

async function geocodeZip(zip) {
  if (ZIP_COORDS[zip]) return ZIP_COORDS[zip];
  const cached = fromCache(`geo:${zip}`);
  if (cached) return cached;
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&limit=1`,
      { headers: { 'User-Agent': 'RummageApp/1.0 (local dev)' } });
    const data = await res.json();
    if (data[0]) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      toCache(`geo:${zip}`, coords);
      return coords;
    }
  } catch (e) { console.warn('Geocode failed:', e.message); }
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function pinXY(itemLat, itemLng, centerLat, centerLng, radiusMi) {
  const span = radiusMi / 69;
  return {
    x: Math.max(5, Math.min(95, Math.round(50 + ((itemLng - centerLng) / span) * 50))),
    y: Math.max(5, Math.min(95, Math.round(50 - ((itemLat - centerLat) / span) * 50))),
  };
}

function detectType(text = '') {
  const t = text.toLowerCase();
  if (/estate.sale|estate-sale/.test(t))             return 'estate';
  if (/moving.sale|everything.must.go|liquidat/.test(t)) return 'moving';
  if (/auction/.test(t))                              return 'auction';
  if (/thrift|consign|resale|second.?hand/.test(t))   return 'thrift';
  return 'yard';
}

function parseDateLabel(str = '') {
  try {
    return str ? new Date(str).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) : '';
  } catch { return str; }
}

// ── Browser pool (reuse one browser instance) ─────────────────────────────────
let _browser = null;

async function getBrowser() {
  if (_browser && _browser.connected) return _browser;
  console.log('Launching Chrome…');
  _browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,900',
    ],
  });
  _browser.on('disconnected', () => { _browser = null; });
  return _browser;
}

async function newPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  // Block images/fonts/media to speed up scraping
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (['image','font','media','stylesheet'].includes(req.resourceType())) req.abort();
    else req.continue();
  });
  return page;
}

// ── Image fetcher — visits each listing detail page in parallel batches ────────
// CL detail pages embed full-size images as <img src="..._600x450.jpg"> even
// with JS disabled. Thumbnails (_50x50c) are also present; we convert them to
// full-size by swapping the size suffix.
async function fetchListingImages(listings, concurrency = 5) {
  const browser  = await getBrowser();
  const imageMap = new Map(); // listing.url → string[]

  const work = listings.filter(l => l.url);
  console.log(`  Fetching images for ${work.length} listings (${concurrency} at a time)…`);

  for (let i = 0; i < work.length; i += concurrency) {
    const batch = work.slice(i, i + concurrency);
    await Promise.all(batch.map(async listing => {
      const page = await browser.newPage();
      try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setJavaScriptEnabled(false);
        // Block everything except the HTML document
        await page.setRequestInterception(true);
        page.on('request', req => {
          req.resourceType() === 'document' ? req.continue() : req.abort();
        });
        await page.goto(listing.url, { waitUntil: 'domcontentloaded', timeout: 12000 });

        const images = await page.evaluate(() => {
          const seen = new Set();
          const imgs = [];
          for (const img of document.querySelectorAll('img[src]')) {
            const src = img.getAttribute('src') || '';
            if (!src.includes('images.craigslist.org')) continue;
            // Convert any size variant to 600x450
            const full = src.replace(/_\d+x\d+c?\.jpg/, '_600x450.jpg');
            if (!seen.has(full)) { seen.add(full); imgs.push(full); }
          }
          return imgs.slice(0, 8); // max 8 images per listing
        });

        imageMap.set(listing.url, images);
        if (images.length) console.log(`    ${listing.title?.slice(0,40)} → ${images.length} image(s)`);
      } catch (err) {
        // Non-fatal: listing just won't have images
        console.warn(`    Image fetch failed for "${listing.title?.slice(0,30)}": ${err.message}`);
      } finally {
        await page.close().catch(() => {});
      }
    }));
  }

  return imageMap;
}

// ── EstateSales.org detail-page image scraper ─────────────────────────────────
async function fetchEstateSalesImages(listings, concurrency = 3) {
  const browser  = await getBrowser();
  const imageMap = new Map();
  const work = listings.filter(l => l.url && l.url.includes('estatesales.org'));
  console.log(`  Fetching ES detail images for ${work.length} listings…`);

  // Domains we trust for estate sale photos
  const GOOD_DOMAINS = ['estatesales.org', 'amazonaws.com', 'cloudfront.net', 'imgix.net', 'tlcdn.workers.dev'];
  // Domains we never want (social media icons, tracking pixels, etc.)
  const BAD_DOMAINS  = ['facebook', 'fbcdn', 'twitter', 'instagram', 'youtube',
                        'google-analytics', 'doubleclick', 'pixel', 'analytics',
                        'gravatar', 'wp.com', 'wordpress'];

  for (let i = 0; i < work.length; i += concurrency) {
    const batch = work.slice(i, i + concurrency);
    await Promise.all(batch.map(async listing => {
      const page = await browser.newPage();
      try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setRequestInterception(true);
        page.on('request', req => {
          const t = req.resourceType();
          // Allow document + scripts (needed for React SSR hydration / Next.js JSON data)
          // Block media/fonts to keep it fast
          if (['document','script','xhr','fetch','websocket'].includes(t)) req.continue();
          else req.abort();
        });
        await page.goto(listing.url, { waitUntil: 'domcontentloaded', timeout: 18000 });

        const images = await page.evaluate((goodDomains, badDomains) => {
          const seen = new Set();
          const imgs = [];

          // 0. __NEXT_DATA__ — Next.js embeds all page data here including gallery
          try {
            const nd = document.getElementById('__NEXT_DATA__');
            if (nd) {
              const json = JSON.stringify(JSON.parse(nd.textContent));
              const matches = json.match(/https:\/\/[^"]*(?:eso-cdn\.tlcdn\.workers\.dev|amazonaws\.com|cloudfront\.net|imgix\.net)[^"?]*/g) || [];
              matches.forEach(u => { if (!seen.has(u)) { seen.add(u); imgs.push(u); } });
            }
          } catch (_) {}

          // 1. JSON-LD structured data
          for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
            try {
              const obj = JSON.parse(el.textContent);
              const candidates = [obj.image, obj.photo, obj.thumbnail, ...(obj.images || []), ...(obj.photos || [])].flat().filter(Boolean);
              for (const src of candidates) {
                const url = typeof src === 'string' ? src : src?.url || src?.contentUrl;
                if (!url || !url.startsWith('http')) continue;
                if (!seen.has(url)) { seen.add(url); imgs.push(url); }
              }
            } catch (_) {}
          }

          // 2. OG / Twitter card meta images
          for (const sel of ['meta[property="og:image"]', 'meta[name="twitter:image"]', 'meta[property="og:image:url"]']) {
            const content = document.querySelector(sel)?.getAttribute('content');
            if (content && content.startsWith('http') && !seen.has(content)) {
              seen.add(content); imgs.push(content);
            }
          }

          if (imgs.length >= 3) return imgs.slice(0, 12);

          // 3. Fallback: img tags — check data-src for lazy-loaded images too
          for (const img of document.querySelectorAll('img')) {
            const src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('src') || '';
            if (!src.startsWith('http')) continue;
            if (badDomains.some(d => src.includes(d))) continue;
            if (!goodDomains.some(d => src.includes(d))) continue;
            if (/logo|icon|avatar|badge|btn|star|rating|sprite|nav|menu/i.test(src)) continue;
            const w = parseInt(img.getAttribute('width') || '0', 10);
            const h = parseInt(img.getAttribute('height') || '0', 10);
            if ((w && w < 120) || (h && h < 120)) continue;
            const key = src.split('?')[0];
            if (!seen.has(key)) { seen.add(key); imgs.push(src); }
            if (imgs.length >= 12) break;
          }

          return imgs.slice(0, 12);
        }, GOOD_DOMAINS, BAD_DOMAINS);

        const filteredImgs = images.filter(u => !u.includes('nophoto') && !u.includes('placeholder'));
        imageMap.set(listing.url, filteredImgs);
        if (filteredImgs.length) console.log(`    ES "${listing.title?.slice(0,40)}" → ${filteredImgs.length} img(s)`);
        else console.log(`    ES "${listing.title?.slice(0,40)}" → no images found`);
      } catch (err) {
        console.warn(`    ES img fetch failed for "${listing.title?.slice(0,30)}": ${err.message}`);
      } finally {
        await page.close().catch(() => {});
      }
    }));
  }

  return imageMap;
}

// ── Craigslist scraper ────────────────────────────────────────────────────────
// CL hides the pre-rendered <ol class="cl-static-search-results"> via CSS when
// JS runs. Disabling JS exposes the static HTML which is fully populated.
async function scrapeCraigslist(zip, radiusMi, centerLat, centerLng) {
  const cacheKey = `cl:${zip}:${radiusMi}`;
  const cached   = fromCache(cacheKey);
  if (cached) { console.log('  CL cache hit'); return cached; }

  const url = `https://losangeles.craigslist.org/search/gms?postal=${zip}&search_distance=${radiusMi}`;
  console.log('  Craigslist:', url);

  const browser = await getBrowser();
  const page    = await browser.newPage();
  const results = [];

  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setJavaScriptEnabled(false);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    const items = await page.evaluate(() => {
      const cards = document.querySelectorAll('li.cl-static-search-result');
      return Array.from(cards).map(card => ({
        title:    card.querySelector('.title')?.textContent?.trim()    || '',
        price:    card.querySelector('.price')?.textContent?.trim()    || '',
        location: card.querySelector('.location')?.textContent?.trim() || '',
        url:      card.querySelector('a')?.href                        || '',
      }));
    });

    console.log(`  CL found ${items.length} listings — fetching images…`);
    await page.close().catch(() => {});

    // Build result objects first (without images)
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.title) continue;
      const neighborhood = item.location || 'Nearby';

      // Geocode the neighborhood: local table first, Nominatim fallback
      let clDistMi = 0;
      let clLat = null, clLng = null;
      let clPx = { x: 28 + (i % 8) * 7, y: 22 + (i % 5) * 13 };
      if (neighborhood && neighborhood !== 'Nearby') {
        const key = neighborhood.toLowerCase().trim();
        const cacheKey = `addr:${key.replace(/\s+/g,'-')}`;
        let coords = fromCache(cacheKey) || LA_NEIGHBORHOODS[key];
        // partial match: try dropping extra words (e.g. "east whittier" → "whittier")
        if (!coords) {
          const parts = key.split(/\s+/);
          for (let p = parts.length - 1; p >= 1; p--) {
            const sub = parts.slice(parts.length - p).join(' ');
            if (LA_NEIGHBORHOODS[sub]) { coords = LA_NEIGHBORHOODS[sub]; break; }
          }
        }
        if (!coords) {
          try {
            const res  = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(neighborhood + ', Los Angeles County, CA')}&format=json&limit=1`,
              { headers: { 'User-Agent': 'RummageApp/1.0 (local dev)' } }
            );
            const data = await res.json();
            if (data[0]) {
              coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
              toCache(cacheKey, coords);
            }
          } catch (_) {}
        }
        if (coords) {
          clLat = coords.lat; clLng = coords.lng;
          clDistMi = parseFloat(distanceMiles(centerLat, centerLng, coords.lat, coords.lng).toFixed(1));
          clPx = pinXY(coords.lat, coords.lng, centerLat, centerLng, radiusMi);
        }
      }
      // Fallback for any listing where geocoding was unavailable
      if (!clLat) {
        const angle = (i / 10) * 2 * Math.PI;
        const rv = 0.25 + Math.random() * 0.5;
        clLat = centerLat + Math.cos(angle) * rv * (radiusMi / 69);
        clLng = centerLng + Math.sin(angle) * rv * (radiusMi / 55);
        clDistMi = parseFloat(distanceMiles(centerLat, centerLng, clLat, clLng).toFixed(1));
        clPx = pinXY(clLat, clLng, centerLat, centerLng, radiusMi);
      }

      results.push({
        id:          `cl-${i}-${Date.now()}`,
        source:      'craigslist',
        type:        detectType(item.title),
        title:       item.title,
        address:     neighborhood,
        neighborhood,
        distanceMi:  clDistMi,
        lat:         clLat,
        lng:         clLng,
        dateLabel:   '',
        timeLabel:   '',
        photoCount:  0,
        images:      [],
        live:        false,
        blurb:       '',
        price:       item.price !== '$0' ? item.price : '',
        items:       [],
        url:         item.url,
        x:           Math.max(5, Math.min(95, clPx.x)),
        y:           Math.max(5, Math.min(95, clPx.y)),
      });
    }

    // Enrich with images in parallel
    const imageMap = await fetchListingImages(results);
    for (const listing of results) {
      const imgs = imageMap.get(listing.url) || [];
      listing.images     = imgs;
      listing.photoCount = imgs.length;
    }

    console.log(`  CL done — ${results.length} listings with images`);
    toCache(cacheKey, results);
  } catch (err) {
    console.warn('  CL error:', err.message);
    await page.close().catch(() => {});
  }

  return results;
}

// ── OfferUp scraper ───────────────────────────────────────────────────────────
async function scrapeOfferUp(zip, radiusMi, centerLat, centerLng) {
  const cacheKey = `ou:${zip}:${radiusMi}`;
  const cached   = fromCache(cacheKey);
  if (cached) { console.log('  OU cache hit'); return cached; }

  const queries = ['yard sale', 'estate sale', 'garage sale'];
  const browser = await getBrowser();
  const results = [];
  const seen    = new Set();

  for (const q of queries) {
    // Use lat/lng so OfferUp uses the correct area, not the server's IP location
    const url = `https://offerup.com/search/?q=${encodeURIComponent(q)}&lat=${centerLat}&lng=${centerLng}&radius=${radiusMi}&location=${zip}`;
    console.log('  OfferUp:', url);
    const page = await newPage(browser);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });

      // Strategy 1: Extract from __NEXT_DATA__ JSON embedded by Next.js
      let items = await page.evaluate(() => {
        try {
          const el = document.getElementById('__NEXT_DATA__');
          if (!el) return null;
          const data = JSON.parse(el.textContent);
          // Walk the props tree to find listings arrays
          const json = JSON.stringify(data);
          const listings = [];
          function extractImg(o) {
            const imgKeys = ['imageUrl','thumbnailUrl','photoUrl','pictureUrl','coverPhoto',
                             'previewImageUrl','listingImageUrl','heroImage','primaryImage',
                             'coverImage','image_url','photo_url','thumbnail_url'];
            for (const k of imgKeys) {
              const v = o[k];
              if (typeof v === 'string' && v.startsWith('http')) return v;
            }
            for (const k of ['images','photos','imageUrls','photoUrls']) {
              const v = o[k];
              if (Array.isArray(v) && v.length) {
                const f = v[0];
                if (typeof f === 'string' && f.startsWith('http')) return f;
                if (f?.url) return f.url;
                if (f?.id) return `https://images.offerup.com/${f.id}/${f.id}.jpg`;
              }
            }
            return '';
          }
          function walk(obj) {
            if (!obj || typeof obj !== 'object') return;
            if (Array.isArray(obj)) { obj.forEach(walk); return; }
            if ((obj.title || obj.name) && (obj.price !== undefined || extractImg(obj))) {
              const title = obj.title || obj.name || '';
              const price = obj.price !== undefined ? `$${obj.price}` : (obj.priceString || '');
              const img   = extractImg(obj);
              const id    = obj.id || obj.listingId || '';
              const dist  = obj.distance || obj.distanceMi || 0;
              // Location: try common field names
              const loc = obj.location || obj.city || obj.locationName || obj.cityName ||
                          obj.seller?.location || obj.seller?.city ||
                          (obj.location_slug && obj.location_slug.replace(/-/g,' ')) || '';
              if (title.length > 3) listings.push({ title, price, img, id, dist, loc });
            }
            Object.values(obj).forEach(walk);
          }
          walk(data);
          // Fallback: pull CDN image URLs from raw JSON and attach to img-less listings
          if (listings.length && listings.every(l => !l.img)) {
            const cdnUrls = [...new Set(
              (json.match(/https:\/\/[^"]*(?:images\.offerup\.com|offerupcdn\.com)[^"?#]*/g) || [])
              .filter(u => /\.(jpg|jpeg|png|webp)/i.test(u))
            )];
            listings.forEach((l, i) => { if (!l.img && cdnUrls[i]) l.img = cdnUrls[i]; });
          }
          return listings.length ? listings : null;
        } catch (_) { return null; }
      });

      // Strategy 2: DOM scraping with current selectors
      if (!items || items.length === 0) {
        await page.waitForSelector(
          '[data-testid="listing-card"], [data-testid="post-tile"], [class*="ListingCard"], [class*="PostCard"], article',
          { timeout: 8000 }
        ).catch(() => {});

        items = await page.evaluate(() => {
          const selectors = [
            '[data-testid="listing-card"]',
            '[data-testid="post-tile"]',
            '[class*="ListingCard"]',
            '[class*="PostCard"]',
            'li[class*="item"]',
          ];
          let cards = [];
          for (const sel of selectors) {
            const found = document.querySelectorAll(sel);
            if (found.length >= 2) { cards = Array.from(found); break; }
          }
          if (!cards.length) {
            // Last resort: any card-like element with an image and text
            cards = Array.from(document.querySelectorAll('a[href*="/item/"]'));
          }
          return cards.slice(0, 30).map(card => {
            const titleEl = card.querySelector('[data-testid="listing-title"], [class*="title"], h2, h3, p');
            const priceEl = card.querySelector('[data-testid="listing-price"], [class*="price"], [class*="Price"]');
            const imgEl   = card.querySelector('img');
            const link    = card.tagName === 'A' ? card : card.querySelector('a[href*="/item/"]');
            return {
              title: titleEl?.textContent?.trim() || '',
              price: priceEl?.textContent?.trim() || '',
              img:   imgEl?.src || imgEl?.dataset?.src || '',
              id:    '',
              dist:  0,
              url:   link ? (link.href || 'https://offerup.com' + (link.getAttribute('href') || '')) : '',
            };
          }).filter(x => x.title.length > 3);
        });
      }

      console.log(`  OU "${q}" → ${items ? items.length : 0} items`);

      for (const item of (items || [])) {
        if (!item.title || seen.has(item.title)) continue;
        seen.add(item.title);
        const listingUrl = item.url || (item.id ? `https://offerup.com/item/detail/${item.id}` : '');

        // Geocode the listing's city to get real coordinates and real distance
        let ouLat = null, ouLng = null, distMi = null;
        if (item.loc) {
          // "Riverside County, CA" → "riverside county", "Menifee, CA" → "menifee"
          const cityKey = item.loc.toLowerCase().replace(/,.*$/, '').replace(/\s+county$/, ' county').trim();
          const coords = LA_NEIGHBORHOODS[cityKey] || LA_NEIGHBORHOODS[cityKey.replace(' county','')];
          if (coords) {
            ouLat = coords.lat;
            ouLng = coords.lng;
            distMi = parseFloat(distanceMiles(centerLat, centerLng, ouLat, ouLng).toFixed(1));
          }
        }
        // Skip listings whose city geocodes to beyond the search radius
        if (distMi !== null && distMi > radiusMi) continue;

        // For listings without geocodable city: place randomly near center
        if (!ouLat) {
          ouLat = centerLat + (Math.random()-0.5)*0.08;
          ouLng = centerLng + (Math.random()-0.5)*0.08;
          distMi = parseFloat(distanceMiles(centerLat, centerLng, ouLat, ouLng).toFixed(1));
        }

        const px = pinXY(ouLat, ouLng, centerLat, centerLng, radiusMi);
        results.push({
          id:           `ou-${results.length}-${Date.now()}`,
          source:       'offerup',
          type:         detectType(item.title + ' ' + q),
          title:        item.title,
          address:      item.loc || '',
          neighborhood: item.loc || 'Nearby',
          distanceMi:   distMi,
          lat:          ouLat,
          lng:          ouLng,
          dateLabel:    '',
          timeLabel:    '',
          photoCount:   item.img ? 1 : 0,
          images:       item.img ? [item.img] : [],
          live:         false,
          blurb:        '',
          price:        item.price,
          items:        [],
          url:          listingUrl,
          x:            px.x,
          y:            px.y,
        });
      }
    } catch (err) {
      console.warn(`  OU "${q}" error:`, err.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  toCache(cacheKey, results);
  return results;
}

// ── EstateSales.org scraper ───────────────────────────────────────────────────
const ZIP_TO_CITY = {
  '90601':'whittier','90602':'whittier','90603':'whittier','90604':'whittier','90605':'whittier','90606':'whittier',
  '90638':'la-mirada','90650':'norwalk','90660':'pico-rivera','90670':'santa-fe-springs',
  '91010':'duarte','91702':'azusa','91706':'baldwin-park','91710':'chino','91711':'claremont',
  '91740':'glendora','91741':'glendora','91744':'la-puente','91745':'hacienda-heights',
  '91746':'la-puente','91748':'rowland-heights','91765':'diamond-bar','91766':'pomona','91770':'rosemead',
};

function parseEstateSaleDate(text) {
  if (!text) return '';
  // 1. Named month: "Jun 20, 2026", "June 20-21, 2026", "Sat. Jun 20, 2026"
  const named = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?,?\s*\d{4}/i);
  if (named) return named[0].replace(/\.$/, '').trim();
  // 2. "Ends 6/28", "Bidding ends June 28", "Sale Ends 6/24"
  const endsNamed = text.match(/(?:ends?|bidding\s+ends?|sale\s+ends?)\s+(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s*\d{4})?)/i);
  if (endsNamed) return `Ends ${endsNamed[0].replace(/^.*?ends?\s+/i,'').trim()}`;
  const endsSlash = text.match(/(?:ends?|bidding\s+ends?|sale\s+ends?)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i);
  if (endsSlash) return `Ends ${endsSlash[1]}`;
  // 3. Plain M/D/YYYY or M/D/YY
  const slash = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
  if (slash) return slash[1];
  // 4. Plain M/D (no year — likely current/next month)
  const md = text.match(/\b(\d{1,2}\/\d{1,2})\b/);
  if (md) return md[1];
  return '';
}

function parseEstateSaleTime(text) {
  const m = text.match(/\d{1,2}(?::\d{2})?\s*(?:AM|PM)\s*(?:[-–]\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM))?/i);
  return m ? m[0].trim() : '';
}

async function scrapeEstateSales(zip, radiusMi, centerLat, centerLng) {
  const cacheKey = `es:${zip}:${radiusMi}`;
  const cached   = fromCache(cacheKey);
  if (cached) { console.log('  EstateSales cache hit'); return cached; }

  const city    = ZIP_TO_CITY[zip] || 'whittier';
  const results = [];

  // Try city-specific first, fall back to LA county, then all of CA
  const urls = [
    `https://estatesales.org/estate-sales/ca/${city}`,
    `https://estatesales.org/estate-sales/ca/los-angeles-county`,
    `https://estatesales.org/estate-sales/ca`,
  ];

  const browser = await getBrowser();

  for (const url of urls) {
    console.log('  EstateSales:', url);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });

      // Wait for any sale content to appear
      await page.waitForFunction(
        () => document.querySelectorAll('h3 a, h2 a, [class*="sale"] a').length > 0,
        { timeout: 10000 }
      ).catch(() => {});

      const items = await page.evaluate(() => {
        const seen  = new Set();
        const found = [];

        // Strategy A: find all h3 > a links that look like sale detail pages
        const anchors = Array.from(document.querySelectorAll('h3 a[href*="/estate-sales/"], h2 a[href*="/estate-sales/"]'));
        anchors.forEach(a => {
          const href = a.href;
          if (seen.has(href)) return;
          seen.add(href);

          // Walk up to find the card container
          let card = a.closest('li, article, [class*="sale"], [class*="card"], [class*="item"]') || a.parentElement?.parentElement;

          const title    = a.textContent.trim();
          const fullText = card ? card.innerText : '';
          const imgEl    = card ? card.querySelector('img') : null;
          const img      = imgEl
            ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('data-lazy-src') ||
               imgEl.getAttribute('data-original') || imgEl.getAttribute('data-lazy') ||
               (imgEl.srcset && imgEl.srcset.split(',')[0]?.trim().split(' ')[0]) ||
               (imgEl.src && !imgEl.src.startsWith('data:') && imgEl.src.includes('http') ? imgEl.src : ''))
            : '';

          // City/location: find a city-level link (exactly 3 path segments: estate-sales/ca/city)
          // Detail-page links have 5+ segments — exclude those to avoid grabbing the title link
          const locEl = card ? Array.from(card.querySelectorAll('a[href*="/estate-sales/ca/"]')).find(el => {
            const parts = el.pathname.split('/').filter(Boolean);
            return parts.length === 3; // /estate-sales/ca/city-name
          }) : null;
          const location = locEl ? locEl.textContent.trim() : '';

          // Company name: links to /estate-sale-companies/
          const coEl   = card ? card.querySelector('a[href*="/estate-sale-companies/"]') : null;
          const company = coEl ? coEl.textContent.trim() : '';

          found.push({ title, href, img, fullText, location, company });
        });

        // Strategy B: fallback — any <a> whose href has 4+ path segments (detail page)
        if (found.length === 0) {
          document.querySelectorAll('a[href*="/estate-sales/ca/"]').forEach(a => {
            const parts = (a.pathname || '').split('/').filter(Boolean);
            if (parts.length < 4) return;
            const href = a.href;
            if (seen.has(href)) return;
            seen.add(href);
            const img = a.querySelector('img')?.src || '';
            found.push({ title: a.textContent.trim(), href, img, fullText: a.innerText, location: '', company: '' });
          });
        }

        return found.slice(0, 30);
      });

      console.log(`  EstateSales found ${items.length} items from ${url}`);
      await page.close().catch(() => {});

      if (items.length === 0) continue; // try next URL

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.title || item.title.length < 4) continue;
        if (!item.href.includes('estatesales.org')) continue;

        const dateLabel = parseEstateSaleDate(item.fullText);
        const timeLabel = parseEstateSaleTime(item.fullText);

        // Extract ZIP from URL path (e.g. /California/Whittier/90601/sale-name)
        const urlZip = (item.href.match(/\/(\d{5})\//) || [])[1] || null;
        // Also scan fullText for a ZIP code
        const textZip = urlZip || (item.fullText.match(/\b(\d{5})\b/) || [])[1] || null;

        let distMi = radiusMi * 0.5; // fallback: half the search radius
        let esLat = null, esLng = null;
        let px = { x: 50, y: 50 };
        if (textZip) {
          const coords = await geocodeZip(textZip).catch(() => null);
          if (coords) {
            esLat = coords.lat; esLng = coords.lng;
            distMi = parseFloat(distanceMiles(centerLat, centerLng, coords.lat, coords.lng).toFixed(1));
            px = pinXY(coords.lat, coords.lng, centerLat, centerLng, radiusMi);
          }
        } else {
          // Spread around center if no ZIP found
          const angle = (i / items.length) * 2 * Math.PI;
          const rv    = 0.3 + Math.random() * 0.4;
          px = { x: Math.round(50 + Math.cos(angle) * rv * 40), y: Math.round(50 + Math.sin(angle) * rv * 30) };
        }

        // Extract city from URL pathname: /estate-sales/ca/{city-slug}/{id}/{name}
        let cityName = '';
        try {
          const pathParts = new URL(item.href).pathname.split('/').filter(Boolean);
          // pathParts: ['estate-sales', 'ca', 'city-slug', 'id', 'sale-name']
          const citySlug = pathParts.length >= 3 ? pathParts[2] : '';
          cityName = citySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        } catch (_) {}

        // Filter out estatesales.org's own "no photo" placeholder
        const esImg = item.img && !item.img.includes('nophoto') ? item.img : '';

        results.push({
          id:           `es-${i}-${Date.now()}`,
          source:       'estatesales',
          type:         'estate',
          title:        item.title,
          address:      cityName || 'See listing',
          neighborhood: cityName || 'Nearby',
          distanceMi:   distMi,
          lat:          esLat,
          lng:          esLng,
          dateLabel,
          timeLabel,
          photoCount:   esImg ? 1 : 0,
          images:       esImg ? [esImg] : [],
          live:         false,
          blurb:        item.company ? `Hosted by ${item.company}` : '',
          price:        '',
          items:        [],
          url:          item.href,
          x:            Math.max(10, Math.min(90, px.x)),
          y:            Math.max(10, Math.min(90, px.y)),
        });
      }

      // Enrich with detail-page gallery images
      const imageMap = await fetchEstateSalesImages(results);
      for (const listing of results) {
        const imgs = imageMap.get(listing.url) || [];
        if (imgs.length) {
          listing.images     = imgs;
          listing.photoCount = imgs.length;
        }
      }

      break; // got results — stop trying fallback URLs
    } catch (err) {
      console.warn(`  EstateSales error (${url}):`, err.message);
      await page.close().catch(() => {});
    }
  }

  console.log(`  EstateSales done — ${results.length} listings`);
  toCache(cacheKey, results);
  return results;
}

// ── Google Custom Search (optional — needs API key) ────────────────────────────
async function fetchGoogleListings(zip) {
  const key = process.env.GOOGLE_API_KEY;
  const cx  = process.env.GOOGLE_CX;
  if (!key || !cx) return [];

  const cacheKey = `goog:${zip}`;
  const cached   = fromCache(cacheKey);
  if (cached) return cached;

  const queries = [
    `yard sale estate sale ${zip}`,
    `garage sale moving sale near ${zip}`,
  ];
  const results = [];

  for (const q of queries) {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${encodeURIComponent(q)}&num=10`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.items) {
        for (const item of data.items) {
          results.push({
            id:          `goog-${results.length}-${Date.now()}`,
            source:      'google',
            type:        detectType(item.title + ' ' + (item.snippet || '')),
            title:       item.title,
            address:     '',
            neighborhood: 'Nearby',
            distanceMi:  0,
            dateLabel:   '',
            timeLabel:   '',
            photoCount:  0,
            photos:      item.pagemap?.cse_image?.[0]?.src ? [item.pagemap.cse_image[0].src] : [],
            live:        false,
            blurb:       item.snippet || '',
            price:       '',
            items:       [],
            url:         item.link,
            x:           50 + (results.length % 6) * 6,
            y:           30 + (results.length % 4) * 12,
          });
        }
      }
    } catch (err) {
      console.warn('Google search error:', err.message);
    }
  }

  toCache(cacheKey, results);
  return results;
}

// ── Main route ────────────────────────────────────────────────────────────────
app.get('/api/listings', async (req, res) => {
  const zip      = String(req.query.zip || '90601').replace(/\D/g, '').slice(0, 5);
  const radiusMi = Math.min(50, Math.max(1, parseInt(req.query.radius || '10', 10)));

  if (zip.length !== 5) return res.status(400).json({ error: 'Invalid ZIP' });

  const cacheKey = `all:${zip}:${radiusMi}`;
  const cached   = fromCache(cacheKey);
  if (cached) {
    console.log('Cache hit:', cacheKey);
    return res.json({ zip, radiusMi, count: cached.length, listings: cached, cached: true });
  }

  console.log(`\nFetching listings — zip=${zip} radius=${radiusMi}mi`);
  const center = await geocodeZip(zip);
  if (!center) return res.status(500).json({ error: `Cannot geocode ZIP: ${zip}`, listings: [] });

  // Run all scrapers in parallel
  const [clListings, ouListings, esListings, googleListings] = await Promise.allSettled([
    scrapeCraigslist(zip, radiusMi, center.lat, center.lng),
    scrapeOfferUp(zip, radiusMi, center.lat, center.lng),
    scrapeEstateSales(zip, radiusMi, center.lat, center.lng),
    fetchGoogleListings(zip),
  ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : []));

  const all = [...clListings, ...ouListings, ...esListings, ...googleListings];
  console.log(`Total: ${all.length} (CL=${clListings.length} OU=${ouListings.length} ES=${esListings.length} G=${googleListings.length})`);

  toCache(cacheKey, all);
  res.json({ zip, radiusMi, count: all.length, listings: all });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, cached: cache.size, uptime: Math.round(process.uptime()), chrome: CHROME_PATH });
});

app.post('/api/clear-cache', (_req, res) => {
  cache.clear();
  console.log('Cache cleared');
  res.json({ ok: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🧺 Rummage backend  →  http://localhost:${PORT}`);
  console.log(`   Listings: /api/listings?zip=90601&radius=10`);
  console.log(`   Health:   /api/health`);
  console.log(`   Chrome:   ${CHROME_PATH}`);
  console.log(`   Google:   ${process.env.GOOGLE_API_KEY ? 'configured ✓' : 'not configured (optional)'}\n`);
});
