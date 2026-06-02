/**
 * Basis-Scraper
 * Verwaltet: Rate-Limiting, robots.txt-Check, HTTP-Client, Retry-Logik.
 * LEGAL: Nur öffentlich zugängliche Daten, robots.txt wird respektiert.
 */

const axios   = require('axios');
const https   = require('https');
const robotsParser = require('robots-parser');

// SSL-Bypass nur wenn lokal nötig (Windows corporate proxy)
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const RATE_LIMITS = {
  avito:    2500,   // ms zwischen Requests
  opensooq: 3000,
  jumia:    2000,
  instagram:4000,
  default:  3000,
};

// Sammlung gecachter robots.txt Instanzen
const robotsCache = {};

class BaseScraper {
  constructor(name, baseUrl) {
    this.name    = name;
    this.baseUrl = baseUrl;
    this.delay   = RATE_LIMITS[name] || RATE_LIMITS.default;
    this._lastRequest = 0;

    this.client = axios.create({
      timeout: 20000,
      httpsAgent,
      headers: {
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,ar;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control':   'no-cache',
        'Connection':      'keep-alive',
        // Normaler Browser-UA
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      // Redirects folgen
      maxRedirects: 5,
    });
  }

  /** Prüft robots.txt – gibt false zurück wenn das Crawlen verboten ist */
  async isAllowed(url) {
    try {
      const origin = new URL(url).origin;
      if (!robotsCache[origin]) {
        const res = await this.client.get(`${origin}/robots.txt`, { timeout: 8000 }).catch(() => ({ data: '' }));
        robotsCache[origin] = robotsParser(`${origin}/robots.txt`, res.data);
      }
      const allowed = robotsCache[origin].isAllowed(url, 'Googlebot');
      if (allowed === false) {
        console.warn(`  ⚠️  robots.txt verbietet: ${url}`);
        return false;
      }
      return true;
    } catch {
      return true; // Im Zweifel erlauben (kein robots.txt = kein Verbot)
    }
  }

  /** Rate-limitierter HTTP-GET */
  async get(url, options = {}) {
    // Rate Limiting
    const now  = Date.now();
    const wait = this.delay - (now - this._lastRequest);
    if (wait > 0) await this._sleep(wait);
    this._lastRequest = Date.now();

    // robots.txt prüfen
    if (!(await this.isAllowed(url))) {
      throw new Error(`robots.txt verbietet: ${url}`);
    }

    // Bis zu 3 Versuche
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await this.client.get(url, options);
        return res;
      } catch (err) {
        if (attempt === 3) throw err;
        const backoff = attempt * 2000;
        console.warn(`  ↩️  Retry ${attempt}/3 nach ${backoff}ms für ${url}`);
        await this._sleep(backoff);
      }
    }
  }

  /** Abstrakte Methode – muss von Sub-Scrapern implementiert werden */
  async scrapeListings(options = {}) {
    throw new Error(`${this.name}.scrapeListings() nicht implementiert`);
  }

  /** Abstrakte Methode – Händlerprofil laden */
  async scrapeProfile(profileUrl) {
    throw new Error(`${this.name}.scrapeProfile() nicht implementiert`);
  }

  _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  /** Gibt Info-Prefix aus */
  log(msg)  { console.log(`  [${this.name.toUpperCase()}] ${msg}`); }
  warn(msg) { console.warn(`  [${this.name.toUpperCase()}] ⚠️  ${msg}`); }
}

module.exports = BaseScraper;

