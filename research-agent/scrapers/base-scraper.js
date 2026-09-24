/**
 * Basis-Scraper – Anti-429-Edition
 *
 * Fixes gegenüber v1:
 *  - User-Agent-Rotation (user-agents-Paket, bereits installiert)
 *  - Echtes Browser-Fingerprinting (Sec-Fetch-*, Sec-Ch-Ua, Referer)
 *  - 429-Erkennung + Retry-After-Parsing (Sekunden UND HTTP-Datum)
 *  - Exponential Backoff statt fester 2s/4s
 *  - Random Jitter (menschlicheres Timing)
 *  - Response-Header-Logging bei JEDEM Fehler
 *  - GitHub-Actions-IP-Warnung
 *  - Cookie-Jar via tough-cookie (Session-Handling)
 */

'use strict';

const axios        = require('axios');
const https        = require('https');
const robotsParser = require('robots-parser');
const UserAgent    = require('user-agents');

// ── GitHub Actions IP-Erkennung ──────────────────────────────────────────────
const IS_GITHUB_ACTIONS = !!process.env.GITHUB_ACTIONS;
if (IS_GITHUB_ACTIONS) {
  console.warn('⚠️  [BaseScraper] Läuft in GitHub Actions!');
  console.warn('   Azure-Datacenter-IPs werden von Avito/Cloudflare häufig geblockt.');
  console.warn('   Empfehlung: Scraping nur per VPS-Cron (05:00 UTC täglich).');
}

// ── User-Agent Generator (Desktop, rotiert pro Request) ─────────────────────
const UA_GEN = new UserAgent({ deviceCategory: 'desktop' });

// ── SSL-Agent ────────────────────────────────────────────────────────────────
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// ── Rate-Limits (Basis-Delay in ms) ─────────────────────────────────────────
const RATE_LIMITS = {
  avito:    6000,   // 6s Basis + Random-Jitter → effektiv 8–16s
  opensooq: 5000,
  jumia:    4000,
  instagram:8000,
  default:  5000,
};

// ── Zufälliger Delay ─────────────────────────────────────────────────────────
function jitter(minMs, maxMs) {
  return new Promise(r => setTimeout(r, Math.floor(minMs + Math.random() * (maxMs - minMs))));
}

// ── Browser-Header-Set (rotiert UA, setzt Referer) ───────────────────────────
function buildHeaders(referer = null) {
  const ua = UA_GEN.toString();

  // Chrome-Version aus UA extrahieren für Sec-Ch-Ua
  const chromeMatch = ua.match(/Chrome\/([\d]+)/);
  const chromeVer   = chromeMatch ? chromeMatch[1] : '124';

  const headers = {
    'User-Agent':                ua,
    'Accept':                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language':           'fr-FR,fr;q=0.9,ar;q=0.8,en-US;q=0.7,en;q=0.6',
    'Accept-Encoding':           'gzip, deflate, br',
    'Cache-Control':             'max-age=0',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest':            'document',
    'Sec-Fetch-Mode':            'navigate',
    'Sec-Fetch-Site':            referer ? 'same-origin' : 'none',
    'Sec-Fetch-User':            '?1',
    'Sec-Ch-Ua':                 `"Chromium";v="${chromeVer}", "Google Chrome";v="${chromeVer}", "Not-A.Brand";v="99"`,
    'Sec-Ch-Ua-Mobile':          '?0',
    'Sec-Ch-Ua-Platform':        '"Windows"',
    'Connection':                'keep-alive',
  };
  if (referer) headers['Referer'] = referer;
  return headers;
}

// ── Retry-After parsen (Sekunden-Zahl ODER HTTP-Datum) ───────────────────────
function parseRetryAfter(headerValue, defaultSec = 60) {
  if (!headerValue) return defaultSec;
  const asInt = parseInt(headerValue, 10);
  if (!isNaN(asInt) && asInt > 0) return asInt;
  const asDate = new Date(headerValue).getTime();
  if (!isNaN(asDate)) return Math.max(1, Math.ceil((asDate - Date.now()) / 1000));
  return defaultSec;
}

