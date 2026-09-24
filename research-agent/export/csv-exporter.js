/**
 * CSV-Exporter für Lead-Daten
 * Exportiert alle Leads in eine strukturierte CSV-Datei.
 * Enthält Metadaten-Header zur Verifikation (real vs. demo).
 */

const path = require('path');
const fs   = require('fs');

const CSV_COLUMNS = [
  // ── Tier + SaaS-Fit (neu) ──────────────────────────────────────────
  { id: 'tierEmoji',          title: 'Tier' },
  { id: 'tier',               title: 'Tier-Label' },
  { id: 'saasEmoji',          title: 'SaaS-Fit' },
  { id: 'saasLabel',          title: 'SaaS-Fit-Label' },
  { id: 'saasScore',          title: 'SaaS-Fit-Score (0-100)' },
  { id: 'saasReason',         title: 'SaaS-Fit-Begründung' },
  { id: 'importReady',        title: 'Import-bereit?' },
  { id: 'hotProductsCount',   title: 'Gescrapte Produkte' },
  { id: 'hotProductImages',   title: 'Gescrapte Produktbilder' },
  // ── Conversion-Potenzial ────────────────────────────────────────────
  { id: 'conversionEmoji',    title: 'Shop-Potenzial' },
  { id: 'conversionLabel',    title: 'Conversion-Kategorie' },
  { id: 'conversionScore',    title: 'Conversion-Score (0-100)' },
  { id: 'conversionReason',   title: 'Conversion-Begründung' },
  // ── Lead-Score ──────────────────────────────────────────────────────
  { id: 'leadEmoji',          title: 'Lead-Status' },
  { id: 'leadCategory',       title: 'Lead-Kategorie' },
  { id: 'totalScore',         title: 'Lead-Score (0-100)' },
  // ── Identifikation ──────────────────────────────────────────────────
  { id: 'source',             title: 'Quelle' },
  { id: 'businessName',       title: 'Händlername' },
  { id: 'sellerType',         title: 'Händlertyp' },
  { id: 'city',               title: 'Stadt' },
  { id: 'region',             title: 'Region/Viertel' },
  // ── Kontakt ─────────────────────────────────────────────────────────
  { id: 'phone',              title: 'Telefon' },
  { id: 'whatsapp',           title: 'WhatsApp' },
  { id: 'outreachChannel',    title: 'Empfohlener Kontaktkanal' },
  // ── Produkte ────────────────────────────────────────────────────────
  { id: 'productCount',       title: 'Produktanzahl' },
  { id: 'activeListings',     title: 'Aktive Anzeigen' },
  { id: 'categories',         title: 'Kategorien' },
  { id: 'avgPrice',           title: 'Ø Preis' },
  { id: 'currency',           title: 'Währung' },
  { id: 'lastActivity',       title: 'Letzte Aktivität' },
  { id: 'memberSince',        title: 'Mitglied seit' },
  // ── Online-Präsenz ──────────────────────────────────────────────────
  { id: 'hasOwnWebsite',      title: 'Eigene Website?' },
  { id: 'websiteUrl',         title: 'Website-URL' },
  { id: 'hasInstagram',       title: 'Instagram?' },
  { id: 'instagramHandle',    title: 'Instagram Handle' },
  { id: 'instagramFollowers', title: 'Instagram Follower' },
  { id: 'hasFacebook',        title: 'Facebook?' },
  { id: 'hasTikTok',          title: 'TikTok?' },
  { id: 'hasWhatsAppBusiness',title: 'WhatsApp Business?' },
  { id: 'hasLogo',            title: 'Logo/Profilbild?' },
  { id: 'hasDescription',     title: 'Beschreibung?' },
  // ── Meta ────────────────────────────────────────────────────────────
  { id: 'recommendedAction',  title: 'Empfohlene Aktion' },
  { id: 'notes',              title: 'Notizen' },
  { id: 'profileUrl',         title: 'Profil-URL' },
  { id: 'scrapedAt',          title: 'Erfasst am' },
  { id: 'scoreBreakdown',     title: 'Score-Details (JSON)' },
];

