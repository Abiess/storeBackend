#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   markt.ma – Marketplace Research Agent                     ║
 * ║   Legaler Lead-Generator für Marokko                        ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║   Quellen:  Avito.ma | OpenSooq.ma | Jumia.ma | Instagram   ║
 * ║   Output:   CSV mit Lead-Score (0–100)                       ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   node main.js                          → Alle Quellen, Standardkonfiguration
 *   node main.js --source avito           → Nur Avito
 *   node main.js --source opensooq        → Nur OpenSooq
 *   node main.js --source jumia           → Nur Jumia
 *   node main.js --source instagram       → Nur Instagram
 *   node main.js --demo                   → Demo-Modus (keine echten Requests)
 *   node main.js --city casablanca        → Filtert auf Stadt
 *   node main.js --category mode          → Filtert auf Kategorie
 *   node main.js --pages 5               → Max. Seiten pro Quelle
 *   node main.js --handles @shop1,@shop2  → Instagram-Handles (kommagetrennt)
 *   node main.js --min-score 60           → Nur Leads ab Score 60
 *   node main.js --output ./meine-leads   → Ausgabeverzeichnis
 */

'use strict';

const path    = require('path');
const args    = require('minimist')(process.argv.slice(2));

const AvitoScraper    = require('./scrapers/avito-scraper');
const OpensooqScraper = require('./scrapers/opensooq-scraper');
const JumiaScraper    = require('./scrapers/jumia-scraper');
const InstagramScraper = require('./scrapers/instagram-scraper');
const LeadScorer      = require('./scoring/lead-scorer');
const CsvExporter     = require('./export/csv-exporter');
const generateDemoLeads = require('./models/demo-data');

// ── Konfiguration aus CLI-Args ────────────────────────────────────────────────
const CONFIG = {
  source:      (args.source  || 'all').toLowerCase(),
  city:        args.city     || '',
  category:    args.category || '',
  maxPages:    parseInt(args.pages || args['max-pages'] || '3', 10),
  handles:     args.handles  ? String(args.handles).split(',').map(h => h.trim()) : [],
  minScore:    parseInt(args['min-score'] ?? '0', 10),   // Default 0 = alle
  outputDir:   args.output   || path.join(__dirname, 'output'),
  demoMode:    !!args.demo,
  keywords:    args.keywords || '',
  debugScoring: !!args['debug-scoring'],
  top:         parseInt(args.top || '20', 10),
};

// ── Standard-Suchkonfigurationen für Marokko ──────────────────────────────────
const DEFAULT_CATEGORIES_AVITO    = ['mode', 'electronique', 'maison', 'informatique', 'beaute'];
const DEFAULT_CATEGORIES_OPENSOOQ = ['fashion', 'electronics', 'home'];
const DEFAULT_CATEGORIES_JUMIA    = ['mode', 'electromenager', 'telephonie'];
const DEFAULT_INSTAGRAM_HANDLES   = [
  // Bekannte marokkanische Business-Instagram-Accounts als Startpunkte
  // Diese sind öffentlich und repräsentieren typische potenzielle Kunden
  'boutique_ma', 'shop_maroc', 'mode_maroc', 'casablanca_shop',
  'marrakech_boutique', 'artisanat_maroc',
];

const scorer   = new LeadScorer();
const exporter = new CsvExporter();

// ── Banner ────────────────────────────────────────────────────────────────────
function printBanner() {
  console.log('\n' + '═'.repeat(62));
  console.log('  🏪  markt.ma – Marketplace Research Agent');
  console.log('  🇲🇦  Lead-Generator für Marokko | Nur öffentliche Daten');
  console.log('═'.repeat(62));
  console.log(`  Quelle:    ${CONFIG.source}`);
  console.log(`  Stadt:     ${CONFIG.city   || '(alle)'}`);
  console.log(`  Kategorie: ${CONFIG.category || '(alle)'}`);
  console.log(`  Max Seiten: ${CONFIG.maxPages}`);
  console.log(`  Min. Score: ${CONFIG.minScore}`);
  console.log(`  Demo-Modus: ${CONFIG.demoMode ? 'JA' : 'NEIN'}`);
  console.log(`  Debug:      ${CONFIG.debugScoring ? 'JA' : 'NEIN'}`);
  console.log('═'.repeat(62) + '\n');
}

