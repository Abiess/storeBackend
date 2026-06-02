#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   markt.ma – Händler-Finder                                 ║
 * ║   Findet Händler mit hohem Shop-Eröffnungs-Potenzial        ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║   Quellen: Avito.ma | OpenSooq | Jumia | Instagram           ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Neue Parameter:
 *   --min-products N      Nur Händler mit ≥ N Produkten
 *   --seller-type TYPE    business | individual | all (Standard: all)
 *   --max-leads N         Maximal N Händler laden (Standard: 150)
 *   --city CITY           Stadt filtern
 *   --category CAT        Kategorie filtern
 *   --source SOURCE       avito | opensooq | jumia | instagram | all
 *   --pages N             Suchergebnis-Seiten (Standard: 3)
 *   --top N               Top-N in der Ausgabe (Standard: 20)
 *   --min-score N         Mindest-Lead-Score
 *   --min-conversion N    Mindest-Conversion-Score
 *   --debug-scoring       Detaillierte Score-Ausgabe
 *   --demo                Demo-Modus
 *   --output DIR          Ausgabeverzeichnis
 */

'use strict';

const path    = require('path');
const args    = require('minimist')(process.argv.slice(2));

const AvitoScraper     = require('./scrapers/avito-scraper');
const OpensooqScraper  = require('./scrapers/opensooq-scraper');
const JumiaScraper     = require('./scrapers/jumia-scraper');
const InstagramScraper = require('./scrapers/instagram-scraper');
const LeadScorer       = require('./scoring/lead-scorer');
const CsvExporter      = require('./export/csv-exporter');
const generateDemoLeads = require('./models/demo-data');

// ── Konfiguration ─────────────────────────────────────────────────────────────
const CONFIG = {
  source:         (args.source  || 'all').toLowerCase(),
  city:           args.city     || '',
  category:       args.category || '',
  maxPages:       parseInt(args.pages || args['max-pages'] || '3', 10),
  maxLeads:       parseInt(args['max-leads'] || '150', 10),
  handles:        args.handles ? String(args.handles).split(',').map(h => h.trim()) : [],
  minScore:       parseInt(args['min-score']      ?? '0', 10),
  minConversion:  parseInt(args['min-conversion'] ?? '0', 10),
  minProducts:    parseInt(args['min-products']   ?? '0', 10),
  sellerTypeFilter: (args['seller-type'] || 'all').toLowerCase(),
  outputDir:      args.output || path.join(__dirname, 'output'),
  demoMode:       !!args.demo,
  keywords:       args.keywords || '',
  debugScoring:   !!args['debug-scoring'],
  top:            parseInt(args.top || '20', 10),
};

const DEFAULT_CATEGORIES_AVITO    = ['mode', 'electronique', 'maison', 'informatique', 'beaute'];
const DEFAULT_CATEGORIES_OPENSOOQ = ['fashion', 'electronics', 'home'];
const DEFAULT_CATEGORIES_JUMIA    = ['mode', 'electromenager', 'telephonie'];
const DEFAULT_INSTAGRAM_HANDLES   = [
  'boutique_ma', 'shop_maroc', 'mode_maroc', 'casablanca_shop',
  'marrakech_boutique', 'artisanat_maroc',
];

const scorer   = new LeadScorer();
const exporter = new CsvExporter();

// ── Banner ────────────────────────────────────────────────────────────────────
function printBanner() {
  console.log('\n' + '═'.repeat(65));
  console.log('  🏪  markt.ma – Händler-Finder');
  console.log('  🇲🇦  Findet Händler mit Shop-Eröffnungs-Potenzial');
  console.log('═'.repeat(65));
  console.log(`  Quelle:       ${CONFIG.source}`);
  console.log(`  Stadt:        ${CONFIG.city       || '(alle)'}`);
  console.log(`  Kategorie:    ${CONFIG.category   || '(alle)'}`);
  console.log(`  Händlertyp:   ${CONFIG.sellerTypeFilter}`);
  console.log(`  Max Händler:  ${CONFIG.maxLeads}`);
  console.log(`  Min Produkte: ${CONFIG.minProducts || '(kein Filter)'}`);
  console.log(`  Min Conversion-Score: ${CONFIG.minConversion || '(kein Filter)'}`);
  console.log(`  Demo-Modus:   ${CONFIG.demoMode ? 'JA' : 'NEIN'}`);
  console.log('═'.repeat(65) + '\n');
}

