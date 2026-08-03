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
// Full `puppeteer` (not puppeteer-core) so a hosted Linux deploy has a
// Chromium binary to launch out of the box — CHROME_PATH below still lets
// local dev point at the system Chrome instead of downloading a second one.
const puppeteer = require('puppeteer');
const sharp     = require('sharp');
const path      = require('path');
const fs        = require('fs');

const app  = express();
const PORT = process.env.PORT || 8080;
// Email images need absolute URLs (unlike the app's own relative /api/img
// calls), so digest emails need to know their own public origin to build them.
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'https://rummage-lgxw.onrender.com';

app.use(cors());
// Default 100kb is way too small for a base64-encoded photo upload (Price
// Check feature) -- the client downscales images before sending, but a
// generous limit is still needed as headroom.
app.use(express.json({ limit: '12mb' }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// In-memory verification codes: email → { code, expiresAt }
const verifyCodes = new Map();

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Shared Resend sender — dev mode (no RESEND_API_KEY) just logs to console,
// same fallback the verification-code flow already relied on.
const RESEND_FROM = process.env.RESEND_FROM || 'Rummage <hello@rummagedeals.com>';
async function sendResendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`\n📬 DEV MODE — email to ${to}: ${subject}\n`);
    return { ok: true, devMode: true };
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html, text }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || r.statusText);
  return { ok: true, id: data.id };
}

// Normalizes a user-entered phone number to E.164, assuming a US number
// when no country code is given (bare 10 digits). Returns null if it
// doesn't look like a real phone number.
function normalizePhone(raw) {
  const digits = (raw || '').replace(/[^\d+]/g, '');
  if (/^\+\d{8,15}$/.test(digits)) return digits;
  if (/^\d{10}$/.test(digits)) return '+1' + digits;
  if (/^1\d{10}$/.test(digits)) return '+' + digits;
  return null;
}

// Shared Twilio SMS sender — dev mode (no TWILIO_* env vars) just logs to
// console, same fallback pattern as sendResendEmail above.
async function sendTwilioSMS({ to, body }) {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    console.log(`\n📱 DEV MODE — SMS to ${to}: ${body}\n`);
    return { ok: true, devMode: true };
  }
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || r.statusText);
  return { ok: true, id: data.sid };
}

// POST /api/send-verification  { email }
// Reverted from phone/Twilio SMS back to email/Resend -- the toll-free SMS
// number is stuck in a Twilio verification limbo (rejected, then blocked
// from re-registering entirely) with no fast resolution in sight, while
// Resend email has been working reliably all along. sendTwilioSMS() and
// normalizePhone() above are left in place, unused, in case SMS verification
// gets revisited once/if the Twilio account issue is resolved.
app.post('/api/send-verification', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email || !/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: 'Enter a valid email' });

  const code = makeCode();
  verifyCodes.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 });

  const html = `
  <div style="background:#EDE6D6;padding:32px 16px">
    <div style="max-width:480px;margin:0 auto;background:#FBF8F0;border-radius:16px;padding:32px 24px;font-family:Arial,Helvetica,sans-serif;text-align:center">
      <div style="display:inline-block;width:60px;height:60px;border-radius:50%;background:#C1272D;line-height:60px;font-size:28px">📍</div>
      <h1 style="font-size:24px;font-weight:900;color:#211D17;margin:16px 0 4px;letter-spacing:-0.02em">Verify your email</h1>
      <p style="color:#6B6252;font-size:14px;margin:0 0 24px">Enter this code in Rummage to confirm your account.</p>
      <div style="background:#F1EAD6;border-radius:12px;padding:24px;margin:0 0 20px">
        <div style="font-size:38px;font-weight:900;letter-spacing:10px;color:#C1272D;font-family:monospace">${code}</div>
      </div>
      <p style="color:#9C9280;font-size:12px;margin:0">Expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  </div>`;

  try {
    const result = await sendResendEmail({
      to: email,
      subject: `${code} is your Rummage verification code`,
      html,
      text: `Your Rummage verification code is: ${code}\n\nExpires in 10 minutes.`,
    });
    if (result.devMode) return res.json(result);
    console.log(`✉️  Verification email sent to ${email} (id: ${result.id})`);
    res.json({ ok: true });
  } catch (err) {
    console.error('Resend error:', err.message);
    res.status(500).json({ error: 'Failed to send email: ' + err.message });
  }
});

// POST /api/check-code  { email, code }
app.post('/api/check-code', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const code  = (req.body.code || '').trim();
  const entry = verifyCodes.get(email);

  if (!entry)              return res.status(400).json({ error: 'No code found for this email' });
  if (Date.now() > entry.expiresAt) { verifyCodes.delete(email); return res.status(400).json({ error: 'Code expired' }); }
  if (entry.code !== code) return res.status(400).json({ error: 'Incorrect code' });

  verifyCodes.delete(email);
  res.json({ ok: true });
});

// ── Sign in with Apple ──────────────────────────────────────────────────────
// Verifies the identity token Apple's JS SDK hands back client-side after a
// successful sign-in. This only checks the token's signature/claims against
// Apple's public keys -- no client secret or server-to-server token exchange
// needed, matching the rest of the app's "no persistent user database"
// design (see Privacy screen): once verified, we just hand the caller back
// the identity to store locally, same as the email-code flow already does.
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const appleJwks = jwksClient({ jwksUri: 'https://appleid.apple.com/auth/keys' });

function getAppleSigningKey(header, callback) {
  appleJwks.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

// The identity token's `aud` claim is the Services ID for the web JS SDK
// flow this app actually uses (com.rummagedeals.web, matching clientId in
// index.html's AppleID.auth.init call) -- not the app's bundle ID, which
// only applies to a true native Sign In with Apple integration.
const APPLE_AUDIENCES = (process.env.APPLE_AUDIENCES || 'com.rummagedeals.web,com.rummagedeals.app')
  .split(',').map(s => s.trim()).filter(Boolean);

function verifyAppleIdentityToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getAppleSigningKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      audience: APPLE_AUDIENCES,
    }, (err, decoded) => err ? reject(err) : resolve(decoded));
  });
}

// POST /api/auth/apple  { identityToken, name? }
// `name` is only ever sent by the client on a user's very first Apple
// sign-in -- Apple only includes it once and never again, so the client is
// responsible for capturing and forwarding it that one time.
app.post('/api/auth/apple', async (req, res) => {
  const { identityToken, name } = req.body;
  if (!identityToken) return res.status(400).json({ error: 'Missing identity token' });
  try {
    const claims = await verifyAppleIdentityToken(identityToken);
    res.json({ email: claims.email || null, name: name || null, appleSub: claims.sub });
  } catch (err) {
    console.error('Apple sign-in verification failed:', err.message);
    res.status(401).json({ error: "Could not verify Apple sign-in — please try again." });
  }
});

// POST /api/feedback  { category, message, userEmail }
// Sends straight to the developer's inbox via the same Resend integration
// used for verification codes — no separate ticketing system for a beta.
const FEEDBACK_TO_EMAIL = process.env.FEEDBACK_EMAIL || 'rummagedealsapp@gmail.com';
const FEEDBACK_CAT_LABELS = { general: 'General feedback', bug: 'Bug report', feature: 'Feature request', listing: 'Listing issue' };
app.post('/api/feedback', async (req, res) => {
  const message  = (req.body.message || '').trim().slice(0, 2000);
  const category = FEEDBACK_CAT_LABELS[req.body.category] || 'General';
  const userEmail = (req.body.userEmail || '').trim();
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const html = `
  <div style="background:#EDE6D6;padding:32px 16px">
    <div style="max-width:480px;margin:0 auto;background:#FBF8F0;border-radius:16px;padding:32px 24px;font-family:Arial,Helvetica,sans-serif">
      <h1 style="font-size:22px;font-weight:900;color:#211D17;margin:0 0 4px;letter-spacing:-0.02em">Rummage feedback — ${category}</h1>
      <p style="color:#9C9280;font-size:13px;margin:0 0 20px">${userEmail ? `From ${userEmail}` : 'From a signed-out user'}</p>
      <div style="background:#F1EAD6;border-left:3px solid #C1272D;border-radius:8px;padding:20px;white-space:pre-wrap;color:#211D17;font-size:15px;line-height:1.6">${message.replace(/</g,'&lt;')}</div>
    </div>
  </div>`;

  try {
    await sendResendEmail({
      to: FEEDBACK_TO_EMAIL,
      subject: `[Rummage feedback] ${category}${userEmail ? ' — ' + userEmail : ''}`,
      html,
      text: `${category}\nFrom: ${userEmail || '(signed out)'}\n\n${message}`,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Feedback email failed:', err.message);
    res.status(500).json({ error: 'Failed to send feedback: ' + err.message });
  }
});

// ── Image proxy (bypasses hotlink protection on estatesales.org) ─────────────
app.get('/api/img', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing url');

  let parsed;
  try { parsed = new URL(url); } catch { return res.status(400).send('Invalid url'); }

  const allowed = ['estatesales.org', 'www.estatesales.org', 'estatesales.net', 'picturescdn.estatesales.net', 'images.craigslist.org', 'thumbs3.ebaystatic.com', 'amazonaws.com', 'cloudfront.net', 'tlcdn.workers.dev', 'imgix.net', 'offerup.com', 'offerupcdn.com', 'maps.geoapify.com', 'fbcdn.net', 'facebook.com', 'scontent.fnonstd.com', 'tlstatic.com', 'esgtphotos.com', 'liveauctioneers.com', 'estatesale.com', 'auctionninja.com', 'gsalr.com'];
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
    let buf = Buffer.from(await r.arrayBuffer());

    // WKWebView's image decoder (used by the native iOS app) can't handle
    // WebP at all -- some sources (EstateSales.org's CDN especially) serve
    // photos as .webp, which silently fails to decode there (though it's
    // fine in a regular browser). Converting to JPEG here fixes it for
    // every client uniformly, not just iOS.
    let outCt = ct;
    if (ct.includes('webp') || /\.webp(\?|$)/i.test(url)) {
      try {
        buf = await sharp(buf).jpeg({ quality: 85 }).toBuffer();
        outCt = 'image/jpeg';
      } catch (err) {
        console.warn('WebP->JPEG conversion failed, serving original:', err.message);
      }
    }

    res.set('Content-Type', outCt);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buf);
  } catch (err) {
    console.warn('Image proxy error:', err.message);
    res.status(502).send('Proxy error');
  }
});

