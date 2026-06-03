#!/usr/bin/env node
/**
 * Avito Diagnostic Tool
 * Testet einen einzelnen Request und analysiert Response-Headers.
 *
 * Nutzung:
 *   node scripts/diagnose-avito.js
 *   node scripts/diagnose-avito.js --url https://www.avito.ma/fr/maroc/electronique
 */

'use strict';

const axios     = require('axios');
const https     = require('https');
const minimist  = require('minimist');
const UserAgent = require('user-agents');

const args = minimist(process.argv.slice(2));
const TARGET_URL = args.url || 'https://www.avito.ma/fr/maroc/vetements_et_accessoires';
const IS_GH      = !!process.env.GITHUB_ACTIONS;

const UA_GEN = new UserAgent({ deviceCategory: 'desktop' });

async function diagnose() {
  console.log('\n' + '═'.repeat(60));
  console.log('  🔬 Avito Diagnostic Tool');
  console.log('═'.repeat(60));
  console.log(`  URL:            ${TARGET_URL}`);
  console.log(`  Zeitpunkt:      ${new Date().toISOString()}`);
  console.log(`  GitHub Actions: ${IS_GH ? '✅ JA (Azure-IP möglicherweise blockiert)' : '❌ NEIN (lokale/VPS-IP)'}`);
  console.log(`  Node.js:        ${process.version}`);

  const ua = UA_GEN.toString();
  console.log(`  User-Agent:     ${ua.slice(0, 80)}...`);
  console.log('─'.repeat(60));

  const client = axios.create({
    timeout: 20000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    maxRedirects: 5,
    validateStatus: () => true,
  });

  // ── Test 1: Mit realistischen Browser-Headern ──────────────────────
  console.log('\n  Test 1: Realistischer Browser-Request');
  await runTest(client, TARGET_URL, {
    'User-Agent':                ua,
    'Accept':                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language':           'fr-FR,fr;q=0.9,ar;q=0.8,en-US;q=0.7',
    'Accept-Encoding':           'gzip, deflate, br',
    'Cache-Control':             'max-age=0',
    'Sec-Fetch-Dest':            'document',
    'Sec-Fetch-Mode':            'navigate',
    'Sec-Fetch-Site':            'none',
    'Sec-Fetch-User':            '?1',
    'Upgrade-Insecure-Requests': '1',
  });

  // ── Test 2: Minimale Headers (wie alter Scraper) ───────────────────
  console.log('\n  Test 2: Minimaler Request (alter Scraper-Stil)');
  await new Promise(r => setTimeout(r, 3000)); // kurze Pause
  await runTest(client, TARGET_URL, {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    'Cache-Control':   'no-cache',
  });

  console.log('\n' + '═'.repeat(60));
  console.log('  📊 FAZIT:');
  if (IS_GH) {
    console.log('  ⚠️  GitHub Actions (Azure) → Avito blockiert diese IPs häufig.');
    console.log('  ✅  Lösung: Avito nur per VPS-Cron scrapen (05:00 UTC).');
    console.log('  ✅  Im GitHub Actions Workflow: --source opensooq,jumia (kein avito)');
  } else {
    console.log('  ✅  Lokale/VPS-IP – Avito sollte erreichbar sein.');
    console.log('  📋  Bei 429: Delays erhöhen oder Zeiten meiden (08:00–22:00 Marokko-Zeit).');
  }
  console.log('═'.repeat(60) + '\n');
}

async function runTest(client, url, headers) {
  const start = Date.now();
  try {
    const res = await client.get(url, { headers });
    const ms  = Date.now() - start;
    const body = String(res.data || '');

    console.log(`  Status: ${getStatusEmoji(res.status)} HTTP ${res.status} | Dauer: ${ms}ms | Body: ${body.length} Zeichen`);

    // Response-Header analysieren
    logHeaders(res.headers, res.status);

    // Body-Analyse
    if (res.status === 200) {
      const hasNextData = body.includes('__NEXT_DATA__');
      const hasCaptcha  = /captcha|challenge|blocked|access.denied/i.test(body);
      const hasListings = body.includes('"ads"') || body.includes('annonces');
      console.log(`  Body-Analyse: __NEXT_DATA__=${hasNextData} | Captcha/Block=${hasCaptcha} | Listings=${hasListings}`);
      if (!hasNextData && !hasCaptcha) {
        console.log(`  Body-Auszug: ${body.slice(0, 200).replace(/\s+/g, ' ')}`);
      }
      if (hasCaptcha) {
        console.error('  ❌ CAPTCHA / BLOCK erkannt im Body!');
      }
    }

    if (res.status === 429) {
      const retryAfter = res.headers['retry-after'];
      console.error(`  ❌ RATE LIMIT (429)!`);
      console.log(`  Retry-After: ${retryAfter || '(kein Header)'}`);
      if (retryAfter) {
        const sec = parseInt(retryAfter, 10);
        if (!isNaN(sec)) console.log(`  → Bitte ${sec} Sekunden warten`);
      }
    }

  } catch (err) {
    const ms = Date.now() - start;
    console.error(`  ❌ FEHLER nach ${ms}ms: ${err.message}`);
    if (err.response) {
      console.log(`  Status: HTTP ${err.response.status}`);
      logHeaders(err.response.headers, err.response.status);
    }
  }
}

function logHeaders(headers, status) {
  const RELEVANT = [
    'retry-after', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset',
    'cf-ray', 'cf-cache-status', 'cf-mitigated',
    'server', 'x-cache', 'via', 'content-type',
    'x-request-id', 'x-powered-by',
  ];
  const found = [];
  for (const h of RELEVANT) {
    const val = headers[h];
    if (val) found.push(`${h}: ${String(val).slice(0, 100)}`);
  }
  if (found.length > 0) {
    console.log('  Headers:');
    for (const h of found) console.log(`    ${h}`);
  }

  // Cloudflare-Erkennung
  if (headers['cf-ray']) {
    console.warn('  🔒 Cloudflare erkannt!');
    if (status === 429 || status === 403) {
      console.warn('  → Cloudflare blockiert diese IP. Datacenter-IP (GH Actions) wahrscheinlich.');
    }
  }
}

function getStatusEmoji(status) {
  if (status === 200) return '✅';
  if (status === 429) return '🚫';
  if (status === 403) return '⛔';
  if (status >= 500) return '💥';
  return '⚠️';
}

diagnose().catch(err => {
  console.error('Diagnostic-Fehler:', err.message);
  process.exit(1);
});