// ── Haupt-Logik ───────────────────────────────────────────────────────────────
async function run() {
  printBanner();

  let allLeads = [];

  if (CONFIG.demoMode) {
    console.log('🎭  Demo-Modus: Beispiel-Daten\n');
    allLeads = generateDemoLeads();
  } else {
    const tasks = buildScrapingTasks();
    console.log(`📋  ${tasks.length} Scraping-Aufgabe(n) geplant\n`);

    for (const task of tasks) {
      try {
        console.log(`\n🔍  Starte: ${task.name}`);
        const leads = await task.run();
        console.log(`  ✅  ${leads.length} Händler gefunden`);
        allLeads.push(...leads);
      } catch (err) {
        console.error(`  ❌  Fehler: ${task.name}: ${err.message}`);
      }
    }
  }

  if (allLeads.length === 0) {
    console.log('\n⚠️  Keine Händler gefunden. Versuche --demo\n');
    process.exit(0);
  }

  // ── Scoring ───────────────────────────────────────────────────────────────
  console.log(`\n⚡  Bewerte ${allLeads.length} Händler...`);
  for (const lead of allLeads) scorer.score(lead);

  // ── Filtern ───────────────────────────────────────────────────────────────
  let filtered = allLeads;

  if (CONFIG.minProducts > 0) {
    filtered = filtered.filter(l => l.productCount >= CONFIG.minProducts);
    console.log(`  📦  Min. ${CONFIG.minProducts} Produkte: ${filtered.length} übrig`);
  }

  if (CONFIG.sellerTypeFilter !== 'all') {
    filtered = filtered.filter(l => l.sellerType === CONFIG.sellerTypeFilter);
    console.log(`  🏪  Händlertyp "${CONFIG.sellerTypeFilter}": ${filtered.length} übrig`);
  }

  if (CONFIG.minScore > 0) {
    filtered = filtered.filter(l => l.totalScore >= CONFIG.minScore);
    console.log(`  🎯  Min. Lead-Score ${CONFIG.minScore}: ${filtered.length} übrig`);
  }

  if (CONFIG.minConversion > 0) {
    filtered = filtered.filter(l => l.conversionScore >= CONFIG.minConversion);
    console.log(`  🎯  Min. Conversion-Score ${CONFIG.minConversion}: ${filtered.length} übrig`);
  }

  // ── Score-Verteilung ──────────────────────────────────────────────────────
  printScoreDistribution(filtered);

  // ── Händler-Analyse ───────────────────────────────────────────────────────
  printHaendlerAnalyse(filtered);

  // ── Debug ─────────────────────────────────────────────────────────────────
  if (CONFIG.debugScoring) printDebugSample(filtered);

  // ── Sortieren nach Conversion-Score ──────────────────────────────────────
  filtered.sort((a, b) => b.conversionScore - a.conversionScore || b.totalScore - a.totalScore);

  // ── Zusammenfassung ───────────────────────────────────────────────────────
  exporter.printSummary(filtered, CONFIG.top);

  // ── CSV Export ────────────────────────────────────────────────────────────
  console.log(`💾  Exportiere CSV nach: ${CONFIG.outputDir}`);
  const csvPath = exporter.export(filtered, CONFIG.outputDir);
  console.log(`✅  CSV: ${csvPath}`);
  console.log(`    ${filtered.length} Händler exportiert\n`);
}

// ── Händler-Analyse ───────────────────────────────────────────────────────────
function printHaendlerAnalyse(leads) {
  if (!leads.length) return;

  console.log('─'.repeat(65));
  console.log('  🏆  HÄNDLER-ANALYSE');
  console.log('─'.repeat(65));

  // Top 5 nach Produktanzahl
  const byProducts = [...leads].sort((a, b) => b.productCount - a.productCount).slice(0, 5);
  console.log('\n  📦  Top 5 nach Produktanzahl:');
  byProducts.forEach((l, i) => {
    console.log(`    ${i+1}. ${l.businessName || '(kein Name)'} – ${l.productCount} Produkte – ${l.city || ''}`);
  });

  // Top 5 nach Aktivität
  const byActivity = [...leads]
    .filter(l => l.lastActivity)
    .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
    .slice(0, 5);
  console.log('\n  ⚡  Top 5 nach letzter Aktivität:');
  byActivity.forEach((l, i) => {
    const date = l.lastActivity ? new Date(l.lastActivity).toLocaleDateString('de-DE') : '-';
    console.log(`    ${i+1}. ${l.businessName || '(kein Name)'} – ${date} – ${l.city || ''}`);
  });

  // Top 5 ohne Website (höchstes Shop-Potenzial)
  const noWebsite = [...leads]
    .filter(l => !l.hasOwnWebsite)
    .sort((a, b) => b.conversionScore - a.conversionScore)
    .slice(0, 5);
  console.log('\n  🎯  Top 5 ohne eigene Website (bestes Potenzial):');
  noWebsite.forEach((l, i) => {
    console.log(`    ${i+1}. ${l.conversionEmoji} ${l.businessName || '(kein Name)'} – ${l.productCount} Produkte – ${l.outreachChannel}`);
  });

  // Städte-Verteilung
  const cities = {};
  for (const l of leads) if (l.city) cities[l.city] = (cities[l.city] || 0) + 1;
  const topCities = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log('\n  🗺️  Top Städte:');
  topCities.forEach(([city, count]) => console.log(`    ${city}: ${count} Händler`));

  // Kontakt-Verfügbarkeit
  const mitTel  = leads.filter(l => l.phone || l.whatsapp).length;
  const mitIG   = leads.filter(l => l.hasInstagram).length;
  const ohneWeb = leads.filter(l => !l.hasOwnWebsite).length;
  console.log('\n  📬  Kontakt-Verfügbarkeit:');
  console.log(`    Telefon/WhatsApp: ${mitTel}/${leads.length} (${Math.round(mitTel/leads.length*100)}%)`);
  console.log(`    Instagram:        ${mitIG}/${leads.length} (${Math.round(mitIG/leads.length*100)}%)`);
  console.log(`    Ohne Website:     ${ohneWeb}/${leads.length} (${Math.round(ohneWeb/leads.length*100)}%)`);
  console.log('─'.repeat(65));
}