// ── Serve the frontend ────────────────────────────────────────────────────────
// Marketing landing page lives at the root; the actual app moved to /app so
// rummagedeals.com/ can be a proper SEO/sharing landing page instead of
// dropping straight into the phone-frame SPA.
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'landing.html')));
app.get(['/app', '/app/'], (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
// Public, standalone versions of the in-app Privacy/Terms screens -- App
// Store Connect requires a real reachable URL for these, not just content
// buried inside the app itself.
app.get(['/privacy', '/privacy/'], (_req, res) => res.sendFile(path.join(__dirname, 'privacy.html')));
app.get(['/terms', '/terms/'], (_req, res) => res.sendFile(path.join(__dirname, 'terms.html')));
app.get('/auth/apple/callback', (_req, res) => res.sendFile(path.join(__dirname, 'apple-callback.html')));

// Standalone static page (not the React SPA) documenting SMS opt-in consent
// -- required as "Opt-In Policy Proof" for Twilio Toll-Free Verification.
// Needs to be a real, directly-loadable URL a carrier reviewer can open
// without interacting with the app, which the in-app Privacy Policy screen
// (client-side routed, no dedicated URL) can't provide.
app.get('/sms-consent', (_req, res) => res.sendFile(path.join(__dirname, 'sms-consent.html')));

// ── Chrome path ───────────────────────────────────────────────────────────────
// Local Windows dev points at the already-installed system Chrome (faster,
// no redundant download). Everywhere else (a hosted Linux box), leave this
// undefined so puppeteer launches its own bundled Chromium instead.
const CHROME_PATH =
  process.env.CHROME_PATH ||
  (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);

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
  // Orange County – North
  'anaheim':{'lat':33.8353,'lng':-117.9145},'fullerton':{'lat':33.8703,'lng':-117.9242},
  'yorba linda':{'lat':33.8886,'lng':-117.8131},'brea':{'lat':33.9167,'lng':-117.9003},
  'placentia':{'lat':33.8722,'lng':-117.8703},'buena park':{'lat':33.8675,'lng':-118.0003},
  'orange':{'lat':33.7879,'lng':-117.8531},'santa ana':{'lat':33.7455,'lng':-117.8677},
  'costa mesa':{'lat':33.6411,'lng':-117.9187},'irvine':{'lat':33.6846,'lng':-117.8265},
  'huntington beach':{'lat':33.6603,'lng':-117.9992},'garden grove':{'lat':33.7743,'lng':-117.9378},
  'tustin':{'lat':33.7458,'lng':-117.8261},'seal beach':{'lat':33.7414,'lng':-118.1047},
  'westminster':{'lat':33.7514,'lng':-117.9939},'fountain valley':{'lat':33.7092,'lng':-117.9536},
  'stanton':{'lat':33.8022,'lng':-117.9931},'cypress':{'lat':33.8169,'lng':-118.0373},
  'la palma':{'lat':33.8467,'lng':-118.0467},'los alamitos':{'lat':33.8028,'lng':-118.0728},
  'villa park':{'lat':33.8139,'lng':-117.8131},'la habra':{'lat':33.9317,'lng':-117.9461},
  // Orange County – South
  'newport beach':{'lat':33.6189,'lng':-117.9289},'laguna beach':{'lat':33.5422,'lng':-117.7831},
  'laguna niguel':{'lat':33.5225,'lng':-117.7050},'laguna hills':{'lat':33.5803,'lng':-117.7300},
  'laguna woods':{'lat':33.6100,'lng':-117.7253},'aliso viejo':{'lat':33.5769,'lng':-117.7256},
  'mission viejo':{'lat':33.6000,'lng':-117.6719},'lake forest':{'lat':33.6469,'lng':-117.6894},
  'rancho santa margarita':{'lat':33.6408,'lng':-117.5990},'foothill ranch':{'lat':33.6869,'lng':-117.6578},
  'trabuco canyon':{'lat':33.6603,'lng':-117.5697},'coto de caza':{'lat':33.5994,'lng':-117.5911},
  'ladera ranch':{'lat':33.5631,'lng':-117.6367},'san juan capistrano':{'lat':33.5017,'lng':-117.6625},
  'dana point':{'lat':33.4669,'lng':-117.6981},'san clemente':{'lat':33.4269,'lng':-117.6111},
  'capistrano beach':{'lat':33.4678,'lng':-117.6617},'el toro':{'lat':33.6314,'lng':-117.6964},
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

const fetchTimeout = (url, ms = 5000, opts = {}) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
};

async function geocodeZip(zip) {
  if (ZIP_COORDS[zip]) return ZIP_COORDS[zip];
  const cached = fromCache(`geo:${zip}`);
  if (cached) return cached;
  const errors = [];
  // Census Bureau ZIP geocoding — free, no key, fast
  try {
    const res  = await fetchTimeout(
      `https://geocoding.geo.census.gov/geocoder/locations/address?street=1+Main+St&zip=${zip}&benchmark=Public_AR_Current&format=json`
    );
    const data = await res.json();
    const m = data?.result?.addressMatches?.[0];
    if (m) {
      const coords = { lat: m.coordinates.y, lng: m.coordinates.x };
      toCache(`geo:${zip}`, coords);
      return coords;
    }
    errors.push(`Census: no address match (status ${res.status})`);
  } catch (err) {
    errors.push(`Census: ${err.message}`);
  }
  // Zippopotam.us — purpose-built for postal codes and unambiguous, unlike
  // Photon below (which once matched bare "10001" to a postcode in Cáceres,
  // Spain instead of New York — a bare numeric query has no country to
  // disambiguate against). Tried before Photon for exactly that reason.
  try {
    const res  = await fetchTimeout(`https://api.zippopotam.us/us/${zip}`);
    const data = await res.json();
    const place = data?.places?.[0];
    if (place) {
      const coords = { lat: parseFloat(place.latitude), lng: parseFloat(place.longitude) };
      toCache(`geo:${zip}`, coords);
      return coords;
    }
    errors.push(`Zippopotam: no place match (status ${res.status})`);
  } catch (err) {
    errors.push(`Zippopotam: ${err.message}`);
  }
  // Photon fallback — last resort, since a bare ZIP query is ambiguous
  // across countries (see note above).
  try {
    const res  = await fetchTimeout(`https://photon.komoot.io/api/?q=${zip}&limit=1&lang=en&osm_tag=place:postcode`);
    const data = await res.json();
    // Extra guard beyond osm_tag filtering: a bare numeric query can still
    // match a non-US postcode, so require the result to actually say US.
    const feat = (data?.features || []).find(f => f.properties?.countrycode === 'US') || data?.features?.[0];
    if (feat && feat.properties?.countrycode === 'US') {
      const coords = { lat: feat.geometry.coordinates[1], lng: feat.geometry.coordinates[0] };
      toCache(`geo:${zip}`, coords);
      return coords;
    }
    errors.push(`Photon: no US match (status ${res.status})`);
  } catch (err) {
    errors.push(`Photon: ${err.message}`);
  }
  console.warn(`  Geocode failed for ${zip}: ${errors.join(' | ')}`);
  geocodeZip.lastErrors = errors; // exposed via /api/listings error response for remote debugging
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// A deterministic short hash for building stable listing IDs from a natural
// key (the source's own URL, when it has no cleaner ID field) — critically,
// NOT based on Date.now(), so the same real-world listing gets the same id
// across scrapes. IDs that change every cache refresh (every 8 min) used to
// silently break both "Saved" sales and any link pointing at a specific
// listing, since a fresh scrape would mint a brand-new id for the same sale.
function stableHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

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

// Geocode a bare city name (e.g. "Whittier") — checks the local neighborhood
// table first, falls back to Photon. Shared by sources that only expose a
// city/locality string, not real coordinates, per listing.
async function geocodeCityName(cityName) {
  const key = (cityName || '').toLowerCase().replace(/,.*$/, '').trim();
  if (!key) return null;
  if (LA_NEIGHBORHOODS[key]) return LA_NEIGHBORHOODS[key];
  try {
    const res = await fetchTimeout(`https://photon.komoot.io/api/?q=${encodeURIComponent(key + ' California')}&limit=1&lang=en`, 6000);
    const data = await res.json();
    const f = data?.features?.[0];
    if (f) return { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
  } catch (_) {}
  return null;
}

// Reverse-geocode coordinates to a city/locality name — used when a source
// needs a city name to build its own search URL (we only start with a zip).
async function reverseGeocodeCity(lat, lng) {
  try {
    const res = await fetchTimeout(`https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}&limit=1`, 6000);
    const data = await res.json();
    const props = data?.features?.[0]?.properties;
    return props?.city || props?.name || null;
  } catch (_) { return null; }
}

// Format a date-only (no time) ISO range like "2026-06-27" / "2026-07-11"
// without any timezone-shift risk (constructs via explicit y/m/d, not UTC).
function isoDateLabel(startISO, endISO) {
  if (!startISO) return '';
  const parseISO = s => { const [y,m,d] = s.slice(0,10).split('-').map(Number); return new Date(y, m-1, d); };
  const fmt = d => d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  const start = parseISO(startISO);
  const end = endISO ? parseISO(endISO) : start;
  return start.getTime() === end.getTime() ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
}

// Static map thumbnail via Geoapify (free tier: 3,000/day, no credit card)
// Set GEOAPIFY_KEY in .env — get one at https://myprojects.geoapify.com
function mapThumbUrl(lat, lng) {
  const key = process.env.GEOAPIFY_KEY;
  if (!key || !lat || !lng) return null;
  const marker = `lonlat:${lng},${lat};type:material;color:%23f97316;size:medium`;
  return `https://maps.geoapify.com/v1/staticmap?style=osm-bright-smooth&width=400&height=260&center=lonlat:${lng},${lat}&zoom=15&marker=${marker}&apiKey=${key}`;
}

function detectType(text = '') {
  const t = text.toLowerCase();
  if (/estate.sale|estate-sale/.test(t))             return 'estate';
  if (/moving.sale|everything.must.go|liquidat/.test(t)) return 'moving';
  if (/auction/.test(t))                              return 'auction';
  if (/thrift|consign|resale|second.?hand/.test(t))   return 'yard';
  return 'yard';
}

// Matches actual sale-event posts (as opposed to plain for-sale item listings,
// e.g. a single trading card someone's selling that a marketplace's fuzzy
// search happened to surface for an "estate sale" query). Used both to gate
// date extraction (avoids false positives like "3 1/2 inches" read as a date)
// and to filter out non-sale-event listings entirely from keyword/marketplace
// sources (Craigslist, OfferUp, Facebook, Google) that aren't inherently
// scoped to real sale events the way EstateSales.org's own category is.
const SALE_EVENT_RE = /\b(yard|garage|estate|moving|rummage|tag|multi-?family|block|barn)\s*sale\b/i;

// ── HTML entity decoding ────────────────────────────────────────────────────
// Some sources (YardSaleSearch, GarageSaleFinder) hand back titles with raw
// un-decoded entities ("&#039;", "&amp;") while others decode them before we
// see them. Left un-decoded, those entities also broke dedup: stripping
// non-alphanumeric chars from "&#039;" leaves the digits "039" behind, so the
// same sale's title normalized differently across sources and dedup missed
// real duplicates.
const HTML_ENTITIES = { amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ' };
function decodeHtmlEntities(str) {
  if (!str) return str;
  return str.replace(/&(#?\w+);/g, (m, ent) => {
    if (ent[0] === '#') {
      const code = ent[1] === 'x' ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      return Number.isNaN(code) ? m : String.fromCharCode(code);
    }
    return HTML_ENTITIES[ent] ?? m;
  });
}

// ── Street address extraction from free text ────────────────────────────────
// Some sources (OfferUp especially) never expose a real street address via
// their API — only a city ("Whittier, CA") — but sellers often write the
// actual address into the listing's free-text description. Pull it out from
// there when present, the same way we already recover dates from the
// description as a fallback when the structured fields come up empty.
const STREET_SUFFIXES = 'St|Ave|Rd|Blvd|Dr|Ln|Way|Ct|Pl|Cir|Pkwy|Hwy|Street|Avenue|Road|Boulevard|Drive|Lane|Court|Place|Circle|Parkway|Highway|Ter|Terrace|Trl|Trail';
const STREET_ADDRESS_TEXT_RE = new RegExp(
  `\\b(\\d{2,6}\\s+(?:[NSEW]\\.?\\s+)?[A-Za-z0-9'.-]+(?:\\s+[A-Za-z0-9'.-]+){0,2}\\s+(?:${STREET_SUFFIXES})\\b\\.?)`,
  'i'
);
function extractStreetAddress(text) {
  const m = (text || '').match(STREET_ADDRESS_TEXT_RE);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

// ── Item tag extraction ─────────────────────────────────────────────────────
// No source exposes real per-item names/prices, so we scan a listing's own
// title/description for known category keywords and surface those as tags
// (feeds the "What you'll find" chips / items gallery — no price or photo).
const ITEM_KEYWORDS = [
  { tag:'Furniture',               re:/\b(furniture|sofa|couch|dresser|desk|credenza|armoire|bookshelf|bookcase|cabinet|dining set|nightstand|recliner)\b/i },
  { tag:'Tools',                   re:/\b(tools?|power tools?|drill|table saw|toolbox|workbench)\b/i },
  { tag:'Vinyl & Records',         re:/\b(vinyl|records?|lp'?s?)\b/i },
  { tag:'Electronics',             re:/\b(electronics?|\btv\b|stereo|speakers?|computer|laptop|camera)\b/i },
  { tag:'Jewelry',                 re:/\b(jewelry|jewellery|sterling silver|gold (?:jewelry|ring|necklace|bracelet)|diamond (?:ring|necklace|earrings?)|diamonds|watches?)\b/i },
  { tag:'Clothing',                re:/\b(clothing|clothes|apparel|shoes|handbags?|purses?)\b/i },
  { tag:'Books',                   re:/\bbooks?\b/i },
  { tag:'Kitchenware',             re:/\b(kitchen(ware)?|cookware|dishes|china|glassware)\b/i },
  { tag:'Art',                     re:/\b(art(work)?|paintings?|prints?|sculptures?)\b/i },
  { tag:'Toys & Games',            re:/\b(toys?|board games?|\blego\b|dolls?)\b/i },
  { tag:'Sporting Goods',          re:/\b(sporting goods?|bikes?|bicycles?|golf|surfboards?|skis?)\b/i },
  { tag:'Antiques & Collectibles', re:/\b(antiques?|collectibles?|vintage)\b/i },
  { tag:'Lighting',                re:/\b(lamps?|lighting|chandeliers?)\b/i },
  { tag:'Rugs',                    re:/\b(rugs?|carpets?)\b/i },
  { tag:'Appliances',              re:/\b(appliances?|refrigerator|washer|dryer|microwave)\b/i },
  { tag:'Musical Instruments',     re:/\b(guitars?|pianos?|instruments?)\b/i },
  { tag:'Holiday Decor',           re:/\b(christmas|holiday decor|ornaments?)\b/i },
  { tag:'Garden & Outdoor',        re:/\b(garden tools?|gardening|outdoor furniture|patio (?:set|furniture)|planters?|lawn mower)\b/i },
];
function extractItemTags(...texts) {
  const text = texts.filter(Boolean).join(' ');
  if (!text) return [];
  const tags = [];
  for (const { tag, re } of ITEM_KEYWORDS) {
    if (re.test(text)) { tags.push(tag); if (tags.length >= 6) break; }
  }
  return tags;
}

function parseDateLabel(str = '') {
  try {
    return str ? new Date(str).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) : '';
  } catch { return str; }
}

function parseCLDate(title = '') {
  const MONTHS = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
  const yr = new Date().getFullYear();
  const fmt = d => d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  const range = (a, b) => a.getTime() === b.getTime() ? fmt(a) : `${fmt(a)} – ${fmt(b)}`;

  // Month-word dates — collect every "Month Day" occurrence, e.g. "June 27",
  // "Jul 3rd", plus bare trailing days in a range like "July 3rd & 4th" or
  // "July 11-12" (no repeated month word on the second day).
  const mRe = new RegExp(`\\b(${MONTHS})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?`, 'gi');
  const mDates = [];
  let mm, lastMonth = null;
  while ((mm = mRe.exec(title))) {
    lastMonth = mm[1];
    const d = new Date(`${mm[1]} ${mm[2]}, ${yr}`);
    if (!isNaN(d)) mDates.push(d);
  }
  if (lastMonth) {
    // Trailing day list after the last month word: "3rd & 4th", "11-12", "3, 4, and 5"
    const contRe = new RegExp(`\\b(?:${MONTHS})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?((?:\\s*(?:,\\s*(?:and\\s+)?|and\\s+|&\\s*|to\\s+|[-–]\\s*)\\d{1,2}(?:st|nd|rd|th)?)+)`, 'i');
    const cm = title.match(contRe);
    if (cm) {
      for (const dm of cm[1].matchAll(/\d{1,2}/g)) {
        const d = new Date(`${lastMonth} ${dm[0]}, ${yr}`);
        if (!isNaN(d)) mDates.push(d);
      }
    }
  }
  if (mDates.length) {
    mDates.sort((a,b) => a - b);
    return range(mDates[0], mDates[mDates.length - 1]);
  }

  // Numeric dates — "6/27", "6/27/26", or a range like "7/3 &7/4" / "7/3-7/4"
  const nRe = /\b(1[0-2]|0?[1-9])\/(3[01]|[12]\d|0?[1-9])(?:\/\d{2,4})?\b/g;
  const nDates = [];
  let nm;
  while ((nm = nRe.exec(title))) {
    const d = new Date(yr, parseInt(nm[1],10)-1, parseInt(nm[2],10));
    if (!isNaN(d)) nDates.push(d);
  }
  if (nDates.length) {
    nDates.sort((a,b) => a - b);
    return range(nDates[0], nDates[nDates.length - 1]);
  }

  // Casual phrasing — "today", "tomorrow", "this weekend", or bare weekday
  // name(s) with no calendar date at all ("Garage Sale Friday and Saturday").
  // Very common on Craigslist; without this, most real listings get dropped
  // for lacking a "parseable" date even though they clearly have one.
  const startOfDay = d => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const today = startOfDay(new Date());
  if (/\btoday\b/i.test(title)) return fmt(today);
  if (/\btomorrow\b/i.test(title)) return fmt(new Date(today.getTime() + 86400000));
  if (/\bthis\s+weekend\b/i.test(title)) {
    const DOW = today.getDay();
    const toSat = (6 - DOW + 7) % 7;
    const sat = new Date(today.getTime() + toSat*86400000);
    const sun = new Date(sat.getTime() + 86400000);
    return range(sat, sun);
  }
  const DAY_RE = 'sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?';
  const DOW_IDX = {sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6};
  const dRe = new RegExp(`\\b(${DAY_RE})\\b`, 'gi');
  const targets = [];
  let dm2;
  while ((dm2 = dRe.exec(title))) {
    const target = DOW_IDX[dm2[1].toLowerCase().slice(0,3)];
    if (target !== undefined) targets.push(target);
  }
  const uniqueTargets = [...new Set(targets)];
  if (uniqueTargets.length) {
    // A single bare weekday ("Garage sale Saturday") always means the next
    // upcoming one. But multiple weekdays together ("Friday and Saturday")
    // describe one contiguous event — resolve each to whichever occurrence
    // (past or future) is CLOSEST to today, so they land next to each other
    // instead of drifting a week apart when "today" already is one of them.
    const dDates = uniqueTargets.map(target => {
      let diff = (target - today.getDay() + 7) % 7;
      if (uniqueTargets.length > 1 && diff > 3) diff -= 7;
      return new Date(today.getTime() + diff*86400000);
    });
    dDates.sort((a,b) => a - b);
    return range(dDates[0], dDates[dDates.length - 1]);
  }
  return '';
}

// Extracts a time-of-day (or range) from free text like a Craigslist/OfferUp
// title or description, e.g. "Yard sale 9am-2pm", "Sat 9-2", "8:30 AM to 1 PM".
// Several sources have no structured time field of their own and previously
// always shipped an empty timeLabel — without a time, the frontend's
// isSaleLive()/useCountdown() can never resolve an end time, so a listing
// could never show as "live" no matter how in-progress it actually was, even
// though sellers very commonly write the hours directly into the title.
function parseTimeFromText(text = '') {
  if (!text) return '';
  // Full range with explicit am/pm on both ends: "9am-2pm", "9:30 AM - 2:00 PM"
  let m = text.match(/\b(\d{1,2}(?::\d{2})?)\s*(am|pm)\s*(?:-|–|to)\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)\b/i);
  if (m) return `${m[1]}${m[2].toUpperCase()} - ${m[3]}${m[4].toUpperCase()}`;
  // Range sharing one am/pm suffix at the end: "9-2pm", "9 to 2 pm" — the
  // missing first suffix is almost always AM for typical daytime sale hours.
  m = text.match(/\b(\d{1,2}(?::\d{2})?)\s*(?:-|–|to)\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)\b/i);
  if (m) {
    const suffix2 = m[3].toLowerCase();
    const suffix1 = (suffix2 === 'pm' && parseInt(m[1]) <= 11) ? 'AM' : suffix2.toUpperCase();
    return `${m[1]}${suffix1} - ${m[2]}${suffix2.toUpperCase()}`;
  }
  // Single time: "starts at 9am", "doors open 9 AM"
  m = text.match(/\b(\d{1,2}(?::\d{2})?)\s*(am|pm)\b/i);
  if (m) return `${m[1]}${m[2].toUpperCase()}`;
  return '';
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
  const imageMap = new Map(); // listing.url → { images: string[], address: string }

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

        const { images, address } = await page.evaluate(() => {
          const seen = new Set();
          const imgs = [];
          for (const img of document.querySelectorAll('img[src]')) {
            const src = img.getAttribute('src') || '';
            if (!src.includes('images.craigslist.org')) continue;
            // Convert any size variant to 600x450
            const full = src.replace(/_\d+x\d+c?\.jpg/, '_600x450.jpg');
            if (!seen.has(full)) { seen.add(full); imgs.push(full); }
          }

          // Many posters opt in to showing a real address — either in the
          // dedicated map-address element or written into the body text.
          let addr = '';
          const mapAddr = document.querySelector('.mapaddress');
          if (mapAddr && mapAddr.textContent.trim()) {
            addr = mapAddr.textContent.trim();
          } else {
            const body = document.querySelector('#postingbody')?.textContent || '';
            const m = body.match(/address:?\s*([^\n]+)/i);
            if (m) addr = m[1].trim();
          }

          return { images: imgs.slice(0, 8), address: addr }; // max 8 images per listing
        });

        imageMap.set(listing.url, { images, address });
        if (images.length) console.log(`    ${listing.title?.slice(0,40)} → ${images.length} image(s)`);
        if (address) console.log(`    ${listing.title?.slice(0,40)} → address: ${address}`);
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

        const { images, address } = await page.evaluate((goodDomains, badDomains) => {
          const seen = new Set();
          const imgs = [];
          let address = '';

          // 0. __NEXT_DATA__ — Next.js embeds all page data here including gallery
          try {
            const nd = document.getElementById('__NEXT_DATA__');
            if (nd) {
              const json = JSON.stringify(JSON.parse(nd.textContent));
              const matches = json.match(/https:\/\/[^"]*(?:eso-cdn\.tlcdn\.workers\.dev|amazonaws\.com|cloudfront\.net|imgix\.net)[^"?]*/g) || [];
              matches.forEach(u => { if (!seen.has(u)) { seen.add(u); imgs.push(u); } });
            }
          } catch (_) {}

          // 1. JSON-LD structured data — also carries a real street address
          for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
            try {
              const obj = JSON.parse(el.textContent);
              const candidates = [obj.image, obj.photo, obj.thumbnail, ...(obj.images || []), ...(obj.photos || [])].flat().filter(Boolean);
              for (const src of candidates) {
                const url = typeof src === 'string' ? src : src?.url || src?.contentUrl;
                if (!url || !url.startsWith('http')) continue;
                if (!seen.has(url)) { seen.add(url); imgs.push(url); }
              }
              const streetAddress = obj.location?.address?.streetAddress || obj.address?.streetAddress;
              if (streetAddress && !address) address = streetAddress;
            } catch (_) {}
          }

          // 2. OG / Twitter card meta images
          for (const sel of ['meta[property="og:image"]', 'meta[name="twitter:image"]', 'meta[property="og:image:url"]']) {
            const content = document.querySelector(sel)?.getAttribute('content');
            if (content && content.startsWith('http') && !seen.has(content)) {
              seen.add(content); imgs.push(content);
            }
          }

          if (imgs.length >= 3) return { images: imgs.slice(0, 12), address };

          // 3. Fallback: img tags — check data-src for lazy-loaded images too
          for (const img of document.querySelectorAll('img')) {
            const src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('src') || '';
            if (!src.startsWith('http')) continue;
            if (badDomains.some(d => src.includes(d))) continue;
            if (!goodDomains.some(d => src.includes(d))) continue;
            if (/logo|icon|avatar|badge|btn|star|rating|sprite|nav|menu|spacer|\/track\//i.test(src)) continue;
            const w = parseInt(img.getAttribute('width') || '0', 10);
            const h = parseInt(img.getAttribute('height') || '0', 10);
            if ((w && w < 120) || (h && h < 120)) continue;
            const key = src.split('?')[0];
            if (!seen.has(key)) { seen.add(key); imgs.push(src); }
            if (imgs.length >= 12) break;
          }

          return { images: imgs.slice(0, 12), address };
        }, GOOD_DOMAINS, BAD_DOMAINS);

        const filteredImgs = images.filter(u => !u.includes('nophoto') && !u.includes('placeholder') && !u.includes('spacer') && !u.includes('/track/'));
        imageMap.set(listing.url, { images: filteredImgs, address });
        if (filteredImgs.length) console.log(`    ES "${listing.title?.slice(0,40)}" → ${filteredImgs.length} img(s)`);
        else console.log(`    ES "${listing.title?.slice(0,40)}" → no images found`);
        if (address) console.log(`    ES "${listing.title?.slice(0,40)}" → address: ${address}`);
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
// Craigslist splits the whole country into ~420 independent regional sites,
// each with its own subdomain, and has no API to resolve "which site covers
// this ZIP" — so a nationwide search has to pick the nearest region(s) by
// straight-line distance from a curated list of major metro coordinates.
// This covers the largest metro in (at minimum) every state, weighted
// toward population, so most US ZIPs land near a real, active CL site.
// Subdomains are the actual Craigslist site slugs, not just city names.
const CRAIGSLIST_REGIONS = [
  {sub:'newyork',lat:40.7128,lng:-74.0060},{sub:'losangeles',lat:34.0522,lng:-118.2437},
  {sub:'inlandempire',lat:34.0630,lng:-117.4587},{sub:'orangecounty',lat:33.7175,lng:-117.8311},
  {sub:'sfbay',lat:37.7749,lng:-122.4194},{sub:'chicago',lat:41.8781,lng:-87.6298},
  {sub:'houston',lat:29.7604,lng:-95.3698},{sub:'phoenix',lat:33.4484,lng:-112.0740},
  {sub:'philadelphia',lat:39.9526,lng:-75.1652},{sub:'sandiego',lat:32.7157,lng:-117.1611},
  {sub:'dallas',lat:32.7767,lng:-96.7970},{sub:'fortworth',lat:32.7555,lng:-97.3308},
  {sub:'austin',lat:30.2672,lng:-97.7431},{sub:'sacramento',lat:38.5816,lng:-121.4944},
  {sub:'fresno',lat:36.7378,lng:-119.7871},{sub:'bakersfield',lat:35.3733,lng:-119.0187},
  {sub:'seattle',lat:47.6062,lng:-122.3321},{sub:'denver',lat:39.7392,lng:-104.9903},
  {sub:'washingtondc',lat:38.9072,lng:-77.0369},{sub:'boston',lat:42.3601,lng:-71.0589},
  {sub:'detroit',lat:42.3314,lng:-83.0458},{sub:'portland',lat:45.5152,lng:-122.6784},
  {sub:'lasvegas',lat:36.1699,lng:-115.1398},{sub:'baltimore',lat:39.2904,lng:-76.6122},
  {sub:'albuquerque',lat:35.0844,lng:-106.6504},{sub:'tucson',lat:32.2226,lng:-110.9747},
  {sub:'kansascity',lat:39.0997,lng:-94.5786},{sub:'atlanta',lat:33.7490,lng:-84.3880},
  {sub:'miami',lat:25.7617,lng:-80.1918},{sub:'raleigh',lat:35.7796,lng:-78.6382},
  {sub:'omaha',lat:41.2565,lng:-95.9345},{sub:'minneapolis',lat:44.9778,lng:-93.2650},
  {sub:'tulsa',lat:36.1540,lng:-95.9928},{sub:'tampa',lat:27.9506,lng:-82.4572},
  {sub:'neworleans',lat:29.9511,lng:-90.0715},{sub:'cleveland',lat:41.4993,lng:-81.6944},
  {sub:'stlouis',lat:38.6270,lng:-90.1994},{sub:'pittsburgh',lat:40.4406,lng:-79.9959},
  {sub:'cincinnati',lat:39.1031,lng:-84.5120},{sub:'orlando',lat:28.5383,lng:-81.3792},
  {sub:'sanantonio',lat:29.4241,lng:-98.4936},{sub:'columbus',lat:39.9612,lng:-82.9988},
  {sub:'charlotte',lat:35.2271,lng:-80.8431},{sub:'indianapolis',lat:39.7684,lng:-86.1581},
  {sub:'jacksonville',lat:30.3322,lng:-81.6557},{sub:'elpaso',lat:31.7619,lng:-106.4850},
  {sub:'memphis',lat:35.1495,lng:-90.0490},{sub:'louisville',lat:38.2527,lng:-85.7585},
  {sub:'milwaukee',lat:43.0389,lng:-87.9065},{sub:'honolulu',lat:21.3069,lng:-157.8583},
  {sub:'providence',lat:41.8240,lng:-71.4128},{sub:'hartford',lat:41.7658,lng:-72.6734},
  {sub:'rochester',lat:43.1566,lng:-77.6088},{sub:'buffalo',lat:42.8864,lng:-78.8784},
  {sub:'syracuse',lat:43.0481,lng:-76.1474},{sub:'albany',lat:42.6526,lng:-73.7562},
  {sub:'newhaven',lat:41.3083,lng:-72.9279},{sub:'longisland',lat:40.7891,lng:-73.1350},
  {sub:'newjersey',lat:40.2171,lng:-74.7429},{sub:'southjersey',lat:39.7391,lng:-75.1196},
  {sub:'delaware',lat:39.1582,lng:-75.5244},{sub:'richmond',lat:37.5407,lng:-77.4360},
  {sub:'norfolk',lat:36.8508,lng:-76.2859},{sub:'roanoke',lat:37.2710,lng:-79.9414},
  {sub:'charlestonwv',lat:38.3498,lng:-81.6326},{sub:'columbia',lat:34.0007,lng:-81.0348},
  {sub:'greenville',lat:34.8526,lng:-82.3940},{sub:'charleston',lat:32.7765,lng:-79.9311},
  {sub:'knoxville',lat:35.9606,lng:-83.9207},{sub:'chattanooga',lat:35.0456,lng:-85.3097},
  {sub:'nashville',lat:36.1627,lng:-86.7816},{sub:'jackson',lat:32.2988,lng:-90.1848},
  {sub:'shreveport',lat:32.5252,lng:-93.7502},{sub:'batonrouge',lat:30.4515,lng:-91.1871},
  {sub:'lafayette',lat:30.2241,lng:-92.0198},{sub:'littlerock',lat:34.7465,lng:-92.2896},
  {sub:'wichita',lat:37.6872,lng:-97.3301},{sub:'topeka',lat:39.0473,lng:-95.6752},
  {sub:'desmoines',lat:41.5868,lng:-93.6250},{sub:'cedarrapids',lat:41.9779,lng:-91.6656},
  {sub:'madison',lat:43.0731,lng:-89.4012},{sub:'greenbay',lat:44.5133,lng:-88.0133},
  {sub:'duluth',lat:46.7867,lng:-92.1005},{sub:'fargo',lat:46.8772,lng:-96.7898},
  {sub:'siouxfalls',lat:43.5460,lng:-96.7313},{sub:'rapidcity',lat:44.0805,lng:-103.2310},
  {sub:'billings',lat:45.7833,lng:-108.5007},{sub:'boise',lat:43.6150,lng:-116.2023},
  {sub:'spokane',lat:47.6588,lng:-117.4260},{sub:'eugene',lat:44.0521,lng:-123.0868},
  {sub:'reno',lat:39.5296,lng:-119.8138},{sub:'santafe',lat:35.6870,lng:-105.9378},
  {sub:'lubbock',lat:33.5779,lng:-101.8552},{sub:'amarillo',lat:35.1991,lng:-101.8313},
  {sub:'corpuschristi',lat:27.8006,lng:-97.3964},{sub:'rgv',lat:26.2034,lng:-98.2300},
  {sub:'killeen',lat:31.1171,lng:-97.7278},{sub:'waco',lat:31.5493,lng:-97.1467},
  {sub:'tyler',lat:32.3513,lng:-95.3011},{sub:'beaumont',lat:30.0802,lng:-94.1266},
  {sub:'montgomery',lat:32.3792,lng:-86.3077},{sub:'mobile',lat:30.6954,lng:-88.0399},
  {sub:'huntsville',lat:34.7304,lng:-86.5861},{sub:'tuscaloosa',lat:33.2098,lng:-87.5692},
  {sub:'augusta',lat:33.4735,lng:-82.0105},{sub:'macon',lat:32.8407,lng:-83.6324},
  {sub:'savannah',lat:32.0809,lng:-81.0912},{sub:'albanyga',lat:31.5785,lng:-84.1557},
  {sub:'gainesville',lat:29.6516,lng:-82.3248},{sub:'ocala',lat:29.1872,lng:-82.1401},
  {sub:'fortmyers',lat:26.6406,lng:-81.8723},{sub:'treasure',lat:27.4467,lng:-80.3256},
  {sub:'spacecoast',lat:28.3922,lng:-80.6077},{sub:'keys',lat:24.5551,lng:-81.7800},
  {sub:'panamacity',lat:30.1588,lng:-85.6602},{sub:'pensacola',lat:30.4213,lng:-87.2169},
  {sub:'tallahassee',lat:30.4383,lng:-84.2807},{sub:'daytona',lat:29.2108,lng:-81.0228},
  {sub:'lakeland',lat:28.0395,lng:-81.9498},{sub:'grandrapids',lat:42.9634,lng:-85.6681},
  {sub:'annarbor',lat:42.2808,lng:-83.7430},{sub:'flint',lat:43.0125,lng:-83.6875},
  {sub:'lansing',lat:42.7325,lng:-84.5555},{sub:'kalamazoo',lat:42.2917,lng:-85.5872},
  {sub:'toledo',lat:41.6528,lng:-83.5379},{sub:'dayton',lat:39.7589,lng:-84.1916},
  {sub:'akroncanton',lat:40.9993,lng:-81.5182},{sub:'youngstown',lat:41.0998,lng:-80.6495},
  {sub:'fortwayne',lat:41.0793,lng:-85.1394},{sub:'southbend',lat:41.6764,lng:-86.2520},
  {sub:'evansville',lat:37.9716,lng:-87.5711},{sub:'bloomington',lat:39.1653,lng:-86.5264},
  {sub:'appleton',lat:44.2619,lng:-88.4154},{sub:'lacrosse',lat:43.8014,lng:-91.2396},
  {sub:'wausau',lat:44.9591,lng:-89.6301},{sub:'stcloud',lat:45.5579,lng:-94.1632},
  {sub:'rochester_mn',lat:44.0121,lng:-92.4802},{sub:'yakima',lat:46.6021,lng:-120.5059},
  {sub:'bellingham',lat:48.7519,lng:-122.4787},{sub:'tricities',lat:46.2396,lng:-119.1006},
  {sub:'medford',lat:42.3265,lng:-122.8756},{sub:'bend',lat:44.0582,lng:-121.3153},
  {sub:'flagstaff',lat:35.1983,lng:-111.6513},{sub:'yuma',lat:32.6927,lng:-114.6277},
  {sub:'anchorage',lat:61.2181,lng:-149.9003},{sub:'fairbanks',lat:64.8378,lng:-147.7164},
  {sub:'monroe',lat:32.5093,lng:-92.1193},{sub:'wichitafalls',lat:33.9137,lng:-98.4934},
  {sub:'abilene',lat:32.4487,lng:-99.7331},{sub:'sanangelo',lat:31.4638,lng:-100.4370},
  {sub:'brownsville',lat:25.9017,lng:-97.4975},{sub:'laredo',lat:27.5306,lng:-99.4803},
  {sub:'harrisburg',lat:40.2732,lng:-76.8867},{sub:'lehighvalley',lat:40.6259,lng:-75.3705},
  {sub:'scranton',lat:41.4090,lng:-75.6624},{sub:'erie',lat:42.1292,lng:-80.0851},
  {sub:'lancaster',lat:40.0379,lng:-76.3055},{sub:'poconos',lat:41.0334,lng:-75.3266},
];
function nearestCraigslistRegions(lat, lng, n = 3) {
  return CRAIGSLIST_REGIONS
    .map(r => ({ ...r, dist: distanceMiles(lat, lng, r.lat, r.lng) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, n);
}

// Shared place-name geocoder used by every scraper (Craigslist, OfferUp,
// EstateSales-Puppeteer, Facebook). Tries a static LA/partial-match table
// first, then Census → Nominatim → Photon, in that order, using the real
// state abbreviation instead of a hardcoded "CA"/"California" (the original
// bug that made every scraper silently fail to geocode outside California).
// Callers should dedupe place names and call this via Promise.all in small
// batches — never in a sequential per-item loop, which is what caused the
// nationwide-search hangs (up to 8s per Photon timeout, times N listings).
async function geocodePlaceName(name, state) {
  const key = name.toLowerCase().trim();
  const addrKey = `addr:${key.replace(/\s+/g,'-')}`;
  let coords = fromCache(addrKey) || LA_NEIGHBORHOODS[key];

  // Partial match: "East Whittier" → "whittier", etc.
  if (!coords) {
    const parts = key.split(/[\s,\/]+/);
    for (let p = parts.length - 1; p >= 1; p--) {
      const sub = parts.slice(parts.length - p).join(' ');
      if (LA_NEIGHBORHOODS[sub]) { coords = LA_NEIGHBORHOODS[sub]; break; }
    }
  }

  if (!coords) {
    try {
      const q = encodeURIComponent(state ? `${name}, ${state.toUpperCase()}` : name);
      const res = await fetchTimeout(
        `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${q}&benchmark=Public_AR_Current&format=json`,
        3000
      );
      const data = await res.json();
      const match = data?.result?.addressMatches?.[0];
      if (match) { coords = { lat: match.coordinates.y, lng: match.coordinates.x }; toCache(addrKey, coords); }
    } catch (_) {}
  }

  if (!coords) {
    try {
      const q = encodeURIComponent(state ? `${name}, ${state.toUpperCase()}` : name);
      const res = await fetchTimeout(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, 4000,
        { headers: { 'User-Agent': 'RummageApp/1.0 (local sale finder; contact via app feedback)' } }
      );
      const data = await res.json();
      const match = data?.[0];
      if (match) { coords = { lat: parseFloat(match.lat), lng: parseFloat(match.lon) }; toCache(addrKey, coords); }
    } catch (_) {}
  }

  if (!coords) {
    try {
      const q = encodeURIComponent(state ? `${name} ${state.toUpperCase()}` : name);
      const res = await fetchTimeout(`https://photon.komoot.io/api/?q=${q}&limit=1&lang=en`, 3000);
      const data = await res.json();
      const feat = data?.features?.[0];
      if (feat) { coords = { lat: feat.geometry.coordinates[1], lng: feat.geometry.coordinates[0] }; toCache(addrKey, coords); }
    } catch (_) {}
  }
  return coords || null;
}

// Dedupe a list of raw place-name strings and resolve them all concurrently
// (small batches, to respect Nominatim's usage policy) instead of one at a
// time inside a per-listing loop.
async function batchGeocodePlaceNames(names, state) {
  const unique = [...new Set(names.filter(Boolean))];
  const map = new Map();
  const GEOCODE_CONCURRENCY = 3;
  for (let i = 0; i < unique.length; i += GEOCODE_CONCURRENCY) {
    const batch = unique.slice(i, i + GEOCODE_CONCURRENCY);
    const coordsBatch = await Promise.all(batch.map(n => geocodePlaceName(n, state)));
    batch.forEach((n, idx) => map.set(n, coordsBatch[idx]));
  }
  return map;
}

async function scrapeCraigslist(zip, radiusMi, centerLat, centerLng) {
  const cacheKey = `cl:${zip}:${radiusMi}`;
  const cached   = fromCache(cacheKey);
  if (cached) { console.log('  CL cache hit'); return cached; }

  // Craigslist has no API to resolve "which regional site covers this
  // location" — pick the nearest 3 by straight-line distance from a curated
  // metro table (this reproduces the original LA/Inland-Empire/Orange-County
  // trio exactly for Whittier, and generalizes the same approach anywhere in
  // the US). Each URL uses CL's own postal+distance pre-filter; our geocoder
  // then verifies the real distance and drops outliers.
  const nearest = nearestCraigslistRegions(centerLat, centerLng, 3);
  console.log(`  CL nearest regions: ${nearest.map(r => `${r.sub} (${r.dist.toFixed(0)}mi)`).join(', ')}`);
  const searchUrls = nearest.map(r =>
    `https://${r.sub}.craigslist.org/search/gms?postal=${zip}&search_distance=${radiusMi}`
  );

  const browser  = await getBrowser();
  const results  = [];
  const seenUrls = new Set();
  const allItems = [];

  for (const url of searchUrls) {
    console.log('  Craigslist:', url);
    const page = await browser.newPage();
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
          datetime: card.querySelector('time')?.getAttribute('datetime') || '',
        }));
      });

      console.log(`    → ${items.length} raw listings`);
      for (const item of items) {
        if (item.url && !seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          allItems.push(item);
        }
      }
    } catch (err) {
      console.warn(`  CL error on ${url}:`, err.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  const items = allItems;
  console.log(`  CL total (deduped across ${searchUrls.length} areas): ${items.length} — geocoding…`);

  // Geocode every distinct neighborhood name ONCE, concurrently, before the
  // per-item loop below — resolving them one at a time inside that loop
  // (the original approach) meant up to 3 sequential geocoder calls per
  // listing, and outside LA almost nothing hits the LA_NEIGHBORHOODS
  // fast-path, so a search with a dozen unique neighborhoods could take
  // minutes. Also fixes a real correctness bug: the Census/Photon queries
  // hardcoded ", CA" / " California" onto every neighborhood name, so a
  // Chicago listing's "Hinsdale" was being geocoded as "Hinsdale, CA" and
  // guaranteed to fail.
  const state = stateFromZip(zip);
  const neighborhoodCoords = await batchGeocodePlaceNames(
    items.map(it => it.location).filter(n => n && n !== 'Nearby'),
    state
  );

  // Build result objects (without images)
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.title) continue;
    const neighborhood = item.location || 'Nearby';

    let clDistMi = 0;
    let clLat = null, clLng = null;
    let clPx = { x: 28 + (i % 8) * 7, y: 22 + (i % 5) * 13 };

    if (neighborhood && neighborhood !== 'Nearby') {
      const coords = neighborhoodCoords.get(neighborhood);
      if (coords) {
        clLat = coords.lat; clLng = coords.lng;
        clDistMi = parseFloat(distanceMiles(centerLat, centerLng, coords.lat, coords.lng).toFixed(1));
        clPx = pinXY(coords.lat, coords.lng, centerLat, centerLng, radiusMi);
        if (clDistMi > radiusMi) continue;
      } else {
        console.log(`    CL skip (no geocode): "${neighborhood}"`);
        continue;
      }
    } else {
      clLat = centerLat; clLng = centerLng; clDistMi = 0;
      clPx = pinXY(centerLat, centerLng, centerLat, centerLng, radiusMi);
    }

    const clPostId = (item.url.match(/(\d+)\.html/) || [])[1];
    results.push({
      id:          `cl-${clPostId || stableHash(item.url || item.title)}`,
      source:      'craigslist',
      type:        detectType(item.title),
      title:       item.title,
      address:     neighborhood,
      neighborhood,
      distanceMi:  clDistMi,
      lat:         clLat,
      lng:         clLng,
      dateLabel:   parseCLDate(item.title) || parseDateLabel(item.datetime),
      timeLabel:   parseTimeFromText(item.title),
      photoCount:  0,
      images:      [],
      live:        false,
      blurb:       '',
      price:       item.price !== '$0' ? item.price : '',
      items:       extractItemTags(item.title),
      url:         item.url,
      x:           Math.max(5, Math.min(95, clPx.x)),
      y:           Math.max(5, Math.min(95, clPx.y)),
    });
  }

  // Enrich with images and a real street address (when the poster included
  // one); fall back to static map thumb for photo-less listings.
  const imageMap = await fetchListingImages(results);
  for (const listing of results) {
    const detail = imageMap.get(listing.url) || {};
    const imgs = detail.images || [];
    if (imgs.length) {
      listing.images     = imgs;
      listing.photoCount = imgs.length;
    } else {
      const thumb = mapThumbUrl(listing.lat, listing.lng);
      if (thumb) { listing.images = [thumb]; listing.photoCount = 1; listing.isMapThumb = true; }
    }
    if (detail.address) listing.address = detail.address;
  }

  console.log(`  CL done — ${results.length} listings with images`);
  toCache(cacheKey, results);

  return results;
}

// The search feed's GraphQL only returns one thumbnail per listing, but each
// listing's own detail page embeds a full __NEXT_DATA__ blob with a real
// photos array (Apollo cache, keyed as `listing({"listingId":"..."})`).
async function fetchOfferUpPhotos(listings, cookies, ua, concurrency = 5) {
  const detailMap = new Map(); // listing.url → { images: string[], description: string }
  const work = listings.filter(l => l.url);
  console.log(`  OU: fetching full photo sets for ${work.length} listings (${concurrency} at a time)…`);

  for (let i = 0; i < work.length; i += concurrency) {
    const batch = work.slice(i, i + concurrency);
    await Promise.all(batch.map(async listing => {
      try {
        const res = await fetchTimeout(listing.url, 10000, {
          headers: { 'User-Agent': ua, ...(cookies ? { Cookie: cookies } : {}) },
        });
        if (!res.ok) return;
        const html = await res.text();
        const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (!m) return;
        const data = JSON.parse(m[1]);
        const rootQuery = data?.props?.pageProps?.initialApolloState?.ROOT_QUERY || {};
        const key = Object.keys(rootQuery).find(k => k.startsWith('listing('));
        const listingData = key ? rootQuery[key] : null;
        if (!listingData) return;
        const photos = listingData.photos;
        const urls = Array.isArray(photos)
          ? photos.map(p => p?.detailFull?.url || p?.detail?.url || p?.list?.url).filter(Boolean)
          : [];
        detailMap.set(listing.url, {
          images: urls.slice(0, 10),
          description: listingData.description || '',
        });
      } catch (_) {
        // Non-fatal: listing just keeps its single search-result thumbnail and no date
      }
    }));
  }

  return detailMap;
}

// ── OfferUp scraper (GraphQL API) ─────────────────────────────────────────────
const OU_GQL_QUERY = `query GetModularFeed($searchParams: [SearchParam]) {
  modularFeed(params: $searchParams) {
    looseTiles {
      ...modularTileListing
      ...modularTileSellerAd
    }
  }
}
fragment modularTileListing on ModularFeedTileListing {
  tileId listing { ...modularListing } tileType
}
fragment modularTileSellerAd on ModularFeedTileSellerAd {
  tileId listing { ...modularListing } tileType
}
fragment modularListing on ModularFeedListing {
  listingId title price locationName flags
  image { url height width }
}`;

async function scrapeOfferUp(zip, radiusMi, centerLat, centerLng) {
  const cacheKey = `ou:${zip}:${radiusMi}`;
  const cached   = fromCache(cacheKey);
  if (cached) { console.log('  OU cache hit'); return cached; }

  const results = [];
  const seen    = new Set();

  try {
    // Step 1: GET offerup.com to collect session cookies
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const initRes = await fetchTimeout('https://offerup.com', 12000, { headers: { 'User-Agent': UA } });
    const rawCookies = (initRes.headers.getSetCookie ? initRes.headers.getSetCookie() : [initRes.headers.get('set-cookie') || ''])
      .map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');

    const gqlHeaders = {
      'Content-Type': 'application/json',
      'User-Agent':   UA,
      'Referer':      'https://offerup.com/',
      'Origin':       'https://offerup.com',
      ...(rawCookies ? { 'Cookie': rawCookies } : {}),
    };

    const queries = ['yard sale', 'garage sale', 'estate sale', 'moving sale'];

    // Step 2: run all 4 search queries, collecting raw tiles without
    // geocoding yet. Geocoding every tile inline (the original approach)
    // meant a sequential Photon call per listing, hardcoded to "California"
    // — outside LA that fails every time and burns up to 8s per listing,
    // which is what made nationwide searches hang for minutes. Instead we
    // dedupe city names across all 4 queries and geocode them once, in
    // parallel, after the search loop (same fix as scrapeCraigslist).
    const rawTiles = []; // { tile, q }
    for (const q of queries) {
      const searchParams = [
        { key: 'q',               value: q },
        { key: 'distance',        value: String(radiusMi) },
        { key: 'platform',        value: 'web' },
        { key: 'lon',             value: String(centerLng) },
        { key: 'lat',             value: String(centerLat) },
        { key: 'limit',           value: '40' },
        { key: 'SORT',            value: '-posted' },
        { key: 'DELIVERY_FLAGS',  value: 'p' },
        { key: 'searchSessionId', value: '' },
      ];

      const body = JSON.stringify({
        operationName: 'GetModularFeed',
        variables: { searchParams },
        query: OU_GQL_QUERY,
      });

      const res  = await fetchTimeout('https://offerup.com/api/graphql', 15000, {
        method: 'POST', headers: gqlHeaders, body,
      });

      if (!res.ok) { console.warn(`  OU GraphQL "${q}" → HTTP ${res.status}`); continue; }

      const data  = await res.json();
      const tiles = data?.data?.modularFeed?.looseTiles || [];
      console.log(`  OU GraphQL "${q}" → ${tiles.length} tiles`);

      for (const tile of tiles) {
        const listing = tile.listing;
        if (!listing?.title || seen.has(listing.listingId)) continue;
        seen.add(listing.listingId);
        rawTiles.push({ tile, q });
      }
    }

    const ouState = stateFromZip(zip);
    const cityCoords = await batchGeocodePlaceNames(
      rawTiles.map(({ tile }) => (tile.listing.locationName || '').toLowerCase().replace(/,.*$/, '').trim()),
      ouState
    );

    for (const { tile, q } of rawTiles) {
      const listing = tile.listing;
      const locationName = listing.locationName || '';
      const cityKey = locationName.toLowerCase().replace(/,.*$/, '').trim();
      let ouLat = null, ouLng = null, distMi = null;

      const coords = cityKey ? cityCoords.get(cityKey) : null;
      if (coords) {
        ouLat = coords.lat; ouLng = coords.lng;
        distMi = parseFloat(distanceMiles(centerLat, centerLng, ouLat, ouLng).toFixed(1));
        if (distMi > radiusMi) continue;
      } else {
        // No resolvable city — place loosely near search center rather than
        // dropping the listing entirely.
        ouLat = centerLat + (Math.random()-0.5)*0.05;
        ouLng = centerLng + (Math.random()-0.5)*0.05;
        distMi = parseFloat(distanceMiles(centerLat, centerLng, ouLat, ouLng).toFixed(1));
      }

      const imgUrl = listing.image?.url || '';
      const price  = listing.price != null ? `$${listing.price}` : '';
      const px     = pinXY(ouLat, ouLng, centerLat, centerLng, radiusMi);

      results.push({
        id:          `ou-${listing.listingId}`,
        source:      'offerup',
        type:        detectType(listing.title + ' ' + q),
        title:       listing.title,
        address:     locationName,
        neighborhood:locationName || 'Nearby',
        distanceMi:  distMi,
        lat:         ouLat,
        lng:         ouLng,
        dateLabel:   SALE_EVENT_RE.test(listing.title) ? parseCLDate(listing.title) : '',
        timeLabel:   parseTimeFromText(listing.title),
        photoCount:  imgUrl ? 1 : 0,
        images:      imgUrl ? [imgUrl] : [],
        live:        false,
        blurb:       '',
        price,
        items:       extractItemTags(listing.title, q),
        url:         `https://offerup.com/item/detail/${listing.listingId}`,
        x:           px.x,
        y:           px.y,
      });
    }

    // The search feed only gives one thumbnail per listing — visit each
    // listing's own page to pull its full photo set instead.
    const detailMap = await fetchOfferUpPhotos(results, rawCookies, UA);
    for (const listing of results) {
      const detail = detailMap.get(listing.url);
      if (!detail) continue;
      if (detail.images.length) { listing.images = detail.images; listing.photoCount = detail.images.length; }
      // OfferUp titles rarely state a date, but sellers often write it into
      // the description instead ("Saturday & Sunday 7/11-7/12") — try there
      // before giving up on the listing entirely. (Listings whose title
      // never mentioned a sale event get filtered out downstream regardless
      // of dateLabel, so no need to re-check that gate here.)
      if (!listing.dateLabel && detail.description) {
        listing.dateLabel = parseCLDate(detail.description);
      }
      if (!listing.timeLabel && detail.description) {
        listing.timeLabel = parseTimeFromText(detail.description);
      }
      // OfferUp's API only ever gives a city ("Whittier, CA") — never a real
      // street address — but sellers often write it into the description.
      if (detail.description) {
        const street = extractStreetAddress(detail.description);
        const city = listing.neighborhood && listing.neighborhood !== 'Nearby' ? listing.neighborhood : '';
        if (street) listing.address = city ? `${street}, ${city}` : street;
      }
    }
  } catch (err) {
    console.warn('  OU GraphQL error:', err.message);
  }

  console.log(`  OU total: ${results.length} listings`);
  toCache(cacheKey, results);
  return results;
}

// OfferUp blocks all server-side requests (Cloudflare bot protection on their GraphQL endpoint).
// Keeping this stub so the parallel fetch in /api/listings doesn't need to change.
// ── EstateSales.org scraper ───────────────────────────────────────────────────
const ZIP_TO_CITY = {
  '90601':'whittier','90602':'whittier','90603':'whittier','90604':'whittier','90605':'whittier','90606':'whittier',
  '90638':'la-mirada','90650':'norwalk','90660':'pico-rivera','90670':'santa-fe-springs',
  '91010':'duarte','91702':'azusa','91706':'baldwin-park','91710':'chino','91711':'claremont',
  '91740':'glendora','91741':'glendora','91744':'la-puente','91745':'hacienda-heights',
  '91746':'la-puente','91748':'rowland-heights','91765':'diamond-bar','91766':'pomona','91770':'rosemead',
};

// Standard 3-digit ZIP-prefix → state ranges (each [min, max) inclusive of
// min, exclusive of max), used to build the correct estatesales.org
// state-level URL (/estate-sales/{state}) for any US ZIP instead of always
// assuming California.
const ZIP_PREFIX_TO_STATE = [
  [10,27,'ma'],[28,30,'ri'],[30,39,'nh'],[39,50,'me'],[50,60,'vt'],[60,70,'ct'],
  [70,90,'nj'],[100,150,'ny'],[150,197,'pa'],[197,200,'de'],[200,206,'dc'],
  [206,220,'md'],[220,247,'va'],[247,269,'wv'],[270,290,'nc'],[290,300,'sc'],
  [300,320,'ga'],[320,340,'fl'],[341,350,'fl'],[350,370,'al'],[370,386,'tn'],
  [386,398,'ms'],[398,400,'ga'],[400,428,'ky'],[430,459,'oh'],[460,480,'in'],
  [480,500,'mi'],[500,529,'ia'],[530,550,'wi'],[550,568,'mn'],[570,578,'sd'],
  [580,589,'nd'],[590,600,'mt'],[600,630,'il'],[630,659,'mo'],[660,680,'ks'],
  [680,694,'ne'],[700,715,'la'],[716,730,'ar'],[730,750,'ok'],[750,800,'tx'],
  [885,886,'tx'],[800,817,'co'],[820,832,'wy'],[832,839,'id'],[840,848,'ut'],
  [850,866,'az'],[870,885,'nm'],[889,899,'nv'],[900,962,'ca'],[967,969,'hi'],
  [970,980,'or'],[980,995,'wa'],[995,1000,'ak'],
];
function stateFromZip(zip) {
  const prefix = parseInt(String(zip).slice(0, 3), 10);
  if (Number.isNaN(prefix)) return null;
  for (const [min, max, state] of ZIP_PREFIX_TO_STATE) {
    if (prefix >= min && prefix < max) return state;
  }
  return null;
}

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

// ── EstateSales — Apify actor (primary) ──────────────────────────────────────
// Actor: lulzasaur/estate-sales-scraper  $10/1k results, 99.1% success rate
// Set APIFY_TOKEN in .env to enable; falls back to Puppeteer scraper if unset.
// Apify response field reference (from lulzasaur/estate-sales-scraper):
//   id, title, type, company, address, city, state, zip,
//   latitude, longitude, dates[{start,end}], photo_count,
//   main_image, thumbnail, is_featured, url, scrapedAt
const ES_TYPE_MAP = {
  estatesales: 'estate', auctions: 'estate', movingsales: 'moving',
  businessclosings: 'moving', businessliquidations: 'moving',
  outsidesales: 'yard', charitysales: 'yard', singleitemtypecollections: 'yard',
  onlineonlyauctions: 'estate', auctionhouse: 'estate',
};

// A sale's own local timezone matters for its date/time label — hardcoding
// Pacific made sense when every source was LA-only, but shows the wrong
// time entirely for a sale in, say, Chicago or New York. There's no
// lightweight IANA timezone-from-coordinates lookup without an extra
// dependency, so approximate from longitude using the standard US zone
// bands — accurate for the vast majority of the country, only fuzzy right
// at a zone boundary (which only shifts the displayed hour by one).
function estimateUSTimezone(lng) {
  if (lng == null) return 'America/Los_Angeles';
  if (lng >= -125 && lng < -114) return 'America/Los_Angeles'; // Pacific
  if (lng >= -114 && lng < -102) return 'America/Denver';      // Mountain
  if (lng >= -102 && lng < -87)  return 'America/Chicago';     // Central
  if (lng >= -87  && lng < -67)  return 'America/New_York';    // Eastern
  return 'America/Los_Angeles'; // outside the continental band — best guess
}

function apifyDateLabel(dates, lng) {
  if (!Array.isArray(dates) || !dates.length) return '';
  const tz = estimateUSTimezone(lng);
  // Collect all unique calendar days across all date slots
  const days = [...new Set(dates.map(d => {
    const dt = new Date(d.start);
    return dt.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', timeZone:tz });
  }))];
  if (days.length === 1) return days[0];
  if (days.length === 2) return `${days[0]} – ${days[1]}`;
  return `${days[0]} – ${days[days.length-1]}`;
}

function apifyTimeLabel(dates, lng) {
  if (!Array.isArray(dates) || !dates.length) return '';
  const tz = estimateUSTimezone(lng);
  const d = dates[0];
  const fmt = dt => new Date(dt).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', timeZone:tz }).replace(':00','');
  return `${fmt(d.start)} – ${fmt(d.end)}`;
}

async function scrapeEstateSalesApify(zip, radiusMi, centerLat, centerLng) {
  const token = process.env.APIFY_TOKEN;
  if (!token) return null; // signal: use fallback

  try {
    console.log(`  EstateSales Apify: zip=${zip} maxResults=50`);
    const res = await fetchTimeout(
      `https://api.apify.com/v2/acts/lulzasaur~estate-sales-scraper/run-sync-get-dataset-items?token=${token}`,
      90000,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ zip, maxResults: 50 }),
      }
    );
    if (!res.ok) { console.warn(`  ES Apify HTTP ${res.status}`); return null; }

    const items = await res.json();
    console.log(`  ES Apify raw items: ${items.length}`);

    const results = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.title) continue;

      // Lat/lng come directly from the API — no geocoding needed
      const esLat = item.latitude, esLng = item.longitude;
      if (!esLat || !esLng) { console.log(`  ES skip (no coords): "${item.title.slice(0,40)}"`); continue; }

      const distMi = parseFloat(distanceMiles(centerLat, centerLng, esLat, esLng).toFixed(1));
      if (distMi > radiusMi) { console.log(`  ES skip (${distMi}mi): ${item.city}`); continue; }

      const fullAddress = [item.address?.trim(), item.city, item.state, item.zip].filter(Boolean).join(', ');
      const apiType     = (item.type || '').toLowerCase().replace(/\s+/g, '');
      const saleType    = ES_TYPE_MAP[apiType] || detectType(item.title);

      // Images: main_image is the hero shot; thumbnail is a smaller version
      const imgList = [item.main_image, item.thumbnail].filter(Boolean);
      if (!imgList.length) { const t = mapThumbUrl(esLat, esLng); if (t) imgList.push(t); }

      const px = pinXY(esLat, esLng, centerLat, centerLng, radiusMi);
      results.push({
        id:           `es-${item.id || stableHash(item.url || item.title)}`,
        source:       'estatesales',
        type:         saleType,
        title:        item.title,
        address:      fullAddress,
        neighborhood: item.city || 'Nearby',
        distanceMi:   distMi,
        lat:          esLat,
        lng:          esLng,
        dateLabel:    apifyDateLabel(item.dates, esLng),
        timeLabel:    apifyTimeLabel(item.dates, esLng),
        photoCount:   imgList.length,
        images:       imgList,
        live:         false,
        blurb:        item.company ? `Hosted by ${item.company}` : '',
        price:        '',
        items:        extractItemTags(item.title, item.description),
        url:          item.url || '',
        x:            Math.max(10, Math.min(90, px.x)),
        y:            Math.max(10, Math.min(90, px.y)),
      });
    }

    console.log(`  ES Apify done — ${results.length} listings`);
    return results;
  } catch (err) {
    console.warn('  ES Apify error:', err.message);
    return null;
  }
}