// ── Haupt-Logik ───────────────────────────────────────────────────────────────
async function run() {
  printBanner();

  let allLeads = [];

  // ── DEMO-MODUS ────────────────────────────────────────────────────────
  if (CONFIG.demoMode) {
    console.log('🎭  Demo-Modus: Verwende Beispiel-Daten (keine HTTP-Requests)\n');
    allLeads = generateDemoLeads();

  } else {
    // ── LIVE-SCRAPING ──────────────────────────────────────────────────
    const tasks = buildScrapingTasks();
    console.log(`📋  ${tasks.length} Scraping-Aufgabe(n) geplant\n`);

    for (const task of tasks) {
      try {
        console.log(`\n🔍  Starte: ${task.name}`);
        const leads = await task.run();
        console.log(`  ✅  ${leads.length} Lead(s) gesammelt`);
        allLeads.push(...leads);
      } catch (err) {
        console.error(`  ❌  Fehler bei ${task.name}: ${err.message}`);
      }
    }
  }

  if (allLeads.length === 0) {
    console.log('\n⚠️  Keine Leads gefunden. Versuche --demo für Beispieldaten.\n');
    process.exit(0);
  }

  // ── SCORING ──────────────────────────────────────────────────────────
  console.log(`\n⚡  Bewerte ${allLeads.length} Lead(s)...`);
  for (const lead of allLeads) {
    scorer.score(lead);
  }

  // ── SCORE-VERTEILUNG (immer anzeigen) ────────────────────────────────
  printScoreDistribution(allLeads);

  // ── DEBUG: erste 3 Leads im Detail ───────────────────────────────────
  if (CONFIG.debugScoring) {
    printDebugSample(allLeads);
  }

  // ── FILTERN ──────────────────────────────────────────────────────────
  let filteredLeads = allLeads;
  if (CONFIG.minScore > 0) {
    filteredLeads = allLeads.filter(l => l.totalScore >= CONFIG.minScore);
    console.log(`  🎯  Gefiltert auf Score ≥ ${CONFIG.minScore}: ${filteredLeads.length} Lead(s)`);
  }

  // ── SORTIEREN (absteigend nach Score) ────────────────────────────────
  filteredLeads.sort((a, b) => b.totalScore - a.totalScore);

  // ── TOP-N ANZEIGEN ────────────────────────────────────────────────────
  exporter.printSummary(filteredLeads, CONFIG.top);

  // ── CSV-EXPORT ────────────────────────────────────────────────────────
  console.log(`💾  Exportiere CSV nach: ${CONFIG.outputDir}`);
  const csvPath = exporter.export(filteredLeads, CONFIG.outputDir);
  console.log(`✅  CSV gespeichert: ${csvPath}`);
  console.log(`\n📂  Öffnen: start "" "${csvPath}"\n`);
}

// ── Scraping-Aufgaben aufbauen ────────────────────────────────────────────────
function buildScrapingTasks() {
  const tasks = [];
  const src   = CONFIG.source;

  const scrapeOptions = {
    city:     CONFIG.city,
    maxPages: CONFIG.maxPages,
    keywords: CONFIG.keywords,
  };

  // Avito
  if (src === 'all' || src === 'avito') {
    const avito = new AvitoScraper();
    const categories = CONFIG.category ? [CONFIG.category] : DEFAULT_CATEGORIES_AVITO;
    for (const cat of categories) {
      tasks.push({
        name: `Avito – ${cat}`,
        run:  () => avito.scrapeListings({ ...scrapeOptions, category: cat }),
      });
    }
  }

  // OpenSooq
  if (src === 'all' || src === 'opensooq') {
    const opensooq = new OpensooqScraper();
    const categories = CONFIG.category ? [CONFIG.category] : DEFAULT_CATEGORIES_OPENSOOQ;
    for (const cat of categories) {
      tasks.push({
        name: `OpenSooq – ${cat}`,
        run:  () => opensooq.scrapeListings({ ...scrapeOptions, category: cat }),
      });
    }
  }

  // Jumia
  if (src === 'all' || src === 'jumia') {
    const jumia = new JumiaScraper();
    const categories = CONFIG.category ? [CONFIG.category] : DEFAULT_CATEGORIES_JUMIA;
    for (const cat of categories) {
      tasks.push({
        name: `Jumia – ${cat}`,
        run:  () => jumia.scrapeListings({ ...scrapeOptions, category: cat }),
      });
    }
  }

  // Instagram
  if (src === 'all' || src === 'instagram') {
    const instagram = new InstagramScraper();
    const handles = CONFIG.handles.length ? CONFIG.handles : DEFAULT_INSTAGRAM_HANDLES;
    tasks.push({
      name: `Instagram – ${handles.length} Handles`,
      run:  () => instagram.scrapeListings({ handles }),
    });
  }

  return tasks;
}