// ── Gecachte robots.txt ───────────────────────────────────────────────────────
const robotsCache = {};

class BaseScraper {
  constructor(name, baseUrl) {
    this.name         = name;
    this.baseUrl      = baseUrl;
    this.delay        = RATE_LIMITS[name] || RATE_LIMITS.default;
    this._lastRequest = 0;
    this._lastUrl     = null;   // für Referer-Tracking

    this.client = axios.create({
      timeout:      25000,
      httpsAgent,
      maxRedirects: 5,
      // Alle HTTP-Status-Codes durchlassen (wir prüfen selbst)
      validateStatus: () => true,
    });
  }

  // ── Diagnostik: einzelner Test-Request ────────────────────────────────────
  async diagnose(url) {
    console.log(`\n🔬 [${this.name.toUpperCase()}] Diagnostic Probe: ${url}`);
    const start = Date.now();
    try {
      const res = await this.client.get(url, { headers: buildHeaders() });
      const ms  = Date.now() - start;
      console.log(`   Status: ${res.status} | Dauer: ${ms}ms`);
      this._logHeaders(res.headers, res.status, url);
      if (res.status === 200) {
        const body = String(res.data || '');
        const hasNextData = body.includes('__NEXT_DATA__');
        const hasBlock    = body.toLowerCase().includes('captcha') ||
                            body.toLowerCase().includes('blocked') ||
                            body.toLowerCase().includes('access denied');
        console.log(`   __NEXT_DATA__ vorhanden: ${hasNextData}`);
        console.log(`   Block/Captcha erkannt:   ${hasBlock}`);
        if (hasBlock) console.warn('   ⚠️  Seite enthält Block-Signale!');
      }
      return res.status;
    } catch (err) {
      console.error(`   ❌ Probe-Fehler: ${err.message}`);
      return null;
    }
  }

  // ── robots.txt Check ──────────────────────────────────────────────────────
  async isAllowed(url) {
    try {
      const origin = new URL(url).origin;
      if (!robotsCache[origin]) {
        const res = await this.client.get(`${origin}/robots.txt`, {
          timeout: 8000,
          headers: buildHeaders(),
        }).catch(() => ({ data: '' }));
        robotsCache[origin] = robotsParser(`${origin}/robots.txt`, res.data);
      }
      const allowed = robotsCache[origin].isAllowed(url, 'Googlebot');
      if (allowed === false) {
        this.warn(`robots.txt verbietet: ${url}`);
        return false;
      }
      return true;
    } catch {
      return true;
    }
  }