// ── EstateSales — Puppeteer fallback (used when APIFY_TOKEN not set) ──────────
async function scrapeEstateSalesPuppeteer(zip, radiusMi, centerLat, centerLng) {
  const state   = stateFromZip(zip) || 'ca';
  const city    = ZIP_TO_CITY[zip]; // only known for the original SGV-area zips
  const results = [];

  // A known city slug narrows the first page nicely, but only exists for a
  // handful of hardcoded LA-area zips — everywhere else falls straight back
  // to the state-wide listing (still gets filtered to radiusMi afterward).
  const urls = city
    ? [
        `https://estatesales.org/estate-sales/${state}/${city}`,
        `https://estatesales.org/estate-sales/${state}/los-angeles-county`,
        `https://estatesales.org/estate-sales/${state}`,
      ]
    : [`https://estatesales.org/estate-sales/${state}`];

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

      const items = await page.evaluate((state) => {
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

          // City/location: find a city-level link (exactly 3 path segments: estate-sales/{state}/city)
          // Detail-page links have 5+ segments — exclude those to avoid grabbing the title link
          const locEl = card ? Array.from(card.querySelectorAll(`a[href*="/estate-sales/${state}/"]`)).find(el => {
            const parts = el.pathname.split('/').filter(Boolean);
            return parts.length === 3; // /estate-sales/{state}/city-name
          }) : null;
          const location = locEl ? locEl.textContent.trim() : '';

          // Company name: links to /estate-sale-companies/
          const coEl   = card ? card.querySelector('a[href*="/estate-sale-companies/"]') : null;
          const company = coEl ? coEl.textContent.trim() : '';

          found.push({ title, href, img, fullText, location, company });
        });

        // Strategy B: fallback — any <a> whose href has 4+ path segments (detail page)
        if (found.length === 0) {
          document.querySelectorAll(`a[href*="/estate-sales/${state}/"]`).forEach(a => {
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
      }, state);

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

        // Extract city from URL pathname: /estate-sales/ca/{city-slug}/{id}/{name}
        let cityName = '';
        try {
          const pathParts = new URL(item.href).pathname.split('/').filter(Boolean);
          const citySlug = pathParts.length >= 3 ? pathParts[2] : '';
          cityName = citySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        } catch (_) {}

        // Geocode: ZIP first, then city name, then skip
        let esLat = null, esLng = null, distMi = null, px = { x: 50, y: 50 };

        if (textZip) {
          const coords = await geocodeZip(textZip).catch(() => null);
          if (coords) { esLat = coords.lat; esLng = coords.lng; }
        }

        // Fall back to city-name geocoding (handles listings with no ZIP in URL)
        if (!esLat && cityName) {
          const coords = await geocodePlaceName(cityName, state);
          if (coords) { esLat = coords.lat; esLng = coords.lng; }
        }

        if (esLat) {
          distMi = parseFloat(distanceMiles(centerLat, centerLng, esLat, esLng).toFixed(1));
          px = pinXY(esLat, esLng, centerLat, centerLng, radiusMi);
          // Skip out-of-area listings (online auctions from other states, distant CA cities)
          if (distMi > radiusMi) { console.log(`  ES skip (${distMi}mi): ${cityName}`); continue; }
        } else {
          // No geocodeable location — skip rather than show a fake distance
          console.log(`  ES skip (no geocode): "${item.title?.slice(0,40)}"`);
          continue;
        }

        // Filter out estatesales.org's own "no photo" placeholder
        const esImg = item.img && !item.img.includes('nophoto') ? item.img : '';

        results.push({
          id:           `es-${stableHash(item.href)}`,
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
          items:        extractItemTags(item.title, item.fullText),
          url:          item.href,
          x:            Math.max(10, Math.min(90, px.x)),
          y:            Math.max(10, Math.min(90, px.y)),
        });
      }

      // Enrich with detail-page gallery images and a real street address
      const imageMap = await fetchEstateSalesImages(results);
      for (const listing of results) {
        const detail = imageMap.get(listing.url) || {};
        const imgs = detail.images || [];
        if (imgs.length) {
          listing.images     = imgs;
          listing.photoCount = imgs.length;
        }
        if (detail.address) {
          listing.address = listing.address && listing.address !== 'See listing'
            ? `${detail.address}, ${listing.address}`
            : detail.address;
        }
      }

      break; // got results — stop trying fallback URLs
    } catch (err) {
      console.warn(`  EstateSales error (${url}):`, err.message);
      await page.close().catch(() => {});
    }
  }

  console.log(`  EstateSales (Puppeteer) done — ${results.length} listings`);
  return results;
}