// ── Score-Verteilung ──────────────────────────────────────────────────────────
function printScoreDistribution(leads) {
  if (!leads.length) return;
  const scores = leads.map(l => l.conversionScore).sort((a, b) => a - b);
  const avg    = (scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1);

  const buckets = { '0–24': 0, '25–49': 0, '50–74': 0, '75–100': 0 };
  for (const s of scores) {
    if (s < 25)       buckets['0–24']++;
    else if (s < 50)  buckets['25–49']++;
    else if (s < 75)  buckets['50–74']++;
    else              buckets['75–100']++;
  }

  console.log('\n' + '─'.repeat(65));
  console.log('  📈  CONVERSION-SCORE VERTEILUNG');
  console.log(`  Min: ${scores[0]}  │  Max: ${scores[scores.length-1]}  │  Ø: ${avg}`);
  for (const [range, cnt] of Object.entries(buckets)) {
    const bar = '█'.repeat(Math.round(cnt / leads.length * 25));
    console.log(`  ${range.padEnd(7)} │ ${bar.padEnd(25)} ${cnt}`);
  }
  console.log('─'.repeat(65));
}

// ── Debug-Sample ──────────────────────────────────────────────────────────────
function printDebugSample(leads) {
  const sample = [...leads].sort((a, b) => b.conversionScore - a.conversionScore).slice(0, 3);
  console.log('  🔬  DEBUG – Top 3 im Detail:');
  for (const l of sample) {
    console.log(`\n  ┌─ ${l.conversionEmoji} [Conversion: ${l.conversionScore}] [Lead: ${l.totalScore}] ${l.businessName || '(kein Name)'}`);
    console.log(`  │  Typ: ${l.sellerType} | Stadt: ${l.city} | Produkte: ${l.productCount}`);
    console.log(`  │  Telefon: ${l.phone || '-'} | WhatsApp: ${l.whatsapp || '-'}`);
    console.log(`  │  Website: ${l.hasOwnWebsite} | Instagram: ${l.hasInstagram} | Facebook: ${l.hasFacebook}`);
    console.log(`  │  Conversion: ${l.conversionReason}`);
    console.log(`  │  Outreach: ${l.outreachChannel}`);
    console.log(`  └─ ${l.profileUrl}`);
  }
}

// ── Scraping-Tasks ────────────────────────────────────────────────────────────
function buildScrapingTasks() {
  const tasks = [];
  const src   = CONFIG.source;

  const opts = {
    city:     CONFIG.city,
    maxPages: CONFIG.maxPages,
    keywords: CONFIG.keywords,
    maxLeads: CONFIG.maxLeads,
  };

  if (src === 'all' || src === 'avito') {
    const avito = new AvitoScraper();
    avito.maxSellers = CONFIG.maxLeads;
    const cats = CONFIG.category ? [CONFIG.category] : DEFAULT_CATEGORIES_AVITO;
    for (const cat of cats) {
      tasks.push({ name: `Avito – ${cat}`, run: () => avito.scrapeListings({ ...opts, category: cat }) });
    }
  }

  if (src === 'all' || src === 'opensooq') {
    const opensooq = new OpensooqScraper();
    const cats = CONFIG.category ? [CONFIG.category] : DEFAULT_CATEGORIES_OPENSOOQ;
    for (const cat of cats) {
      tasks.push({ name: `OpenSooq – ${cat}`, run: () => opensooq.scrapeListings({ ...opts, category: cat }) });
    }
  }

  if (src === 'all' || src === 'jumia') {
    const jumia = new JumiaScraper();
    const cats = CONFIG.category ? [CONFIG.category] : DEFAULT_CATEGORIES_JUMIA;
    for (const cat of cats) {
      tasks.push({ name: `Jumia – ${cat}`, run: () => jumia.scrapeListings({ ...opts, category: cat }) });
    }
  }

  if (src === 'all' || src === 'instagram') {
    const ig = new InstagramScraper();
    const handles = CONFIG.handles.length ? CONFIG.handles : DEFAULT_INSTAGRAM_HANDLES;
    tasks.push({ name: `Instagram – ${handles.length} Handles`, run: () => ig.scrapeListings({ handles }) });
  }

  return tasks;
}

// ── Start ──────────────────────────────────────────────────────────────────────
run().catch(err => {
  console.error('\n💥  Kritischer Fehler:', err.message);
  process.exit(1);
});