class CsvExporter {
  /**
   * @param {object[]} leads   – echte Lead-Objekte
   * @param {string}   outputDir
   * @param {object}   meta    – { demoMode: bool, source: string, params: object }
   * @returns {string} absoluter Dateipfad der erzeugten CSV
   */
  export(leads, outputDir, meta = {}) {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dataSource = meta.demoMode ? 'DEMO' : 'REAL';
    const filename   = `markt-ma-haendler_${dataSource}_${timestamp}.csv`;
    const filepath   = path.join(outputDir, filename);

    // ── Metadaten-Kommentarzeilen (für Workflow-Verifikation) ──────────
    // Zeilen beginnen mit '#' → beim Einlesen überspringbar
    const metaLines = [
      `# MARKT_MA_LEADS_CSV_V2`,
      `# DATA_SOURCE=${dataSource}`,
      `# GENERATED_AT=${new Date().toISOString()}`,
      `# TOTAL_LEADS=${leads.length}`,
      `# SOURCE_FILTER=${meta.source || 'all'}`,
      `# DEMO_MODE=${meta.demoMode ? 'true' : 'false'}`,
      `# PARAMS=${JSON.stringify(meta.params || {})}`,
    ];

    const header = CSV_COLUMNS.map(c => `"${c.title}"`).join(';');
    const rows   = leads.map(l => l.toCSVRow());
    const lines  = rows.map(row =>
      CSV_COLUMNS.map(c => {
        const val = row[c.id] !== undefined && row[c.id] !== null ? String(row[c.id]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      }).join(';')
    );

    const content = '\uFEFF' + [...metaLines, header, ...lines].join('\r\n');
    fs.writeFileSync(filepath, content, 'utf8');

    // Kurzinfo auf stdout (für Workflow-Log)
    console.log(`\n📄  CSV-INFO:`);
    console.log(`    Pfad:       ${filepath}`);
    console.log(`    Datei:      ${filename}`);
    console.log(`    Größe:      ${(Buffer.byteLength(content, 'utf8') / 1024).toFixed(1)} KB`);
    console.log(`    Leads:      ${leads.length}`);
    console.log(`    DataSource: ${dataSource}`);

    // Source-Verteilung
    const srcDist = {};
    for (const l of leads) srcDist[l.source] = (srcDist[l.source] || 0) + 1;
    console.log(`    Quellen:    ${Object.entries(srcDist).map(([k,v]) => `${k}:${v}`).join(', ') || '(keine)'}`);

    // Tier-Verteilung
    const tierDist = {};
    for (const l of leads) if (l.tier) tierDist[l.tier] = (tierDist[l.tier] || 0) + 1;
    if (Object.keys(tierDist).length > 0) {
      console.log(`    Tiers:      ${Object.entries(tierDist).map(([k,v]) => `${k}:${v}`).join(', ')}`);
    }

    const importReady = leads.filter(l => l.importReady).length;
    if (importReady > 0) {
      console.log(`    Import-bereit: ${importReady} HOT_LEADs`);
    }

    return filepath;
  }

  printSummary(leads, topN = 20) {
    const byCategory = { HOT: [], WARM: [], MEDIUM: [], COLD: [] };
    const byConversion = { SEHR_HOCH: [], HOCH: [], MITTEL: [], GERING: [] };
    for (const l of leads) {
      (byCategory[l.leadCategory] || []).push(l);
      (byConversion[l.conversionLabel] || []).push(l);
    }

    console.log('\n' + '═'.repeat(65));
    console.log('  📊  HÄNDLER-FINDER AUSWERTUNG – markt.ma');
    console.log('═'.repeat(65));
    console.log(`  Händler gesamt: ${leads.length}`);
    console.log('');
    console.log('  Lead-Score:');
    console.log(`    🔥 HOT:    ${byCategory.HOT.length}  │  ☀️  WARM:   ${byCategory.WARM.length}`);
    console.log(`    🌤️  MEDIUM: ${byCategory.MEDIUM.length}  │  ❄️  COLD:   ${byCategory.COLD.length}`);
    console.log('');
    console.log('  Shop-Eröffnungs-Potenzial:');
    console.log(`    🎯 SEHR HOCH: ${byConversion.SEHR_HOCH.length}  │  ✅ HOCH:  ${byConversion.HOCH.length}`);
    console.log(`    ⚡ MITTEL:    ${byConversion.MITTEL.length}  │  📊 GERING: ${byConversion.GERING.length}`);
    console.log('─'.repeat(65));

    // Top nach Conversion-Score
    const topConversion = [...leads].sort((a, b) => b.conversionScore - a.conversionScore).slice(0, topN);
    console.log(`\n  🎯  TOP ${topN} NACH SHOP-POTENZIAL:`);
    topConversion.forEach((l, i) => {
      const name = (l.businessName || '(kein Name)').slice(0, 32).padEnd(32);
      console.log(`  ${String(i+1).padStart(2)}. ${l.conversionEmoji} [${String(l.conversionScore).padStart(3)}] ${name} ${l.city || ''}`);
      if (l.phone || l.whatsapp) console.log(`      📞 ${l.phone || l.whatsapp}`);
      console.log(`      ↳ ${l.conversionReason}`);
      console.log(`      📬 ${l.outreachChannel}`);
    });

    console.log('═'.repeat(65) + '\n');
  }
}

module.exports = CsvExporter;