async function scrapeEstateSales(zip, radiusMi, centerLat, centerLng) {
  const cacheKey = `es:${zip}:${radiusMi}`;
  const cached   = fromCache(cacheKey);
  if (cached) { console.log('  ES cache hit'); return cached; }

  // Try Apify first; if token not set or call fails, fall back to Puppeteer
  let results = await scrapeEstateSalesApify(zip, radiusMi, centerLat, centerLng);
  if (results === null) results = await scrapeEstateSalesPuppeteer(zip, radiusMi, centerLat, centerLng);

  toCache(cacheKey, results);
  return results;
}

const SCRAPE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// The search-results state only exposes one mainPicture per sale, but each
// sale's own detail page embeds the same NGRX_STATE pattern with a full
// `pictures` array under entitiesById[saleId].
async function fetchEstateSalesNetPhotos(listings, concurrency = 5) {
  const imageMap = new Map(); // listing.url → string[]
  const work = listings.filter(l => l.url && l.saleId);
  console.log(`  ESN: fetching full photo sets for ${work.length} listings (${concurrency} at a time)…`);

  for (let i = 0; i < work.length; i += concurrency) {
    const batch = work.slice(i, i + concurrency);
    await Promise.all(batch.map(async listing => {
      try {
        const res = await fetchTimeout(listing.url, 10000, { headers: { 'User-Agent': SCRAPE_UA } });
        if (!res.ok) return;
        const html = await res.text();
        const m = html.match(/<script id="estatesales-net-state" type="application\/json">([\s\S]*?)<\/script>/);
        if (!m) return;
        const state = JSON.parse(m[1])?.NGRX_STATE;
        // NgRx feature state is stored under a flat literal-dot key, not a
        // nested "feature.traditionalSaleViewState" object.
        const entity = state?.['feature.traditionalSaleViewState']?.entitiesById?.[listing.saleId];
        const pictures = entity?.pictures;
        if (!Array.isArray(pictures) || !pictures.length) return;
        const urls = pictures
          .map(p => p?.images?.[0]?.url || p?.url)
          .filter(Boolean);
        if (urls.length) imageMap.set(listing.url, urls.slice(0, 12));
      } catch (_) {
        // Non-fatal: listing just keeps its single search-result thumbnail
      }
    }));
  }

  return imageMap;
}

