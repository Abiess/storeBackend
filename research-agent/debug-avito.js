/**
 * Debug-Skript: Avito Live-Analyse
 * Untersucht die echte JSON-Struktur und Seller-Profil-URLs.
 * Ausführen: node debug-avito.js
 */
'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // SSL-Bypass für lokale Analyse

const axios   = require('axios');
const cheerio = require('cheerio');
const fs      = require('fs');

const HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9,ar;q=0.8',
  'Accept':          'text/html,application/xhtml+xml',
};

function safeStr(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function showType(val, depth = 0) {
  if (val === null)             return 'null';
  if (Array.isArray(val))       return `Array[${val.length}]`;
  if (typeof val === 'object')  return `Object{${Object.keys(val).slice(0,5).join(',')}}`;
  if (typeof val === 'string' && val.length > 60) return `"${val.slice(0,60)}..."`;
  return JSON.stringify(val);
}

function walkKeys(obj, prefix = '', depth = 0, maxDepth = 4) {
  if (!obj || typeof obj !== 'object' || depth > maxDepth) return;
  for (const [k, v] of Object.entries(obj)) {
    const line = '  '.repeat(depth) + `${prefix}${k}: ${showType(v)}`;
    console.log(line);
    if (depth < maxDepth && v && typeof v === 'object' && !Array.isArray(v)) {
      walkKeys(v, '', depth + 1, maxDepth);
    }
    if (Array.isArray(v) && v.length > 0 && depth < maxDepth - 1) {
      console.log('  '.repeat(depth + 1) + `[0]: ${showType(v[0])}`);
      if (v[0] && typeof v[0] === 'object') walkKeys(v[0], '', depth + 2, maxDepth);
    }
  }
}

async function get(url) {
  const res = await axios.get(url, {
    headers: HEADERS,
    timeout: 20000,
    httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
  });
  return res.data;
}

async function main() {
  console.log('═'.repeat(70));
  console.log('  AVITO.MA DEBUG – Live-Analyse');
  console.log('═'.repeat(70));

  // ── 1. Suchergebnis-Seite analysieren ─────────────────────────────────
  const searchUrl = 'https://www.avito.ma/fr/maroc/electronique';
  console.log(`\n📥 Lade Suchergebnis: ${searchUrl}`);
  const html = await get(searchUrl);
  console.log(`   HTML-Größe: ${(html.length / 1024).toFixed(1)} KB`);

  // ── 2. __NEXT_DATA__ extrahieren ──────────────────────────────────────
  const m = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/i);
  if (!m) {
    console.log('❌ Kein __NEXT_DATA__ – Avito rendert ggf. serverseitig anders');

    // HTML-Links analysieren
    const $ = cheerio.load(html);
    const vendeurLinks = [];
    const boutiqueLinks = [];
    $('a[href]').each((_, el) => {
      const h = $(el).attr('href') || '';
      if (h.includes('/vendeur/'))  vendeurLinks.push(h);
      if (h.includes('/boutique/')) boutiqueLinks.push(h);
    });
    console.log(`   /vendeur/ Links:  ${vendeurLinks.length} → Beispiel:`, vendeurLinks[0]);
    console.log(`   /boutique/ Links: ${boutiqueLinks.length} → Beispiel:`, boutiqueLinks[0]);

    fs.writeFileSync('debug-html.html', html, 'utf8');
    console.log('   HTML gespeichert: debug-html.html');
    return;
  }

  console.log('✅ __NEXT_DATA__ gefunden');
  const data = JSON.parse(m[1]);
  fs.writeFileSync('debug-nextdata.json', JSON.stringify(data, null, 2), 'utf8');
  console.log('   Gespeichert: debug-nextdata.json');

  // ── 3. Struktur-Übersicht ─────────────────────────────────────────────
  console.log('\n📋 Top-Level Struktur:');
  walkKeys(data, '', 0, 2);

  // ── 4. Ads-Array finden ───────────────────────────────────────────────
  const pp = data?.props?.pageProps || data?.pageProps || {};
  console.log('\n📋 pageProps Keys:', Object.keys(pp));

  // Alle möglichen Arrays suchen
  function findArrays(obj, path = '', depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 5) return;
    for (const [k, v] of Object.entries(obj)) {
      const p = path ? `${path}.${k}` : k;
      if (Array.isArray(v) && v.length > 0) {
        console.log(`   Array bei "${p}": ${v.length} Einträge, erstes Element keys: ${Object.keys(v[0] || {}).slice(0,8).join(', ')}`);
      } else if (v && typeof v === 'object') {
        findArrays(v, p, depth + 1);
      }
    }
  }
  console.log('\n🔍 Alle Arrays in pageProps:');
  findArrays(pp);

  // ── 5. Erstes Ad analysieren ──────────────────────────────────────────
  // Versuche alle bekannten Pfade
  const adArrayPaths = [
    () => pp.ads,
    () => pp.data?.ads,
    () => pp.listings,
    () => pp.data?.listings,
    () => pp.searchResults?.ads,
    () => pp.results,
    () => pp.data?.results,
  ];

  let ads = [];
  for (const fn of adArrayPaths) {
    try {
      const res = fn();
      if (Array.isArray(res) && res.length > 0) { ads = res; break; }
    } catch {}
  }

  if (ads.length === 0) {
    console.log('\n⚠️  Keine Ads in pageProps gefunden. Suche global...');
    function findAdsGlobal(obj, depth = 0) {
      if (!obj || typeof obj !== 'object' || depth > 6) return null;
      for (const [k, v] of Object.entries(obj)) {
        if (Array.isArray(v) && v.length > 2 && v[0]?.id && (v[0]?.price !== undefined || v[0]?.subject)) return v;
        const r = findAdsGlobal(v, depth + 1);
        if (r) return r;
      }
      return null;
    }
    ads = findAdsGlobal(data) || [];
    console.log(`   Global gefunden: ${ads.length} Einträge`);
  } else {
    console.log(`\n✅ Ads gefunden: ${ads.length}`);
  }

  if (ads.length === 0) {
    console.log('❌ Keine Ad-Daten gefunden – Seite möglicherweise dynamisch geladen');
    return;
  }

  // ── 6. Erstes Ad vollständig ausgeben ────────────────────────────────
  const firstAd = ads[0];
  console.log('\n📦 ERSTES AD – vollständige Struktur:');
  console.log(JSON.stringify(firstAd, null, 2));

  // ── 7. Seller-Info aus erstem Ad ─────────────────────────────────────
  console.log('\n👤 SELLER-INFO Analyse:');
  const sellerKeys = ['user', 'store', 'seller', 'vendor', 'owner', 'shop'];
  for (const k of sellerKeys) {
    if (firstAd[k]) {
      console.log(`   ad.${k}:`, JSON.stringify(firstAd[k], null, 2));
    }
  }

  // ── 8. Seller-Profil-URL ermitteln ────────────────────────────────────
  const seller = firstAd.user || firstAd.store || firstAd.seller || {};
  const sellerId = seller.id || seller.storeId || firstAd.userId || '';
  const sellerUrl = seller.url || seller.profileUrl || (sellerId ? `/fr/vendeur/${sellerId}` : '');
  console.log('\n🔗 Ermittelte Seller-URLs:');
  console.log(`   seller.id: ${sellerId}`);
  console.log(`   seller.url: ${seller.url || '(leer)'}`);
  console.log(`   Abgeleitete URL: https://www.avito.ma${sellerUrl}`);

  // ── 9. Seller-Profil laden ────────────────────────────────────────────
  if (sellerUrl) {
    const profileUrl = `https://www.avito.ma${sellerUrl.startsWith('/') ? '' : '/'}${sellerUrl}`;
    console.log(`\n📥 Lade Seller-Profil: ${profileUrl}`);
    await new Promise(r => setTimeout(r, 2000));

    try {
      const profileHtml = await get(profileUrl);
      fs.writeFileSync('debug-profile.html', profileHtml, 'utf8');
      console.log(`   HTML-Größe: ${(profileHtml.length / 1024).toFixed(1)} KB → debug-profile.html`);

      const pm = profileHtml.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/i);
      if (pm) {
        const profileData = JSON.parse(pm[1]);
        fs.writeFileSync('debug-profile-nextdata.json', JSON.stringify(profileData, null, 2), 'utf8');
        console.log('   Profil-JSON gespeichert: debug-profile-nextdata.json');

        const profilePP = profileData?.props?.pageProps || profileData?.pageProps || {};
        console.log('\n📋 Profil-pageProps Keys:', Object.keys(profilePP));
        console.log('\n🔍 Alle Arrays im Profil:');
        findArrays(profilePP);
      }

      // HTML-Extraktion testen
      const $p = cheerio.load(profileHtml);
      console.log('\n🔍 HTML-Extraktion vom Profil:');
      const selectors = {
        'Name':         ['h1', '[class*="name"]', '[class*="Name"]'],
        'Anzeigenanz.': ['[class*="adCount"]', '[class*="nbAds"]', '[class*="ads-count"]'],
        'Mitglied seit':['[class*="member"]', '[class*="since"]', '[class*="join"]'],
        'Telefon':      ['[class*="phone"]', 'a[href^="tel:"]'],
        'Stadt':        ['[class*="location"]', '[class*="city"]', '[class*="Location"]'],
      };
      for (const [label, sels] of Object.entries(selectors)) {
        for (const sel of sels) {
          const text = $p(sel).first().text().trim().slice(0, 80);
          if (text) { console.log(`   ${label.padEnd(15)}: ${text} (Selektor: ${sel})`); break; }
        }
      }
    } catch (e) {
      console.log(`   Fehler: ${e.message}`);
    }
  }

  console.log('\n✅ Debug abgeschlossen. Prüfe die .json und .html Dateien!');
}

main().catch(e => {
  console.error('❌ Fehler:', e.message);
  process.exit(1);
});