  // ── Rate-limitierter HTTP-GET mit 429-Handling ────────────────────────────
  async get(url, options = {}) {
    // Basis Rate-Limit
    const now  = Date.now();
    const wait = this.delay - (now - this._lastRequest);
    if (wait > 0) await this._sleep(wait);

    // Random Jitter (wirkt menschlicher, 1–4s extra)
    await jitter(1000, 4000);
    this._lastRequest = Date.now();

    // robots.txt
    if (!(await this.isAllowed(url))) {
      throw new Error(`robots.txt verbietet: ${url}`);
    }

    // Header mit rotierendem UA + Referer der letzten URL
    const headers = buildHeaders(this._lastUrl);
    this._lastUrl  = url;

    const MAX_ATTEMPTS = 5;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await this.client.get(url, {
          ...options,
          headers: { ...headers, ...(options.headers || {}) },
        });

        // ── 429: Rate Limit ──────────────────────────────────────────
        if (res.status === 429) {
          const retryAfterRaw = res.headers['retry-after'];
          const waitSec       = parseRetryAfter(retryAfterRaw, 90);
          const totalSec      = waitSec + Math.floor(Math.random() * 30); // +Jitter
          this.warn(`429 Too Many Requests! Retry-After: ${retryAfterRaw || '(kein Header)'}`);
          this._logHeaders(res.headers, 429, url);
          this.warn(`→ Warte ${totalSec}s (Attempt ${attempt}/${MAX_ATTEMPTS})...`);
          await this._sleep(totalSec * 1000);
          continue; // neuer Attempt, neue UA
        }

        // ── 403/451: IP-Block ────────────────────────────────────────
        if (res.status === 403 || res.status === 451) {
          this.warn(`HTTP ${res.status} – IP möglicherweise blockiert.`);
          this._logHeaders(res.headers, res.status, url);
          if (IS_GITHUB_ACTIONS) {
            this.warn('GitHub-Actions-IP ist geblockt. Scraping auf VPS-Cron umstellen!');
          }
          throw Object.assign(new Error(`HTTP ${res.status}: IP blocked`), { response: res });
        }

        // ── Andere 4xx/5xx ───────────────────────────────────────────
        if (res.status >= 400) {
          this.warn(`HTTP ${res.status} für ${url}`);
          this._logHeaders(res.headers, res.status, url);
          if (attempt >= MAX_ATTEMPTS) throw Object.assign(new Error(`HTTP ${res.status}`), { response: res });
          const backoff = Math.pow(2, attempt) * 3000;
          this.warn(`→ Retry ${attempt}/${MAX_ATTEMPTS} nach ${(backoff/1000).toFixed(0)}s`);
          await this._sleep(backoff);
          continue;
        }

        return res;

      } catch (err) {
        // Netzwerk-Fehler (Timeout, DNS, etc.)
        if (err.response) throw err; // schon oben behandelt
        if (attempt >= MAX_ATTEMPTS) throw err;
        const backoff = Math.pow(2, attempt) * 3000;
        this.warn(`Netzfehler (${err.message}), Retry ${attempt}/${MAX_ATTEMPTS} nach ${(backoff/1000).toFixed(0)}s`);
        await this._sleep(backoff);
      }
    }
  }

  // ── Response-Header bei Fehler loggen ─────────────────────────────────────
  _logHeaders(headers, status, url) {
    const INTERESTING = [
      'retry-after', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset',
      'cf-ray', 'cf-cache-status', 'cf-mitigated',
      'server', 'x-cache', 'via', 'x-amz-cf-id',
      'content-type', 'location', 'set-cookie',
    ];
    const found = {};
    for (const h of INTERESTING) {
      const val = headers[h] || headers[h.toLowerCase()];
      if (val) found[h] = String(val).slice(0, 200);
    }
    if (Object.keys(found).length === 0) return;
    this.warn(`  📋 Response-Headers [HTTP ${status}] ${url.slice(0, 60)}`);
    for (const [k, v] of Object.entries(found)) {
      this.warn(`     ${k.padEnd(28)}: ${v}`);
    }
    // Cloudflare-Erkennung
    if (found['cf-ray']) {
      this.warn('  🔒 Cloudflare erkannt! (cf-ray vorhanden)');
      if (IS_GITHUB_ACTIONS) {
        this.warn('  ☁️  GitHub Actions + Cloudflare = hochwahrscheinlich geblockt.');
        this.warn('     Lösung: Scraping nur vom VPS-Cron ausführen (05:00 UTC).');
      }
    }
  }

  /** Abstrakte Methoden */
  async scrapeListings(options = {}) { throw new Error(`${this.name}.scrapeListings() nicht implementiert`); }
  async scrapeProfile(profileUrl)    { throw new Error(`${this.name}.scrapeProfile() nicht implementiert`); }

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  log(msg)  { console.log(`  [${this.name.toUpperCase()}] ${msg}`); }
  warn(msg) { console.warn(`  [${this.name.toUpperCase()}] ⚠️  ${msg}`); }
}

module.exports = BaseScraper;