// ── EstateSales.net ───────────────────────────────────────────────────────────
// Fully server-rendered; the page embeds a full Redux state dump with precise
// lat/lng and ISO dates per sale — far more reliable than scraping the DOM.
async function scrapeEstateSalesNet(zip, radiusMi, centerLat, centerLng) {
  const cacheKey = `esn:${zip}:${radiusMi}`;
  const cached = fromCache(cacheKey);
  if (cached) { console.log('  ESN cache hit'); return cached; }

  const results = [];
  try {
    console.log(`  EstateSales.net: zip=${zip}`);
    const res = await fetchTimeout(`https://www.estatesales.net/CA/Los-Angeles/${zip}`, 15000, {
      headers: { 'User-Agent': SCRAPE_UA },
    });
    if (!res.ok) { console.warn(`  ESN HTTP ${res.status}`); toCache(cacheKey, results); return results; }
    const html = await res.text();
    const m = html.match(/<script id="estatesales-net-state" type="application\/json">([\s\S]*?)<\/script>/);
    if (!m) { console.warn('  ESN: state script not found'); toCache(cacheKey, results); return results; }

    const state = JSON.parse(m[1])?.NGRX_STATE;
    const saleRows = state?.ui?.sales?.saleRows || {};
    const rows = Object.values(saleRows);
    console.log(`  ESN raw rows: ${rows.length}`);

    for (const row of rows) {
      if (!row?.name || row.latitude == null || row.longitude == null) continue;
      if ((row.typeName || '').includes('Online')) continue; // ship-anywhere auctions, not a local sale to visit
      const distMi = parseFloat(distanceMiles(centerLat, centerLng, row.latitude, row.longitude).toFixed(1));
      if (distMi > radiusMi) continue;

      const dates = (row.dates || [])
        .map(d => ({ start: d.utcStartDate?._value, end: d.utcEndDate?._value }))
        .filter(d => d.start);
      const img = row.mainPicture?.url || row.mainPicture?.thumbnailUrl || '';
      const px = pinXY(row.latitude, row.longitude, centerLat, centerLng, radiusMi);
      const title = row.name;

      results.push({
        id:           `esn-${row.id}`,
        saleId:       row.id,
        source:       'estatesalesnet',
        type:         (row.typeName || '').toLowerCase().includes('auction') ? 'auction' : detectType(title),
        title,
        address:      row.address ? `${row.address}, ${row.cityName || ''}`.replace(/,\s*$/, '') : (row.cityName || 'Nearby'),
        neighborhood: row.cityName || 'Nearby',
        distanceMi:   distMi,
        lat:          row.latitude,
        lng:          row.longitude,
        dateLabel:    dates.length ? apifyDateLabel(dates, row.longitude) : '',
        timeLabel:    dates.length ? apifyTimeLabel(dates, row.longitude) : '',
        photoCount:   row.pictureCount || (img ? 1 : 0),
        images:       img ? [img] : [],
        live:         false,
        blurb:        row.orgName ? `Hosted by ${row.orgName}` : '',
        price:        '',
        items:        extractItemTags(title),
        url:          `https://www.estatesales.net/CA/${(row.cityName || 'CA').replace(/\s+/g, '-')}/${zip}/${row.id}`,
        x:            Math.max(10, Math.min(90, px.x)),
        y:            Math.max(10, Math.min(90, px.y)),
      });
    }

    // The search state only gave one mainPicture per sale — visit each sale's
    // own page to pull its full photo set instead.
    const photoMap = await fetchEstateSalesNetPhotos(results);
    for (const listing of results) {
      const urls = photoMap.get(listing.url);
      if (urls?.length) { listing.images = urls; listing.photoCount = urls.length; }
      delete listing.saleId; // internal-only, not needed by the client
    }

    console.log(`  ESN done — ${results.length} listings`);
  } catch (err) {
    console.warn('  ESN error:', err.message);
  }
  toCache(cacheKey, results);
  return results;
}

// Same TLC network as GarageSaleFinder — listings syndicated from
// EstateSales.org host photos on eso-cdn.tlcdn.workers.dev with a "-t"
// thumbnail suffix; stripping it serves the full-size original.
async function fetchYardSaleSearchPhotos(listings, concurrency = 5) {
  const imageMap = new Map(); // listing.url → string[]
  const work = listings.filter(l => l.url);
  console.log(`  YSS: fetching full photo sets for ${work.length} listings (${concurrency} at a time)…`);

  for (let i = 0; i < work.length; i += concurrency) {
    const batch = work.slice(i, i + concurrency);
    await Promise.all(batch.map(async listing => {
      try {
        const res = await fetchTimeout(listing.url, 10000, { headers: { 'User-Agent': SCRAPE_UA } });
        if (!res.ok) return;
        const html = await res.text();
        const seen = new Set();
        const urls = [];
        for (const m of html.matchAll(/https:\/\/eso-cdn\.tlcdn\.workers\.dev\/s-[^"'\s]+?-t\.(?:jpg|webp)/g)) {
          const full = m[0].replace(/-t\.(jpg|webp)$/, '.$1');
          if (!seen.has(full)) { seen.add(full); urls.push(full); }
        }
        if (urls.length) imageMap.set(listing.url, urls.slice(0, 12));
      } catch (_) {
        // Non-fatal: listing just keeps its single search-result thumbnail
      }
    }));
  }

  return imageMap;
}

// ── YardSaleSearch.com ────────────────────────────────────────────────────────
// Fully server-rendered with schema.org microdata (meta tags for lat/lng and
// ISO start/end dates) — no JS rendering needed.
async function scrapeYardSaleSearch(zip, radiusMi, centerLat, centerLng) {
  const cacheKey = `yss:${zip}:${radiusMi}`;
  const cached = fromCache(cacheKey);
  if (cached) { console.log('  YSS cache hit'); return cached; }

  const results = [];
  try {
    console.log(`  YardSaleSearch: zip=${zip}`);
    const res = await fetchTimeout(`https://www.yardsalesearch.com/garage-sales.html?zip=${zip}`, 15000, {
      headers: { 'User-Agent': SCRAPE_UA },
    });
    if (!res.ok) { console.warn(`  YSS HTTP ${res.status}`); toCache(cacheKey, results); return results; }
    const html = await res.text();

    const blocks = html.split('itemtype="http://schema.org/Event"').slice(1);
    console.log(`  YSS raw blocks: ${blocks.length}`);

    for (const block of blocks) {
      const titleMatch  = block.match(/itemprop="url"[^>]*>([^<]+)</);
      const hrefMatch   = block.match(/itemprop="url" href="([^"]+)"/);
      const imgMatch    = block.match(/data-src="([^"]+)"[^>]*itemprop="image"/);
      const latMatch    = block.match(/itemprop="latitude" content="([\-\d.]+)"/);
      const lngMatch    = block.match(/itemprop="longitude" content="([\-\d.]+)"/);
      const startMatch  = block.match(/itemprop="startDate" content="([\d-]+)"/);
      const endMatch    = block.match(/itemprop="endDate" content="([\d-]+)"/);
      const streetMatch = block.match(/itemprop="streetAddress"[^>]*>([^<]*)</);
      const cityMatch   = block.match(/itemprop="addressLocality"[^>]*>([^<]*)</);
      const descMatch   = block.match(/itemprop="description"[^>]*>([^<]*)</);
      if (!titleMatch || !latMatch || !lngMatch) continue;

      const lat = parseFloat(latMatch[1]), lng = parseFloat(lngMatch[1]);
      if (isNaN(lat) || isNaN(lng)) continue;
      const distMi = parseFloat(distanceMiles(centerLat, centerLng, lat, lng).toFixed(1));
      if (distMi > radiusMi) continue;

      const title  = titleMatch[1].trim();
      const street = streetMatch?.[1]?.trim();
      const city   = cityMatch?.[1]?.trim();
      const desc   = descMatch?.[1]?.trim() || '';
      const idMatch = (hrefMatch?.[1] || '').match(/id=(\d+)/);
      const px = pinXY(lat, lng, centerLat, centerLng, radiusMi);

      results.push({
        id:           `yss-${idMatch ? idMatch[1] : `${lat}-${lng}-${results.length}`}`,
        source:       'yardsalesearch',
        type:         detectType(title),
        title,
        address:      [street, city].filter(Boolean).join(', ') || city || 'Nearby',
        neighborhood: city || 'Nearby',
        distanceMi:   distMi,
        lat, lng,
        dateLabel:    startMatch ? isoDateLabel(startMatch[1], endMatch?.[1]) : '',
        timeLabel:    parseTimeFromText(title + ' ' + desc),
        photoCount:   imgMatch ? 1 : 0,
        images:       imgMatch ? [imgMatch[1]] : [],
        live:         false,
        blurb:        desc.slice(0, 300),
        price:        '',
        items:        extractItemTags(title, desc),
        url:          hrefMatch ? hrefMatch[1] : `https://www.yardsalesearch.com/garage-sales.html?zip=${zip}`,
        x:            Math.max(10, Math.min(90, px.x)),
        y:            Math.max(10, Math.min(90, px.y)),
      });
    }

    // The search page only gave one image per listing — visit each listing's
    // own page to pull its full photo set instead.
    const photoMap = await fetchYardSaleSearchPhotos(results);
    for (const listing of results) {
      const urls = photoMap.get(listing.url);
      if (urls?.length) { listing.images = urls; listing.photoCount = urls.length; }
    }

    console.log(`  YSS done — ${results.length} listings`);
  } catch (err) {
    console.warn('  YSS error:', err.message);
  }
  toCache(cacheKey, results);
  return results;
}

