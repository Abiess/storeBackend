/**
 * CSV-Exporter für Lead-Daten
 * Exportiert alle Leads in eine strukturierte CSV-Datei.
 */

const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs   = require('fs');

const CSV_COLUMNS = [
  { id: 'leadEmoji',         title: 'Status' },
  { id: 'leadCategory',      title: 'Lead-Kategorie' },
  { id: 'totalScore',        title: 'Score (0-100)' },
  { id: 'source',            title: 'Quelle' },
  { id: 'businessName',      title: 'Händlername' },
  { id: 'sellerType',        title: 'Händlertyp' },
  { id: 'city',              title: 'Stadt' },
  { id: 'region',            title: 'Region' },
  { id: 'phone',             title: 'Telefon' },
  { id: 'whatsapp',          title: 'WhatsApp' },
  { id: 'email',             title: 'E-Mail' },
  { id: 'memberSince',       title: 'Mitglied seit' },
  { id: 'productCount',      title: 'Produktanzahl' },
  { id: 'activeListings',    title: 'Aktive Anzeigen' },
  { id: 'categories',        title: 'Kategorien' },
  { id: 'avgPrice',          title: 'Ø Preis (MAD)' },
  { id: 'lastActivity',      title: 'Letzte Aktivität' },
  { id: 'hasOwnWebsite',     title: 'Eigene Website?' },
  { id: 'websiteUrl',        title: 'Website-URL' },
  { id: 'hasInstagram',      title: 'Instagram?' },
  { id: 'instagramHandle',   title: 'Instagram Handle' },
  { id: 'instagramFollowers',title: 'Instagram Follower' },
  { id: 'hasFacebook',       title: 'Facebook?' },
  { id: 'hasTikTok',         title: 'TikTok?' },
  { id: 'hasWhatsAppBusiness',title: 'WhatsApp Business?' },
  { id: 'hasLogo',           title: 'Logo/Profilbild?' },
  { id: 'hasDescription',    title: 'Beschreibung?' },
  { id: 'potentialRevenue',  title: 'Umsatzpotenzial' },
  { id: 'recommendedAction', title: 'Empfohlene Aktion' },
  { id: 'notes',             title: 'Notizen' },
  { id: 'profileUrl',        title: 'Profil-URL' },
  { id: 'scrapedAt',         title: 'Erfasst am' },
  { id: 'scoreBreakdown',    title: 'Score-Details (JSON)' },
];

class CsvExporter {
  /**
   * @param {Lead[]} leads
   * @param {string} outputDir - Pfad zum Ausgabeverzeichnis
   * @returns {string} Dateipfad der erstellten CSV
   */
  export(leads, outputDir) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename  = `markt-ma-leads_${timestamp}.csv`;
    const filepath  = path.join(outputDir, filename);

    // Zeilen konvertieren
    const rows = leads.map(l => l.toCSVRow());

    // ── CSV manuell aufbauen (UTF-8 BOM für Excel) ────────────────────
    const header = CSV_COLUMNS.map(c => `"${c.title}"`).join(';');
    const lines  = rows.map(row =>
      CSV_COLUMNS.map(c => {
        const val = row[c.id] !== undefined && row[c.id] !== null ? String(row[c.id]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      }).join(';')
    );
    const csvContent = '\uFEFF' + [header, ...lines].join('\r\n');
    fs.writeFileSync(filepath, csvContent, 'utf8');
    return filepath;
  }

  /** Gibt eine Zusammenfassung der Leads auf der Konsole aus */
  printSummary(leads, topN = 20) {
    const byCategory = { HOT: [], WARM: [], MEDIUM: [], COLD: [] };
    for (const l of leads) {
      (byCategory[l.leadCategory] || []).push(l);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('  📊  LEAD-AUSWERTUNG – markt.ma');
    console.log('═'.repeat(60));
    console.log(`  Gesamt:   ${leads.length} Leads`);
    console.log(`  🔥 HOT:   ${byCategory.HOT.length}`);
    console.log(`  ☀️  WARM:  ${byCategory.WARM.length}`);
    console.log(`  🌤️  MEDIUM: ${byCategory.MEDIUM.length}`);
    console.log(`  ❄️  COLD:  ${byCategory.COLD.length}`);
    console.log('─'.repeat(60));

    const top = [...leads].sort((a, b) => b.totalScore - a.totalScore).slice(0, topN);
    console.log(`  🏆  TOP ${topN} LEADS:`);
    top.forEach((l, i) => {
      console.log(`    ${String(i+1).padStart(2)}. ${l.leadEmoji} [${String(l.totalScore).padStart(3)}/100] ${(l.businessName||'(kein Name)').slice(0,35).padEnd(35)} ${l.city || ''}`);
      if (l.phone)    console.log(`        📞 ${l.phone}`);
      if (l.whatsapp) console.log(`        💬 ${l.whatsapp}`);
      console.log(`        → ${l.recommendedAction}`);
    });
    console.log('═'.repeat(60) + '\n');
  }
}

module.exports = CsvExporter;