// ── Score-Verteilung ──────────────────────────────────────────────────────────
function printScoreDistribution(leads) {
  if (!leads.length) return;
  const scores = leads.map(l => l.totalScore).sort((a, b) => a - b);
  const sum    = scores.reduce((s, v) => s + v, 0);
  const avg    = (sum / scores.length).toFixed(1);
  const min    = scores[0];
  const max    = scores[scores.length - 1];
  const p50    = scores[Math.floor(scores.length * 0.5)];
  const p75    = scores[Math.floor(scores.length * 0.75)];
  const p90    = scores[Math.floor(scores.length * 0.90)];

  // Buckets
  const buckets = { '0–19': 0, '20–39': 0, '40–59': 0, '60–79': 0, '80–100': 0 };
  for (const s of scores) {
    if (s < 20) buckets['0–19']++;
    else if (s < 40) buckets['20–39']++;
    else if (s < 60) buckets['40–59']++;
    else if (s < 80) buckets['60–79']++;
    else              buckets['80–100']++;
  }

  console.log('\n' + '─'.repeat(62));
  console.log('  📈  SCORE-VERTEILUNG');
  console.log('─'.repeat(62));
  console.log(`  Leads gesamt: ${leads.length}`);
  console.log(`  Min:  ${min}  |  Max: ${max}  |  Ø: ${avg}`);
  console.log(`  P50:  ${p50}  |  P75: ${p75}  |  P90: ${p90}`);
  console.log('');
  for (const [range, cnt] of Object.entries(buckets)) {
    const bar = '█'.repeat(Math.round(cnt / leads.length * 30));
    console.log(`  ${range.padEnd(7)} │ ${bar.padEnd(30)} ${cnt} Leads`);
  }
  console.log('─'.repeat(62));

  // Fehlende Felder analysieren
  const noName  = leads.filter(l => !l.businessName).length;
  const noAct   = leads.filter(l => !l.lastActivity).length;
  const noPic   = leads.filter(l => !l.hasProfilePic).length;
  const noDesc  = leads.filter(l => !l.hasDescription).length;
  const noSoc   = leads.filter(l => !l.hasInstagram && !l.hasFacebook).length;
  console.log('  📋  Feld-Analyse (leere Werte):');
  console.log(`      businessName leer: ${noName}/${leads.length}`);
  console.log(`      lastActivity leer: ${noAct}/${leads.length}`);
  console.log(`      kein Profilbild:   ${noPic}/${leads.length}`);
  console.log(`      keine Beschreibung:${noDesc}/${leads.length}`);
  console.log(`      kein Social-Media: ${noSoc}/${leads.length}`);
  console.log('─'.repeat(62) + '\n');
}

// ── Debug-Sample ──────────────────────────────────────────────────────────────
function printDebugSample(leads) {
  const sample = [...leads].sort((a, b) => b.totalScore - a.totalScore).slice(0, 3);
  console.log('  🔬  DEBUG – Top 3 Leads im Detail:');
  for (const l of sample) {
    console.log(`\n  ┌─ [${l.totalScore}/100] ${l.businessName || '(kein Name)'} (${l.source})`);
    console.log(`  │  Stadt: ${l.city || '-'} | Typ: ${l.sellerType}`);
    console.log(`  │  Produkte: ${l.productCount} | Aktiv: ${l.lastActivity || '-'}`);
    console.log(`  │  Profilbild: ${l.hasProfilePic} | Beschreibung: ${l.hasDescription}`);
    console.log(`  │  Instagram: ${l.hasInstagram} | Facebook: ${l.hasFacebook} | WhatsApp: ${l.hasWhatsAppBusiness}`);
    console.log(`  │  Website: ${l.hasOwnWebsite} (${l.websiteUrl || '-'})`);
    console.log(`  │  Score-Details: ${JSON.stringify(l.scoreBreakdown)}`);
    console.log(`  └─ URL: ${l.profileUrl}`);
  }
  console.log('');
}

// ── Start ──────────────────────────────────────────────────────────────────────
run().catch(err => {
  console.error('\n💥  Kritischer Fehler:', err.message);
  console.error(err.stack);
  process.exit(1);
});