// The search page only exposes one itemprop="image" per listing (despite
// `data-sale.photo_count` often being much higher) — each listing's own
// detail page embeds its full gallery as plain <img> tags, sized
// "w150-h100" in the raw HTML. That tlstatic.com CDN family (gsf.tlstatic.com
// and gsalr.tlstatic.com) also serves a much larger "w500-h500" rendition of
// the same file (confirmed via direct probing -- w150-h100 and w500-h500 both
// 200, most sizes in between 404), so every matched URL is upgraded to that
// size before use. EstateSales.org-syndicated listings instead use
// eso-cdn.tlcdn.workers.dev with a "-t" thumbnail suffix — stripping "-t" off
// that filename serves the full-size original. GSALR shares the same
// detail-page host as native GarageSaleFinder listings, reused here rather
// than duplicated, since GSALR's own search results only ever exposed a
// single w100-h100 thumbnail per listing, visibly blurry once stretched to
// fill the detail screen's photo gallery.
async function fetchGarageSaleFinderPhotos(listings, concurrency = 5) {
  const imageMap = new Map(); // listing.url → string[]
  const work = listings.filter(l => l.url);
  console.log(`  GSF: fetching full photo sets for ${work.length} listings (${concurrency} at a time)…`);

  for (let i = 0; i < work.length; i += concurrency) {
    const batch = work.slice(i, i + concurrency);
    await Promise.all(batch.map(async listing => {
      try {
        const res = await fetchTimeout(listing.url, 10000, { headers: { 'User-Agent': SCRAPE_UA } });
        if (!res.ok) return;
        const html = await res.text();
        const seen = new Set();
        const urls = [];
        for (const m of html.matchAll(/https:\/\/gsf\.tlstatic\.com\/image\/w150-h100[^"'\s]+/g)) {
          const full = m[0].replace('/w150-h100/', '/w500-h500/');
          if (!seen.has(full)) { seen.add(full); urls.push(full); }
        }
        for (const m of html.matchAll(/https:\/\/gsalr\.tlstatic\.com\/image\/w150-h100[^"'\s]+/g)) {
          const full = m[0].replace('/w150-h100/', '/w500-h500/');
          if (!seen.has(full)) { seen.add(full); urls.push(full); }
        }
        for (const m of html.matchAll(/https:\/\/eso-cdn\.tlcdn\.workers\.dev\/s-[^"'\s]+?-t\.webp/g)) {
          const full = m[0].replace(/-t\.webp$/, '.webp');
          if (!seen.has(full)) { seen.add(full); urls.push(full); }
        }
        if (urls.length) imageMap.set(listing.url, urls.slice(0, 12));
      } catch (_) {
        // Non-fatal: listing just keeps its single search-result thumbnail
      }
    }));
  }

  return imageMap;
}

// ── GarageSaleFinder.com ──────────────────────────────────────────────────────
// Fully server-rendered; each listing carries a `data-sale` JSON attribute
// with id/lat/lon directly, plus schema.org microdata for the rest.
async function scrapeGarageSaleFinder(zip, radiusMi, centerLat, centerLng) {
  const cacheKey = `gsf:${zip}:${radiusMi}`;
  const cached = fromCache(cacheKey);
  if (cached) { console.log('  GSF cache hit'); return cached; }

  const results = [];
  try {
    console.log(`  GarageSaleFinder: zip=${zip}`);
    const res = await fetchTimeout(`https://garagesalefinder.com/yard-sales/${zip}`, 15000, {
      headers: { 'User-Agent': SCRAPE_UA },
    });
    if (!res.ok) { console.warn(`  GSF HTTP ${res.status}`); toCache(cacheKey, results); return results; }
    const html = await res.text();

    const blocks = html.split('itemtype="http://schema.org/Event"').slice(1);
    console.log(`  GSF raw blocks: ${blocks.length}`);

    for (const block of blocks) {
      const saleJsonMatch = block.match(/data-sale='([^']+)'/);
      if (!saleJsonMatch) continue;
      let saleData;
      try { saleData = JSON.parse(saleJsonMatch[1]); } catch { continue; }
      const lat = saleData.lat, lng = saleData.lon;
      if (lat == null || lng == null) continue;
      const distMi = parseFloat(distanceMiles(centerLat, centerLng, lat, lng).toFixed(1));
      if (distMi > radiusMi) continue;

      const titleMatch = block.match(/class="sale-url"[^>]*>([^<]+)</);
      const hrefMatch   = block.match(/class="sale-url" href="([^"]+)"/);
      const addrMatch   = block.match(/itemprop="address"[^>]*>([^<]+)</);
      const startMatch  = block.match(/itemprop="startDate" content="([\d-]+)"/);
      const endMatch    = block.match(/itemprop="endDate" content="([\d-]+)"/);
      const imgMatch    = block.match(/itemprop="image"\s+[^>]*src="([^"]+)"/) || block.match(/src="([^"]+)"[^>]*itemprop="image"/);
      const descMatch   = block.match(/class="sale-desc"[^>]*itemprop="description"[^>]*>([^<]*)</);
      if (!titleMatch) continue;

      const title   = titleMatch[1].trim();
      const address = addrMatch?.[1]?.trim() || '';
      const city    = address.split(',')[1]?.trim() || address;
      const desc    = descMatch?.[1]?.trim() || '';
      const px = pinXY(lat, lng, centerLat, centerLng, radiusMi);

      results.push({
        id:           `gsf-${saleData.id || `${lat}-${lng}-${results.length}`}`,
        source:       'garagesalefinder',
        type:         detectType(title),
        title,
        address:      address || city || 'Nearby',
        neighborhood: city || 'Nearby',
        distanceMi:   distMi,
        lat, lng,
        dateLabel:    startMatch ? isoDateLabel(startMatch[1], endMatch?.[1]) : '',
        timeLabel:    parseTimeFromText(title + ' ' + desc),
        photoCount:   saleData.photo_count || (imgMatch ? 1 : 0),
        images:       imgMatch ? [imgMatch[1]] : [],
        live:         false,
        blurb:        desc.slice(0, 300),
        price:        '',
        items:        extractItemTags(title, desc),
        url:          hrefMatch ? hrefMatch[1] : `https://garagesalefinder.com/yard-sales/${zip}`,
        x:            Math.max(10, Math.min(90, px.x)),
        y:            Math.max(10, Math.min(90, px.y)),
      });
    }

    // The search page only gave one image per listing — visit each listing's
    // own page to pull its full photo set instead.
    const photoMap = await fetchGarageSaleFinderPhotos(results);
    for (const listing of results) {
      const urls = photoMap.get(listing.url);
      if (urls?.length) { listing.images = urls; listing.photoCount = urls.length; }
    }

    console.log(`  GSF done — ${results.length} listings`);
  } catch (err) {
    console.warn('  GSF error:', err.message);
  }
  toCache(cacheKey, results);
  return results;
}

// ── GSALR.com ─────────────────────────────────────────────────────────────────
// A direct POST to its internal listings API skips the JS-rendered city page
// entirely — we already have lat/lon/radius from our own zip geocoding.
async function scrapeGsalr(zip, radiusMi, centerLat, centerLng) {
  const cacheKey = `gsalr:${zip}:${radiusMi}`;
  const cached = fromCache(cacheKey);
  if (cached) { console.log('  GSALR cache hit'); return cached; }

  const results = [];
  try {
    console.log(`  GSALR: lat=${centerLat} lon=${centerLng} radius=${radiusMi}`);
    const res = await fetchTimeout('https://gsalr.com/block/city/listings', 15000, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':   SCRAPE_UA,
      },
      body: `lat=${centerLat}&lon=${centerLng}&radius=${Math.min(radiusMi, 18)}`,
    });
    if (!res.ok) { console.warn(`  GSALR HTTP ${res.status}`); toCache(cacheKey, results); return results; }
    const html = await res.text();

    const blocks = html.split(/<div id="l-\d+" class="listing/).slice(1);
    console.log(`  GSALR raw blocks: ${blocks.length}`);

    for (const block of blocks) {
      const latMatch   = block.match(/data-lat="([\-\d.]+)"/);
      const lonMatch   = block.match(/data-lon="([\-\d.]+)"/);
      const hrefMatch  = block.match(/href="([^"]+)"[^>]*class="sale-title"/);
      const titleMatch = block.match(/class="sale-title"[^>]*itemprop="url"[^>]*>([^<]+)</);
      const imgMatch   = block.match(/itemprop="image"[^>]*src="([^"]+)"/) || block.match(/src="([^"]+)"[^>]*itemprop="image"/);
      const cityMatch  = block.match(/itemprop="addressLocality"[^>]*>([^<]*)</);
      const regionMatch = block.match(/itemprop="addressRegion"[^>]*>([^<]*)</);
      const startMatch = block.match(/itemprop="startDate" content="([\d-]+)"/);
      const endMatch   = block.match(/itemprop="endDate" content="([\d-]+)"/);
      const descMatch  = block.match(/itemprop="description"[^>]*>([^<]*)</);
      if (!latMatch || !lonMatch || !titleMatch) continue;

      const lat = parseFloat(latMatch[1]), lng = parseFloat(lonMatch[1]);
      if (isNaN(lat) || isNaN(lng)) continue;
      const distMi = parseFloat(distanceMiles(centerLat, centerLng, lat, lng).toFixed(1));
      if (distMi > radiusMi) continue;

      const title  = titleMatch[1].trim();
      const city   = cityMatch?.[1]?.trim();
      const region = regionMatch?.[1]?.trim();
      const desc   = descMatch?.[1]?.trim() || '';
      const px = pinXY(lat, lng, centerLat, centerLng, radiusMi);

      results.push({
        id:           `gsalr-${lat}-${lng}-${results.length}`,
        source:       'gsalr',
        type:         detectType(title),
        title,
        address:      [city, region].filter(Boolean).join(', ') || 'Nearby',
        neighborhood: city || 'Nearby',
        distanceMi:   distMi,
        lat, lng,
        dateLabel:    startMatch ? isoDateLabel(startMatch[1], endMatch?.[1]) : '',
        timeLabel:    parseTimeFromText(title + ' ' + desc),
        photoCount:   imgMatch ? 1 : 0,
        // Fallback only -- overwritten below with the full gallery at the
        // larger w500-h500 size when the detail-page fetch succeeds.
        images:       imgMatch ? [imgMatch[1].replace(/\/w\d+-h\d+\//, '/w500-h500/')] : [],
        live:         false,
        blurb:        desc.slice(0, 300),
        price:        '',
        items:        extractItemTags(title, desc),
        url:          hrefMatch ? hrefMatch[1] : 'https://gsalr.com/',
        x:            Math.max(10, Math.min(90, px.x)),
        y:            Math.max(10, Math.min(90, px.y)),
      });
    }

    // GSALR's own search results only expose a single w100-h100 thumbnail
    // per listing (visibly blurry once stretched to fill the detail screen's
    // gallery) -- its listings link to the same garagesalefinder.com detail
    // pages GSF uses, which embed the full photo set, upgraded to w500-h500.
    const photoMap = await fetchGarageSaleFinderPhotos(results);
    for (const listing of results) {
      const urls = photoMap.get(listing.url);
      if (urls?.length) { listing.images = urls; listing.photoCount = urls.length; }
    }

    console.log(`  GSALR done — ${results.length} listings`);
  } catch (err) {
    console.warn('  GSALR error:', err.message);
  }
  toCache(cacheKey, results);
  return results;
}

// ── EstateSale.com ────────────────────────────────────────────────────────────
// No zip search — resolves our zip's center to a city name, looks that city up
// in a cached CA city→ID directory, then scrapes that city's listing page.
// Has no lat/lng at all, so each listing is geocoded from its city text.
// Note: this site sits behind Imperva bot-protection that can trigger
// intermittently — failures here are expected to sometimes yield 0 results.
async function scrapeEstateSaleCom(zip, radiusMi, centerLat, centerLng) {
  const cacheKey = `esc:${zip}:${radiusMi}`;
  const cached = fromCache(cacheKey);
  if (cached) { console.log('  ESC cache hit'); return cached; }

  const results = [];
  try {
    console.log(`  EstateSale.com: zip=${zip}`);
    const cityName = await reverseGeocodeCity(centerLat, centerLng);
    if (!cityName) { console.warn('  ESC: could not resolve city name'); toCache(cacheKey, results); return results; }

    let cityMap = fromCache('esc:ca-cities');
    if (!cityMap) {
      const stateRes = await fetchTimeout('https://www.estatesale.com/states/view/5/California-Estate-Sales.html', 15000, {
        headers: { 'User-Agent': SCRAPE_UA },
      });
      const stateHtml = await stateRes.text();
      cityMap = {};
      const re = /\/cities\/view\/(\d+)\/Estate-Sales-([A-Za-z0-9-]+)-CA\.html/g;
      let cm;
      while ((cm = re.exec(stateHtml))) {
        const label = cm[2].replace(/-/g, ' ').toLowerCase();
        if (!cityMap[label]) cityMap[label] = cm[1];
      }
      toCache('esc:ca-cities', cityMap);
      console.log(`  ESC: built city map with ${Object.keys(cityMap).length} CA cities`);
    }

    const cityKey = cityName.toLowerCase();
    const cityId = cityMap[cityKey]
      || Object.entries(cityMap).find(([name]) => name.includes(cityKey) || cityKey.includes(name))?.[1];
    if (!cityId) { console.warn(`  ESC: no city match for "${cityName}"`); toCache(cacheKey, results); return results; }

    const citySlug = cityName.replace(/\s+/g, '-');
    const listRes = await fetchTimeout(`https://www.estatesale.com/cities/view/${cityId}/Estate-Sales-${citySlug}-CA.html`, 15000, {
      headers: { 'User-Agent': SCRAPE_UA },
    });
    if (!listRes.ok) { console.warn(`  ESC HTTP ${listRes.status}`); toCache(cacheKey, results); return results; }
    const html = await listRes.text();

    const blocks = html.split('class="listing-summary"').slice(1);
    console.log(`  ESC raw blocks: ${blocks.length}`);

    let count = 0;
    for (const block of blocks) {
      if (count >= 30) break; // avoid excessive geocoding calls
      const hrefMatch  = block.match(/window\.location\.href="([^"]+)"/);
      const idMatch    = (hrefMatch?.[1] || '').match(/\/sales\/view\/(\d+)\.html/);
      const titleMatch = block.match(/class="listing-title"[^>]*>([^<]+)</);
      const locMatch   = block.match(/class="listing-location"[^>]*>([^<]+)</);
      const dateMatch  = block.match(/class="trebuchet[^"]*"[^>]*>([^<]+)</);
      const imgMatch   = block.match(/class="listing-logo"[\s\S]{0,80}?<img src="([^"]+)"/);
      if (!idMatch || !titleMatch) continue;
      count++;

      const title = titleMatch[1].trim();
      const locText = locMatch?.[1]?.trim() || cityName;
      const coords = await geocodeCityName(locText.split(',')[0]);
      if (!coords) continue;
      const distMi = parseFloat(distanceMiles(centerLat, centerLng, coords.lat, coords.lng).toFixed(1));
      if (distMi > radiusMi) continue;

      const px = pinXY(coords.lat, coords.lng, centerLat, centerLng, radiusMi);
      results.push({
        id:           `esc-${idMatch[1]}`,
        source:       'estatesalecom',
        type:         detectType(title),
        title,
        address:      locText,
        neighborhood: locText,
        distanceMi:   distMi,
        lat:          coords.lat,
        lng:          coords.lng,
        dateLabel:    dateMatch ? parseCLDate(dateMatch[1]) : '',
        timeLabel:    dateMatch ? parseTimeFromText(dateMatch[1]) : '',
        photoCount:   imgMatch ? 1 : 0,
        images:       imgMatch ? [imgMatch[1]] : [],
        live:         false,
        blurb:        '',
        price:        '',
        items:        extractItemTags(title),
        url:          `https://www.estatesale.com${hrefMatch[1]}`,
        x:            Math.max(10, Math.min(90, px.x)),
        y:            Math.max(10, Math.min(90, px.y)),
      });
    }
    console.log(`  ESC done — ${results.length} listings`);
  } catch (err) {
    console.warn('  ESC error:', err.message);
  }
  toCache(cacheKey, results);
  return results;
}

// ── Facebook Marketplace — Apify actor ───────────────────────────────────────
// Actor: apify/facebook-marketplace-scraper
// Searches for garage/yard/estate sale listings posted on FB Marketplace.
async function scrapeFacebookMarketplace(zip, radiusMi, centerLat, centerLng) {
  const token = process.env.APIFY_TOKEN;
  if (!token) return [];

  const cacheKey = `fb:${zip}:${radiusMi}`;
  const cached   = fromCache(cacheKey);
  if (cached) { console.log('  FB cache hit'); return cached; }

  const results = [];
  const seen    = new Set();
  const queries = ['garage sale', 'yard sale', 'estate sale', 'moving sale'];
  const fbState = stateFromZip(zip);

  for (const query of queries) {
    try {
      console.log(`  FB Marketplace Apify: "${query}" near ${zip}`);
      const res = await fetchTimeout(
        `https://api.apify.com/v2/acts/apify~facebook-marketplace-scraper/run-sync-get-dataset-items?token=${token}`,
        90000,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchQuery: query,
            locationZip: zip,
            maxItems:    20,
            radiusMiles: radiusMi,
          }),
        }
      );

      if (!res.ok) { console.warn(`  FB Apify "${query}" HTTP ${res.status}`); continue; }

      const items = await res.json();
      console.log(`  FB Apify "${query}" → ${items.length} raw items`);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        // Normalize fields — actor may use slightly different names
        const id     = item.id || item.listingId || item.listing_id || `fb-${i}-${Date.now()}`;
        const title  = item.title || item.name || '';
        const price  = item.price != null ? (typeof item.price === 'number' ? `$${item.price}` : item.price) : (item.priceAmount ? `$${item.priceAmount}` : '');
        const desc   = item.description || item.body || '';
        const locStr = item.location || item.locationName || item.location_name || item.city || '';

        if (!title || seen.has(id)) continue;
        seen.add(id);

        // Coordinates — actor sometimes provides them
        let fbLat = item.lat || item.latitude || null;
        let fbLng = item.lng || item.longitude || null;

        // Fall back to geocoding the location string
        if (!fbLat && locStr) {
          const coords = await geocodePlaceName(locStr.replace(/,.*$/, '').trim(), fbState);
          if (coords) { fbLat = coords.lat; fbLng = coords.lng; }
        }

        // If still no coords, place loosely near center
        if (!fbLat) {
          fbLat = centerLat + (Math.random() - 0.5) * 0.06;
          fbLng = centerLng + (Math.random() - 0.5) * 0.06;
        }

        const distMi = parseFloat(distanceMiles(centerLat, centerLng, fbLat, fbLng).toFixed(1));
        if (distMi > radiusMi) continue;

        // Images — actor returns urls array or single image
        const rawImgs = item.images || item.photos || (item.image ? [item.image] : []);
        const imgUrls = rawImgs.map(img => typeof img === 'string' ? img : img?.url || img?.src).filter(Boolean);
        if (!imgUrls.length) {
          const thumb = mapThumbUrl(fbLat, fbLng);
          if (thumb) imgUrls.push(thumb);
        }

        const px = pinXY(fbLat, fbLng, centerLat, centerLng, radiusMi);
        results.push({
          id:           `fb-${id}`,
          source:       'facebook',
          type:         detectType(title + ' ' + desc + ' ' + query),
          title,
          address:      locStr || 'Nearby',
          neighborhood: locStr || 'Nearby',
          distanceMi:   distMi,
          lat:          fbLat,
          lng:          fbLng,
          dateLabel:    '',
          timeLabel:    parseTimeFromText(title + ' ' + desc),
          photoCount:   imgUrls.length,
          images:       imgUrls,
          live:         false,
          blurb:        desc.slice(0, 300),
          price,
          items:        extractItemTags(title, desc),
          url:          item.url || item.link || `https://www.facebook.com/marketplace/item/${id}`,
          x:            Math.max(5, Math.min(95, px.x)),
          y:            Math.max(5, Math.min(95, px.y)),
        });
      }
    } catch (err) {
      console.warn(`  FB Apify "${query}" error:`, err.message);
    }
  }

  console.log(`  FB Marketplace done — ${results.length} listings`);
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
            id:          `goog-${stableHash(item.link || item.title)}`,
            source:      'google',
            type:        detectType(item.title + ' ' + (item.snippet || '')),
            title:       item.title,
            address:     '',
            neighborhood: 'Nearby',
            distanceMi:  0,
            dateLabel:   SALE_EVENT_RE.test(item.title) ? parseCLDate(item.title + ' ' + (item.snippet || '')) : '',
            timeLabel:   parseTimeFromText(item.title + ' ' + (item.snippet || '')),
            photoCount:  0,
            photos:      item.pagemap?.cse_image?.[0]?.src ? [item.pagemap.cse_image[0].src] : [],
            live:        false,
            blurb:       item.snippet || '',
            price:       '',
            items:       extractItemTags(item.title, item.snippet),
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

// ── Price Check (Google Vision + Google Custom Search) ─────────────────────
// Identifies an item from a photo via Vision API's Web Detection (the same
// reverse-image-search tech behind Google Lens), then runs a real Google
// search for that item via Custom Search and pulls price mentions out of
// the result snippets to build a high/low estimate with cited sources.
// Reuses the same GOOGLE_API_KEY/GOOGLE_CX env vars as fetchGoogleListings
// above -- one Google Cloud project with both Vision API and a Programmable
// Search Engine enabled covers both features.

const PRICE_RE = /\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/g;

function extractPrices(text) {
  if (!text) return [];
  const out = [];
  let m;
  PRICE_RE.lastIndex = 0;
  while ((m = PRICE_RE.exec(text))) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    // Sanity range -- filters out stray dollar amounts that are clearly not
    // a resale price for a secondhand item (e.g. "$1 million" mentions).
    if (Number.isFinite(n) && n >= 1 && n <= 50000) out.push(n);
  }
  return out;
}

async function identifyItemFromImage(base64Image) {
  const key = process.env.GOOGLE_API_KEY;
  const body = {
    requests: [{
      image: { content: base64Image },
      features: [
        { type: 'WEB_DETECTION', maxResults: 10 },
        { type: 'LABEL_DETECTION', maxResults: 5 },
      ],
    }],
  };
  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Vision API error');
  const annotation = data.responses?.[0];
  const web = annotation?.webDetection;
  const bestGuess = web?.bestGuessLabels?.[0]?.label;
  const webEntity = web?.webEntities?.find(e => e.description && e.score > 0.5)?.description;
  const topLabel = annotation?.labelAnnotations?.[0]?.description;
  const itemName = bestGuess || webEntity || topLabel;
  if (!itemName) throw new Error("Couldn't identify this item from the photo -- try a clearer or closer shot.");
  return itemName;
}

async function searchItemPrices(itemName) {
  const key = process.env.GOOGLE_API_KEY;
  const cx  = process.env.GOOGLE_CX;
  const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${encodeURIComponent(itemName + ' price')}&num=10`;
  const res  = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Search API error');
  const sources = [];
  for (const item of (data.items || [])) {
    const prices = extractPrices(`${item.title} ${item.snippet || ''}`);
    if (prices.length) sources.push({ title: item.title, url: item.link, price: prices[0] });
  }
  return sources;
}

// POST /api/price-check  { image: base64 (with or without data: prefix) }
app.post('/api/price-check', async (req, res) => {
  const key = process.env.GOOGLE_API_KEY;
  const cx  = process.env.GOOGLE_CX;
  if (!key || !cx) {
    return res.status(503).json({ error: "Price Check isn't set up yet — add GOOGLE_API_KEY and GOOGLE_CX in the server environment." });
  }
  const image = (req.body.image || '').replace(/^data:image\/\w+;base64,/, '');
  if (!image) return res.status(400).json({ error: 'No photo provided' });

  try {
    const itemName = await identifyItemFromImage(image);
    const sources = await searchItemPrices(itemName);
    if (!sources.length) return res.json({ itemName, low: null, high: null, sources: [] });
    const prices = sources.map(s => s.price);
    res.json({ itemName, low: Math.min(...prices), high: Math.max(...prices), sources: sources.slice(0, 8) });
  } catch (err) {
    console.error('Price Check error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Vintage store locator (Google Places API) ──────────────────────────────
// Google has no "thrift_store" / "antique_store" place type, so this leans on
// a keyword search rather than the `type` param -- the standard workaround
// for niche categories the Places taxonomy doesn't cover.
async function findVintageStores(lat, lng) {
  const key = process.env.GOOGLE_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&rankby=distance&keyword=${encodeURIComponent('thrift vintage antique consignment')}&key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || `Places API error: ${data.status}`);
  }
  return (data.results || []).slice(0, 10).map(r => {
    const sLat = r.geometry?.location?.lat, sLng = r.geometry?.location?.lng;
    return {
      id: `store-${r.place_id}`,
      title: r.name,
      type: 'store',
      address: r.vicinity || '',
      neighborhood: r.vicinity || '',
      lat: sLat, lng: sLng,
      distanceMi: (sLat != null && sLng != null) ? Math.round(distanceMiles(lat, lng, sLat, sLng) * 10) / 10 : null,
      rating: r.rating || null,
      ratingsCount: r.user_ratings_total || null,
      openNow: r.opening_hours?.open_now ?? null,
      dateLabel: '',
    };
  });
}

// GET /api/vintage-stores?zip=90601
app.get('/api/vintage-stores', async (req, res) => {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) {
    return res.status(503).json({ error: "Vintage store search isn't set up yet — add GOOGLE_API_KEY in the server environment." });
  }
  const zip = req.query.zip;
  if (!zip) return res.status(400).json({ error: 'Missing zip' });

  const cacheKey = `vintage:${zip}`;
  const cached = fromCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const center = await geocodeZip(zip);
    if (!center) throw new Error(`Cannot geocode ZIP: ${zip}`);
    const payload = { stores: await findVintageStores(center.lat, center.lng) };
    toCache(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.error('Vintage store search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Listings aggregation (shared by the /api/listings route and the daily digest job) ──
async function getListingsForZip(zip, radiusMi) {
  const cacheKey = `all:${zip}:${radiusMi}`;
  const cached   = fromCache(cacheKey);
  if (cached) {
    console.log('Cache hit:', cacheKey);
    return cached;
  }

  console.log(`\nFetching listings — zip=${zip} radius=${radiusMi}mi`);
  const center = await geocodeZip(zip);
  if (!center) throw new Error(`Cannot geocode ZIP: ${zip}${geocodeZip.lastErrors ? ' (' + geocodeZip.lastErrors.join(' | ') + ')' : ''}`);

  // Every scraper here targets US sources specifically (Craigslist's
  // regional US sites, estatesales.org/.net, etc.) — a ZIP that resolves
  // somewhere off the continent would still geocode "successfully" via the
  // Zippopotam/Photon fallbacks (which aren't US-scoped), but every scraper
  // would run pointlessly and, worse, some hang rather than returning empty
  // quickly. Fail fast for anything outside a generous US bounding box
  // (continental US + Alaska + Hawaii) instead of stalling the request.
  const inUSBounds = center.lat >= 18 && center.lat <= 72 && center.lng >= -180 && center.lng <= -65;
  if (!inUSBounds) {
    console.log(`  ZIP ${zip} (${center.lat},${center.lng}) is outside US bounds — skipping scrape`);
    const err = new Error(`Rummage currently only covers the United States — ${zip} appears to be outside that.`);
    err.outOfCoverage = true;
    throw err;
  }

  // Run all scrapers in parallel
  const [clListings, ouListings, esListings, fbListings, googleListings,
         esnListings, yssListings, gsfListings, gsalrListings, escListings] = await Promise.allSettled([
    scrapeCraigslist(zip, radiusMi, center.lat, center.lng),
    scrapeOfferUp(zip, radiusMi, center.lat, center.lng),
    scrapeEstateSales(zip, radiusMi, center.lat, center.lng),
    scrapeFacebookMarketplace(zip, radiusMi, center.lat, center.lng),
    fetchGoogleListings(zip),
    scrapeEstateSalesNet(zip, radiusMi, center.lat, center.lng),
    scrapeYardSaleSearch(zip, radiusMi, center.lat, center.lng),
    scrapeGarageSaleFinder(zip, radiusMi, center.lat, center.lng),
    scrapeGsalr(zip, radiusMi, center.lat, center.lng),
    scrapeEstateSaleCom(zip, radiusMi, center.lat, center.lng),
  ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : []));

  // Dedicated sale-listing platforms (EstateSales.org, EstateSales.net,
  // YardSaleSearch, GarageSaleFinder, GSALR, EstateSale.com) are exempt from
  // the title filter — their whole category is estate/yard sales by
  // definition, so filtering by title would only create false negatives.
  // Generic marketplaces (Craigslist, OfferUp, Facebook, Google) still need it.
  const onlySaleEvents = list => list.filter(l => SALE_EVENT_RE.test(l.title || ''));
  const clKept = onlySaleEvents(clListings);
  const ouKept = onlySaleEvents(ouListings);
  const fbKept = onlySaleEvents(fbListings);
  const gKept  = onlySaleEvents(googleListings);

  const combined = [...clKept, ...ouKept, ...esListings, ...fbKept, ...gKept,
                    ...esnListings, ...yssListings, ...gsfListings, ...gsalrListings, ...escListings]
    .map(l => ({ ...l, title: decodeHtmlEntities(l.title), address: decodeHtmlEntities(l.address), neighborhood: decodeHtmlEntities(l.neighborhood) }));

  // EstateSales.org, EstateSales.net, YardSaleSearch, GarageSaleFinder, and
  // GSALR often share the same underlying estate-sale syndication feed, so
  // the exact same physical sale can come back from several of them at once
  // — but each site geocodes it slightly differently, sometimes a couple
  // miles apart, so exact-coordinate matching missed a lot of these.
  //
  // Two different dedup strategies, because a generic title ("Yard sale",
  // "Garage sale") legitimately belongs to many different real sales spread
  // across the whole radius — those must NOT be merged just for being
  // nearby. A long, distinctive title ("RPV Mid Century Home Trust Sale!")
  // essentially never coincides by chance, so an exact match within a
  // generous radius is almost certainly the same sale re-geocoded slightly
  // differently by each source.
  const distinctiveGroups = []; // [{ title, lat, lng, listing }]
  const bucketGroups = new Map();
  const DISTINCTIVE_MIN_LEN = 16;
  const DISTINCTIVE_MERGE_RADIUS_MI = 15;

  for (const listing of combined) {
    const normTitle = (listing.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const isDistinctive = normTitle.length >= DISTINCTIVE_MIN_LEN && listing.lat != null && listing.lng != null;

    if (isDistinctive) {
      const match = distinctiveGroups.find(g =>
        g.title === normTitle && distanceMiles(g.lat, g.lng, listing.lat, listing.lng) <= DISTINCTIVE_MERGE_RADIUS_MI
      );
      if (match) {
        if ((listing.images?.length || 0) > (match.listing.images?.length || 0)) match.listing = listing;
        continue;
      }
      distinctiveGroups.push({ title: normTitle, lat: listing.lat, lng: listing.lng, listing });
      continue;
    }

    const latKey = listing.lat != null ? listing.lat.toFixed(2) : '?';
    const lngKey = listing.lng != null ? listing.lng.toFixed(2) : '?';
    const key = `${normTitle.slice(0, 30)}|${latKey},${lngKey}`;
    const existing = bucketGroups.get(key);
    if (!existing || (listing.images?.length || 0) > (existing.images?.length || 0)) {
      bucketGroups.set(key, listing);
    }
  }
  const titleDeduped = [...distinctiveGroups.map(g => g.listing), ...bucketGroups.values()];

  // Same physical sale can still slip through with two different marketing
  // taglines per source ("BIG La Mirada Estate Sale" vs "Sunday 50% Off! ...
  // Big La Mirada Estate Sale") — titles differ too much for the checks
  // above, but a real street address (a number + street name, not just a
  // bare city) is a much stronger signal of the same sale nearby.
  const STREET_ADDR_RE = /^\s*\d+[\s,]/; // starts with a street number
  const ADDRESS_MERGE_RADIUS_MI = 3;
  const addressGroups = []; // [{ addr, lat, lng, listing }]
  const all = [];
  for (const listing of titleDeduped) {
    // Sources append different suffixes after the street address ("near Elm
    // St" vs ", City Name"), so only compare the leading number+street-name
    // segment rather than the whole string.
    const addrHead = (listing.address || '').split(/,|\bnear\b/i)[0];
    const addr = addrHead.toLowerCase().replace(/[^a-z0-9]/g, '');
    const hasStreetAddr = STREET_ADDR_RE.test(listing.address || '') && listing.lat != null && listing.lng != null;

    if (hasStreetAddr) {
      const match = addressGroups.find(g =>
        g.addr === addr && distanceMiles(g.lat, g.lng, listing.lat, listing.lng) <= ADDRESS_MERGE_RADIUS_MI
      );
      if (match) {
        if ((listing.images?.length || 0) > (match.listing.images?.length || 0)) match.listing = listing;
        continue;
      }
      addressGroups.push({ addr, lat: listing.lat, lng: listing.lng, listing });
      continue;
    }
    all.push(listing);
  }
  all.push(...addressGroups.map(g => g.listing));
  console.log(`Total: ${all.length} (deduped from ${combined.length}) — CL=${clKept.length}/${clListings.length} OU=${ouKept.length}/${ouListings.length} ES=${esListings.length} FB=${fbKept.length}/${fbListings.length} G=${gKept.length}/${googleListings.length} ESN=${esnListings.length} YSS=${yssListings.length} GSF=${gsfListings.length} GSALR=${gsalrListings.length} ESC=${escListings.length}`);

  toCache(cacheKey, all);
  return all;
}

// GET /api/reverse-geocode?lat=&lng=  -> { zip }
// Used by the frontend's "you're away from your home ZIP" detection: turns
// a GPS fix into a ZIP code so the rest of the app can keep working in
// terms of ZIP + radius, same as every other search path.
app.get('/api/reverse-geocode', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }
  const cacheKey = `rev:${lat.toFixed(3)}:${lng.toFixed(3)}`;
  const cached = fromCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const r = await fetchTimeout(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
      5000,
      { headers: { 'User-Agent': 'RummageApp/1.0 (local sale finder; contact via app feedback)' } }
    );
    const data = await r.json();
    const zip = data?.address?.postcode?.slice(0, 5) || null;
    if (!zip) return res.status(404).json({ error: 'Could not resolve a ZIP code for this location' });
    const result = { zip, city: data.address.city || data.address.town || data.address.village || null };
    toCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Main route ────────────────────────────────────────────────────────────────
app.get('/api/listings', async (req, res) => {
  const zip      = String(req.query.zip || '90601').replace(/\D/g, '').slice(0, 5);
  const radiusMi = Math.min(50, Math.max(1, parseInt(req.query.radius || '10', 10)));

  if (zip.length !== 5) return res.status(400).json({ error: 'Invalid ZIP' });

  try {
    const all = await getListingsForZip(zip, radiusMi);
    res.json({ zip, radiusMi, count: all.length, listings: all });
  } catch (err) {
    if (err.outOfCoverage) {
      return res.json({ zip, radiusMi, count: 0, listings: [], outOfCoverage: true, message: err.message });
    }
    res.status(500).json({ error: err.message, listings: [] });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true, cached: cache.size, uptime: Math.round(process.uptime()), chrome: CHROME_PATH,
    // Presence-only booleans -- never the actual secret values -- so we can
    // remotely confirm env vars are wired up without exposing them.
    smsConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
    smsMissing: ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_PHONE_NUMBER'].filter(k => !process.env[k]),
    emailConfigured: !!process.env.RESEND_API_KEY,
  });
});

app.post('/api/clear-cache', (_req, res) => {
  cache.clear();
  console.log('Cache cleared');
  res.json({ ok: true });
});

// ── Daily email digest ───────────────────────────────────────────────────────
// Subscribers are the same account email used for verification. Stored in
// Upstash Redis (a free REST-based store) when configured, since Render's
// free tier has no persistent disk -- a plain JSON file gets silently wiped
// back to empty on every deploy, losing every real subscriber. The file
// fallback below only exists so local dev keeps working without needing
// Upstash credentials.
const SUBSCRIBERS_FILE = path.join(__dirname, 'subscribers.json');
const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const SUBSCRIBERS_KEY = 'rummage:subscribers';

async function loadSubscribers() {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const r = await fetch(`${UPSTASH_URL}/get/${SUBSCRIBERS_KEY}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      });
      const data = await r.json();
      // fetch() only throws on network failure, never on a non-2xx HTTP
      // response -- a bad token or URL returns normally with an error body,
      // so that has to be checked explicitly or it fails completely silently.
      if (!r.ok) { console.error('Upstash load failed:', r.status, JSON.stringify(data)); return []; }
      return data.result ? JSON.parse(data.result) : [];
    } catch (err) {
      console.error('Upstash load failed:', err.message);
      return [];
    }
  }
  try { return JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf8')); } catch { return []; }
}
async function saveSubscribers(list) {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const r = await fetch(UPSTASH_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['SET', SUBSCRIBERS_KEY, JSON.stringify(list)]),
      });
      if (!r.ok) console.error('Upstash save failed:', r.status, await r.text());
    } catch (err) {
      console.error('Upstash save failed:', err.message);
    }
    return;
  }
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(list, null, 2));
}

// POST /api/subscribe  { email, zip, radiusMi, saleTypes }
app.post('/api/subscribe', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email || !/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: 'Invalid email' });

  const zip      = String(req.body.zip || '90601').replace(/\D/g, '').slice(0, 5);
  const radiusMi = Math.min(50, Math.max(1, parseInt(req.body.radiusMi || '15', 10)));
  const saleTypes = req.body.saleTypes && typeof req.body.saleTypes === 'object'
    ? req.body.saleTypes : { estate: true, yard: true, moving: true };

  const subscribers = await loadSubscribers();
  const existing = subscribers.find(s => s.email === email);
  if (existing) {
    Object.assign(existing, { zip, radiusMi, saleTypes, active: true });
  } else {
    subscribers.push({ email, zip, radiusMi, saleTypes, active: true, lastSentDate: null });
  }
  await saveSubscribers(subscribers);
  res.json({ ok: true });
});

// POST /api/unsubscribe  { email }
app.post('/api/unsubscribe', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const subscribers = await loadSubscribers();
  const existing = subscribers.find(s => s.email === email);
  if (existing) { existing.active = false; await saveSubscribers(subscribers); }
  res.json({ ok: true });
});

// GET /unsubscribe?email=x  — the digest email's footer link goes straight
// here (not through the app), so this has to work with just a click, no
// sign-in required, per CAN-SPAM's one-click unsubscribe requirement.
app.get('/unsubscribe', async (req, res) => {
  const email = (req.query.email || '').trim().toLowerCase();
  const subscribers = await loadSubscribers();
  const existing = subscribers.find(s => s.email === email);
  if (existing) { existing.active = false; await saveSubscribers(subscribers); }
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Unsubscribed</title></head>
  <body style="margin:0;background:#F3ECDF;font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;box-sizing:border-box;">
    <div style="max-width:420px;text-align:center;background:#FFFFFF;border:1px solid #E5DDCE;border-radius:20px;padding:36px 28px;">
      <div style="font-size:32px;">${existing ? '👋' : '🤔'}</div>
      <h1 style="font-size:20px;color:#1C1917;margin:12px 0 6px;">${existing ? "You're unsubscribed" : "We couldn't find that email"}</h1>
      <p style="font-size:14px;color:#57534E;line-height:1.5;margin:0;">${existing
        ? `${digestEscapeHtml(email)} won't receive the daily digest anymore. You can turn it back on anytime in the app.`
        : `${digestEscapeHtml(email)} isn't on our digest list, so there's nothing to do here.`}</p>
    </div>
  </body></html>`);
});

// ── Push notifications (APNs) ────────────────────────────────────────────────
// Hand-rolled against Apple's HTTP/2 API rather than a library (node-apn etc)
// -- same "no SDK, raw request" convention as sendResendEmail/sendTwilioSMS
// above. Token-based auth (a .p8 key signed into a short-lived ES256 JWT)
// rather than a certificate, using the same `jwt` (jsonwebtoken) already
// required above for Apple Sign-In verification -- it already supports ES256.
const http2 = require('http2');
const APNS_KEY_ID      = process.env.APNS_KEY_ID;
const APNS_TEAM_ID     = process.env.APNS_TEAM_ID;
// PEM keys need real newlines between BEGIN/END and within the base64 body.
// Pasting the .p8 file into a web form's env var field commonly mangles
// those -- either flattened to literal "\n" text, or stripped outright with
// no separator left at all. Handle both: normalize escaped newlines first,
// and if the result still has none, reconstruct a properly-wrapped PEM from
// just the base64 body between the BEGIN/END markers.
function normalizePemKey(raw) {
  let key = (raw || '').replace(/\\n/g, '\n').trim();
  if (!key.includes('-----BEGIN')) {
    // Just the base64 body was saved -- no header/footer at all (confirmed
    // via /__debug-apns: real newlines survived, but no "-----BEGIN" text).
    // Apple's .p8 downloads are PKCS8 "PRIVATE KEY" blocks, so wrap as that.
    const body = key.replace(/\s+/g, '').match(/.{1,64}/g) || [];
    return `-----BEGIN PRIVATE KEY-----\n${body.join('\n')}\n-----END PRIVATE KEY-----\n`;
  }
  if (key.includes('\n')) return key;
  const m = key.match(/-----BEGIN ([\w\s]+?)-----(.*)-----END ([\w\s]+?)-----/);
  if (!m) return key;
  const body = m[2].replace(/\s+/g, '').match(/.{1,64}/g) || [];
  return `-----BEGIN ${m[1]}-----\n${body.join('\n')}\n-----END ${m[3]}-----\n`;
}
const APNS_PRIVATE_KEY = normalizePemKey(process.env.APNS_PRIVATE_KEY);
const APNS_BUNDLE_ID   = process.env.APNS_BUNDLE_ID || 'com.rummagedeals.app';

// TEMPORARY — reports the raw+normalized key's shape (never its content) so
// a real mangling can be diagnosed without pasting the secret anywhere.
// Remove once APNs sending is confirmed working.
app.get('/__debug-apns', (req, res) => {
  const raw = process.env.APNS_PRIVATE_KEY || '';
  res.json({
    hasKeyId: !!APNS_KEY_ID,
    hasTeamId: !!APNS_TEAM_ID,
    rawLength: raw.length,
    rawHasRealNewline: raw.includes('\n'),
    rawHasEscapedNewline: raw.includes('\\n'),
    rawFirst30: raw.slice(0, 30),
    rawLast30: raw.slice(-30),
    normalizedLength: APNS_PRIVATE_KEY.length,
    normalizedLineCount: APNS_PRIVATE_KEY.split('\n').length,
    normalizedFirstLine: APNS_PRIVATE_KEY.split('\n')[0] || '',
    normalizedLastLine: APNS_PRIVATE_KEY.split('\n').filter(Boolean).pop() || '',
    canParseAsKey: (() => {
      try { require('crypto').createPrivateKey(APNS_PRIVATE_KEY); return true; }
      catch (err) { return err.message; }
    })(),
  });
});
// Xcode debug/Simulator/TestFlight-via-Xcode builds register against Apple's
// *sandbox* APNs host, not production -- only a real App Store build uses
// production. Stays sandbox until real release testing.
const APNS_HOST = process.env.APNS_ENV === 'production'
  ? 'api.push.apple.com'
  : 'api.sandbox.push.apple.com';

let cachedApnsJwt = null;
let cachedApnsJwtAt = 0;
function signApnsJwt() {
  // Apple's guidance: don't mint a new token per request -- reuse one for up
  // to ~55 minutes (tokens are valid up to 60).
  if (cachedApnsJwt && Date.now() - cachedApnsJwtAt < 55 * 60 * 1000) return cachedApnsJwt;
  cachedApnsJwt = jwt.sign({ iss: APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }, APNS_PRIVATE_KEY, {
    algorithm: 'ES256',
    header: { alg: 'ES256', kid: APNS_KEY_ID },
  });
  cachedApnsJwtAt = Date.now();
  return cachedApnsJwt;
}

// sendApnsPush(deviceToken, { title, body, saleId }) -- dev mode (missing
// APNs env vars) just logs to console, same fallback pattern as every other
// integration in this file.
async function sendApnsPush(deviceToken, { title, body, saleId }) {
  if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_PRIVATE_KEY) {
    console.log(`\n🔔 DEV MODE — push to ${deviceToken.slice(0, 12)}...: ${title} — ${body}\n`);
    return { ok: true, devMode: true };
  }
  const payload = JSON.stringify({ aps: { alert: { title, body }, sound: 'default' }, saleId: saleId || null });
  return new Promise((resolve, reject) => {
    const client = http2.connect(`https://${APNS_HOST}`);
    client.on('error', reject);
    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      'authorization': `bearer ${signApnsJwt()}`,
      'apns-topic': APNS_BUNDLE_ID,
      'apns-push-type': 'alert',
      'content-type': 'application/json',
    });
    let status = 0;
    let body_ = '';
    req.on('response', headers => { status = headers[':status']; });
    req.on('data', chunk => { body_ += chunk; });
    req.on('end', () => {
      client.close();
      if (status !== 200) return reject(new Error(`APNs ${status}: ${body_ || '(no body)'}`));
      resolve({ ok: true });
    });
    req.on('error', reject);
    req.end(payload);
  });
}

// POST /api/push/register  { email, pushToken }  -- pushToken: null unregisters.
// Upserts into the same subscriber record the daily digest uses (same email
// identity, same loadSubscribers/saveSubscribers helpers) rather than a
// separate store -- creating a record here does NOT opt the user into the
// digest (active stays false for a brand-new record).
app.post('/api/push/register', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email || !/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: 'Invalid email' });
  const pushToken = req.body.pushToken || null;

  const subscribers = await loadSubscribers();
  const existing = subscribers.find(s => s.email === email);
  if (existing) {
    existing.pushToken = pushToken;
  } else {
    subscribers.push({ email, zip: '90601', radiusMi: 15, saleTypes: { estate: true, yard: true, moving: true }, active: false, lastSentDate: null, pushToken });
  }
  await saveSubscribers(subscribers);
  res.json({ ok: true });
});

// POST /api/push/test  { email }  -- manual send, proves the pipeline works
// end-to-end. Mirrors /api/send-digest-now's shape: no auth beyond already
// being a known subscriber with a registered token.
app.post('/api/push/test', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const subscribers = await loadSubscribers();
  const sub = subscribers.find(s => s.email === email);
  if (!sub || !sub.pushToken) return res.status(404).json({ error: 'No push token registered for that email' });
  try {
    await sendApnsPush(sub.pushToken, { title: 'Rummage', body: "Test push — if you're seeing this, it works!" });
    res.json({ ok: true });
  } catch (err) {
    console.error('APNs send failed:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// Whether a listing's display date label ("Sat, Jul 4" or a range like
// "Sat, Jul 4 – Sun, Jul 5") includes today. Mirrors the parsing the
// frontend does for saleSortDate/isSaleLive, but date-only (no time).
const DIGEST_MO_IDX = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
function saleTouchesToday(dateLabel) {
  const label = dateLabel || '';
  if (!label) return false;
  const hits = [...label.matchAll(/([A-Za-z]{3,9})\s+(\d{1,2})(?:,?\s*(\d{4}))?/g)]
    .filter(m => DIGEST_MO_IDX[m[1].toLowerCase().slice(0,3)] !== undefined)
    .map(m => {
      const mo = DIGEST_MO_IDX[m[1].toLowerCase().slice(0,3)];
      const day = parseInt(m[2]);
      const year = m[3] ? parseInt(m[3]) : new Date().getFullYear();
      return new Date(year, mo, day).setHours(0,0,0,0);
    });
  if (!hits.length) return false;
  const today = new Date().setHours(0,0,0,0);
  if (hits.length === 1) return hits[0] === today;
  const start = Math.min(...hits), end = Math.max(...hits);
  return today >= start && today <= end;
}

// Same hotlink-protection list the frontend's proxyImgUrl uses (Craigslist,
// EstateSales.org/.net, GarageSaleFinder's eso-cdn, Facebook, etc. all
// reject direct hotlinking without our proxy setting the right Referer) —
// but built as an absolute URL, since email images can't be relative paths.
function proxyImgUrlForEmail(url) {
  try {
    const h = new URL(url).hostname;
    if (h === 'estatesales.org' || h.endsWith('.estatesales.org') ||
        h === 'estatesales.net' || h.endsWith('.estatesales.net') ||
        h.endsWith('.amazonaws.com') || h.endsWith('.cloudfront.net') ||
        h.endsWith('.imgix.net') || h.endsWith('.tlcdn.workers.dev') || h === 'eso-cdn.tlcdn.workers.dev' ||
        h === 'images.craigslist.org' || h === 'maps.geoapify.com' ||
        h.endsWith('.fbcdn.net') || h === 'fbcdn.net' || h.endsWith('.facebook.com'))
      return `${PUBLIC_BASE_URL}/api/img?url=${encodeURIComponent(url)}`;
  } catch (_) {}
  return url;
}

// ── Digest date/live-sale helpers (ported from index.html's client-side
// parseSaleStart/parseSaleDateRange/isSaleLive) — the email is generated
// server-side with no DOM/client JS available, so the "● NOW" badge needs
// its own copy of that same date-parsing logic rather than being able to
// share it directly with the frontend.
const DIGEST_DOW_IDX = { sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6 };
function digestParseSaleStart(dateLabel, timeLabel) {
  if (!timeLabel) return null;
  const tMatch = timeLabel.match(/(\d+)(?::(\d+))?\s*(am|pm)/i);
  if (!tMatch) return null;
  let h = parseInt(tMatch[1]);
  const m = tMatch[2] ? parseInt(tMatch[2]) : 0;
  const ap = tMatch[3].toLowerCase();
  if (ap === 'pm' && h !== 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  const now = new Date();
  const full = dateLabel && dateLabel.match(/\w+,\s+(\w+)\s+(\d+)/);
  if (full) {
    const mo = DIGEST_MO_IDX[full[1].toLowerCase().slice(0,3)];
    if (mo !== undefined) {
      const d = new Date(now.getFullYear(), mo, parseInt(full[2]), h, m, 0);
      const allHits = [...dateLabel.matchAll(/([A-Za-z]{3,9})\s+(\d{1,2})/g)]
        .filter(hm => DIGEST_MO_IDX[hm[1].toLowerCase().slice(0,3)] !== undefined);
      const lastHit = allHits[allHits.length - 1] || full;
      const lastMo  = DIGEST_MO_IDX[lastHit[1].toLowerCase().slice(0,3)];
      const rangeEnd = new Date(now.getFullYear(), lastMo, parseInt(lastHit[2]), 23, 59, 59);
      if (rangeEnd.getTime() < now.getTime() - 24*60*60*1000) d.setFullYear(now.getFullYear() + 1);
      return d;
    }
  }
  const dm = dateLabel && dateLabel.match(/^(\w{3})/i);
  if (dm) {
    const dn = DIGEST_DOW_IDX[dm[1].toLowerCase()];
    if (dn !== undefined) {
      let diff = dn - now.getDay();
      if (diff < 0) diff += 7;
      if (diff === 0 && now.getHours() >= h) diff = 7;
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, h, m, 0);
    }
  }
  return null;
}
function digestSaleIsLive(dateLabel, timeLabel) {
  const start = digestParseSaleStart(dateLabel, timeLabel);
  if (!start) return false;
  const now = Date.now();
  if (now < start.getTime()) return false;
  const allTimes = (timeLabel || '').match(/(\d+)(?::(\d+))?\s*(am|pm)/gi) || [];
  if (allTimes.length < 2) return false; // no end time -- can't confirm still in progress
  const last = allTimes[allTimes.length - 1].match(/(\d+)(?::(\d+))?\s*(am|pm)/i);
  let endH = parseInt(last[1]), endM = last[2] ? parseInt(last[2]) : 0;
  const ap = last[3].toLowerCase();
  if (ap === 'pm' && endH !== 12) endH += 12;
  if (ap === 'am' && endH === 12) endH = 0;
  const hits = [...(dateLabel || '').matchAll(/([A-Za-z]{3,9})\s+(\d{1,2})/g)]
    .filter(m => DIGEST_MO_IDX[m[1].toLowerCase().slice(0,3)] !== undefined);
  let end;
  if (hits.length) {
    const h = hits[hits.length - 1];
    const mo = DIGEST_MO_IDX[h[1].toLowerCase().slice(0,3)];
    end = new Date(start.getFullYear(), mo, parseInt(h[2]), endH, endM, 0);
    if (end.getTime() < start.getTime()) end.setFullYear(end.getFullYear() + 1);
  } else {
    end = new Date(start); end.setHours(endH, endM, 0, 0);
    if (end <= start) end.setDate(end.getDate() + 1);
  }
  return now < end.getTime();
}

function digestEscapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

// Real listing `type` values only ever come back as estate/yard/moving/
// auction (see detectType) -- no separate "thrift" category exists for
// scraped sale listings, so that's not represented here.
const DIGEST_TYPE_STYLES = {
  estate:  { label: 'ESTATE SALE', badgeBg: '#ECE6FB', badgeFg: '#6D28D9', gradFrom: '#F4C3A4', gradTo: '#EC9D70', iconFg: '#7C2D12' },
  yard:    { label: 'YARD SALE',   badgeBg: '#E4F1E5', badgeFg: '#15803D', gradFrom: '#E4F1E5', gradTo: '#CDE6CE', iconFg: '#15803D' },
  moving:  { label: 'MOVING SALE', badgeBg: '#FAE8CD', badgeFg: '#B45309', gradFrom: '#FAE8CD', gradTo: '#F3D8AE', iconFg: '#7C4A0A' },
  auction: { label: 'AUCTION',     badgeBg: '#FBE3E7', badgeFg: '#BE123C', gradFrom: '#FBE3E7', gradTo: '#F5C7CE', iconFg: '#881337' },
};
const DIGEST_MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DIGEST_DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function digestCardHtml(l) {
  const style = DIGEST_TYPE_STYLES[l.type] || DIGEST_TYPE_STYLES.yard;
  const href = `${PUBLIC_BASE_URL}/app?sale=${encodeURIComponent(l.id)}`;
  const live = digestSaleIsLive(l.dateLabel, l.timeLabel);
  // Escape each raw field individually, then join with the (already-safe,
  // not user data) &middot; entity -- escaping the joined string instead
  // would turn "&middot;" itself into visible "&amp;middot;" text.
  const cityLine = [l.distanceMi != null ? `${l.distanceMi}&nbsp;mi` : null, digestEscapeHtml(l.neighborhood || l.address)]
    .filter(Boolean).join(' &middot; ');
  const dateLine = [digestEscapeHtml(l.dateLabel), digestEscapeHtml(l.timeLabel)].filter(Boolean).join(' &middot; ');
  // Real photo when the listing has one; otherwise the same gradient + pin
  // placeholder as before. bgcolor on the image cell (rather than just the
  // <img> tag) gives a same-toned fallback if the photo is slow to load or
  // gets blocked by the email client, instead of a bare broken-image icon.
  const media = l.images?.[0]
    ? `<img src="${proxyImgUrlForEmail(l.images[0])}" width="100%" height="120" alt="" style="width:100%; height:120px; object-fit:cover; display:block; border-radius:20px 20px 0 0;" />`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,${style.gradFrom},${style.gradTo}); border-radius:20px 20px 0 0;">
                      <tr>
                        <td height="120" align="center" valign="middle" style="font-family:Arial,sans-serif; font-size:26px; color:${style.iconFg};">&#128205;</td>
                      </tr>
                    </table>`;
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFFFFF; border:1px solid #E5DDCE; border-radius:20px;">
                <tr>
                  <td style="position:relative;" bgcolor="${style.gradFrom}">
                    ${media}
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="position:absolute; top:10px; left:10px;">
                      <tr><td bgcolor="${style.badgeBg}" style="border-radius:100px; padding:4px 10px; font-family:Arial,sans-serif; font-size:10px; font-weight:700; color:${style.badgeFg};">${style.label}</td></tr>
                    </table>
                    ${live ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="position:absolute; top:10px; right:10px;">
                      <tr><td bgcolor="#E6F1E7" style="border-radius:100px; padding:4px 8px; font-family:Arial,sans-serif; font-size:9px; font-weight:700; color:#15803D;">&#9679; NOW</td></tr>
                    </table>` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px 16px 16px;">
                    <div style="font-family:Georgia,'Newsreader',serif; font-size:16px; font-weight:700; color:#1C1917; line-height:1.3; max-height:2.6em; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${digestEscapeHtml(l.title || 'Sale')}</div>
                    <div style="font-family:'Spline Sans Mono','Courier New',monospace; font-size:12px; color:#57534E; padding-top:6px;">${cityLine}</div>
                    <div style="font-family:'Spline Sans Mono','Courier New',monospace; font-size:12px; color:#78716C; padding-top:2px;">${dateLine}</div>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
                      <tr><td style="font-family:Arial,sans-serif; font-size:13px; font-weight:700;"><a href="${href}" style="color:#0F766E;">View sale &rarr;</a></td></tr>
                    </table>
                  </td>
                </tr>
              </table>`;
}

function buildDigestHtml(listings, { zip, email }) {
  const CARD_LIMIT = 6;
  const shown = listings.slice(0, CARD_LIMIT);
  const remaining = Math.max(0, listings.length - CARD_LIMIT);

  const rows = [];
  for (let i = 0; i < shown.length; i += 2) {
    const a = shown[i], b = shown[i + 1];
    rows.push(`
    <tr>
      <td style="padding:0 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="50%" valign="top" class="rm-col rm-col-pad" style="padding:0 8px 16px 8px;">${digestCardHtml(a)}</td>
            <td width="50%" valign="top" class="rm-col rm-col-pad" style="padding:0 8px 16px 8px;">${b ? digestCardHtml(b) : ''}</td>
          </tr>
        </table>
      </td>
    </tr>`);
  }

  const moreSection = remaining > 0 ? `
    <tr>
      <td style="padding:8px 20px 32px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1C1917; border-radius:20px;">
          <tr>
            <td align="center" style="padding:32px 24px;">
              <div style="font-family:Georgia,'Newsreader',serif; font-size:19px; font-weight:700; color:#FAF6EE; line-height:1.3;">
                ${remaining} more sale${remaining===1?'':'s'} ${remaining===1?'is':'are'} waiting on the map.
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
                <tr>
                  <td bgcolor="#C2410C" style="border-radius:14px;">
                    <a href="${PUBLIC_BASE_URL}/app" style="display:block; padding:13px 26px; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:700; color:#FFFFFF; border-radius:14px;">Open Rummage</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>` : '';

  const now = new Date();
  const dateStr = `${DIGEST_DAY_NAMES[now.getDay()]}, ${DIGEST_MONTH_NAMES[now.getMonth()]} ${now.getDate()}`;
  const closestMi = shown[0]?.distanceMi;
  const typesPresent = [...new Set(shown.map(l => (DIGEST_TYPE_STYLES[l.type] || DIGEST_TYPE_STYLES.yard).label.toLowerCase()))];
  const preheader = `${listings.length} sale${listings.length===1?'':'s'} near you today${closestMi!=null?`, starting ${closestMi} mi away`:''}${typesPresent.length?` — ${typesPresent.join(', ')} and more.`:'.'}`;
  const unsubUrl = `${PUBLIC_BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
  const prefsUrl = `${PUBLIC_BASE_URL}/app`;

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Rummage — Sales near you today</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
  a { text-decoration: none; }
  @media screen and (max-width: 480px) {
    .rm-container { width: 100% !important; }
    .rm-col { display: block !important; width: 100% !important; }
    .rm-col-pad { padding-bottom: 16px !important; }
    .rm-stack-cell { display: block !important; width: 100% !important; }
  }
  @media (prefers-color-scheme: dark) {
    .rm-bg-paper { background-color: #FAF6EE !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#F3ECDF; width:100%;">
  <span style="display:none; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all; font-family:Arial,sans-serif; color:#F3ECDF;">
    ${preheader}
  </span>

  <center style="width:100%; background-color:#F3ECDF;">
  <div style="max-width:600px; margin:0 auto;" class="rm-container">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; margin:0 auto; width:100%;" class="rm-container">
    <tr>
      <td style="padding:24px 20px 12px 20px; background-color:#F3ECDF;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif; font-size:17px; font-weight:700; color:#1C1917; vertical-align:middle;">
              <span style="color:#C2410C; font-size:18px;">&#9679;</span>&nbsp;Rummage
            </td>
            <td align="right" style="font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#78716C; vertical-align:middle;">
              ${dateStr}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:8px 20px 24px 20px; background-color:#F3ECDF;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFFFFF; border:1px solid #E5DDCE; border-radius:20px;">
          <tr>
            <td style="padding:28px 24px;">
              <div style="font-family:Georgia,'Newsreader',serif; font-size:26px; line-height:1.25; color:#1C1917; font-weight:700;">
                Good morning. Here's what's nearby today.
              </div>
              <div style="font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.5; color:#57534E; padding-top:8px;">
                ${listings.length} sale${listings.length===1?'':'s'} near ${digestEscapeHtml(zip)}, closest first.
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
                <tr>
                  <td bgcolor="#C2410C" style="border-radius:14px;">
                    <a href="${PUBLIC_BASE_URL}/app" style="display:block; padding:12px 22px; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:700; color:#FFFFFF; border-radius:14px; white-space:nowrap;">Open the app</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0 24px 12px 24px; background-color:#F3ECDF;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-family:'Spline Sans Mono','Courier New',monospace; font-size:11px; letter-spacing:0.06em; color:#78716C; text-transform:uppercase;">
              Nearest to furthest
            </td>
          </tr>
        </table>
      </td>
    </tr>
${rows.join('')}
${moreSection}

    <tr>
      <td style="padding:8px 24px 32px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#78716C; line-height:1.7; padding-top:8px;">
              <span style="color:#C2410C;">&#9679;</span>&nbsp;Rummage &middot; Find the good stuff nearby.<br>
              You're getting this because you opted into the daily digest.<br>
              <a href="${prefsUrl}" style="color:#0F766E;">Manage email preferences</a>
              &nbsp;&middot;&nbsp;
              <a href="${unsubUrl}" style="color:#0F766E;">Unsubscribe</a><br>
              <span style="color:#A8A29E;">Rummage &middot; 12313 Orange Dr, Whittier, CA 90601</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  </div>
  </center>
</body>
</html>`;
}

async function sendDigestToSubscriber(sub) {
  try {
    const all = await getListingsForZip(sub.zip, sub.radiusMi);
    const activeTypes = Object.keys(sub.saleTypes || {}).filter(k => sub.saleTypes[k]);
    const todays = all
      .filter(l => saleTouchesToday(l.dateLabel) && (activeTypes.length === 0 || activeTypes.includes(l.type)))
      .sort((a, b) => (a.distanceMi ?? 999) - (b.distanceMi ?? 999));
    if (!todays.length) { console.log(`  Digest: no sales today for ${sub.email}, skipping send`); return; }

    await sendResendEmail({
      to: sub.email,
      subject: `${todays.length} sale${todays.length===1?'':'s'} near ${sub.zip} today`,
      html: buildDigestHtml(todays, { zip: sub.zip, email: sub.email }),
      text: todays.map(l => `${l.title} — ${[l.dateLabel,l.timeLabel,l.address||l.neighborhood].filter(Boolean).join(' · ')}`).join('\n'),
    });
    console.log(`  Digest sent to ${sub.email} (${todays.length} sales)`);
  } catch (err) {
    console.error(`  Digest failed for ${sub.email}:`, err.message);
  }
}

const DIGEST_SEND_HOUR = 8; // local server time
async function runDailyDigestIfDue() {
  const now = new Date();
  if (now.getHours() !== DIGEST_SEND_HOUR) return;

  const todayStr = now.toISOString().slice(0, 10);
  const subscribers = await loadSubscribers();
  const due = subscribers.filter(s => s.active && s.lastSentDate !== todayStr);
  if (!due.length) return;

  console.log(`\n📬 Running daily digest for ${due.length} subscriber(s)...`);
  for (const sub of due) {
    await sendDigestToSubscriber(sub);
    sub.lastSentDate = todayStr;
  }
  await saveSubscribers(subscribers);
}
setInterval(runDailyDigestIfDue, 30 * 60 * 1000); // check twice an hour

// POST /api/send-digest-now  { email }  — manual trigger for testing, bypasses the hour/lastSentDate gate
app.post('/api/send-digest-now', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const subscribers = await loadSubscribers();
  const sub = subscribers.find(s => s.email === email);
  if (!sub) return res.status(404).json({ error: 'Not subscribed' });
  await sendDigestToSubscriber(sub);
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
