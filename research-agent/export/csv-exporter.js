/**
 * CSV-Exporter für Lead-Daten
 * Exportiert alle Leads in eine strukturierte CSV-Datei.
 */

const path = require('path');
const fs   = require('fs');

const CSV_COLUMNS = [
  // Conversion-Potenzial (Händler-Finder – wichtigste Spalten)
  { id: 'conversionEmoji',    title: 'Shop-Potenzial' },
  { id: 'conversionLabel',    title: 'Conversion-Kategorie' },
  { id: 'conversionScore',    title: 'Conversion-Score (0-100)' },
  { id: 'conversionReason',   title: 'Conversion-Begründung' },
  // Lead-Score
  { id: 'leadEmoji',          title: 'Lead-Status' },
  { id: 'leadCategory',       title: 'Lead-Kategorie' },
  { id: 'totalScore',         title: 'Lead-Score (0-100)' },
  // Identifikation
  { id: 'source',             title: 'Quelle' },
  { id: 'businessName',       title: 'Händlername' },
  { id: 'sellerType',         title: 'Händlertyp' },
  { id: 'city',               title: 'Stadt' },
  { id: 'region',             title: 'Region/Viertel' },
  // Kontakt
  { id: 'phone',              title: 'Telefon' },
  { id: 'whatsapp',           title: 'WhatsApp' },
  { id: 'outreachChannel',    title: 'Empfohlener Kontaktkanal' },
  // Produkte
  { id: 'productCount',       title: 'Produktanzahl' },
  { id: 'activeListings',     title: 'Aktive Anzeigen' },
  { id: 'categories',         title: 'Kategorien' },
  { id: 'avgPrice',           title: 'Ø Preis' },
  { id: 'currency',           title: 'Währung' },
  { id: 'lastActivity',       title: 'Letzte Aktivität' },
  { id: 'memberSince',        title: 'Mitglied seit' },
  // Online-Präsenz
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
  // Meta
  { id: 'recommendedAction',  title: 'Empfohlene Aktion' },
  { id: 'notes',              title: 'Notizen' },
  { id: 'profileUrl',         title: 'Profil-URL' },
  { id: 'scrapedAt',          title: 'Erfasst am' },
  { id: 'scoreBreakdown',     title: 'Score-Details (JSON)' },
];

class CsvExporter {
  export(leads, outputDir) {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename  = `markt-ma-haendler_${timestamp}.csv`;
    const filepath  = path.join(outputDir, filename);

    const header = CSV_COLUMNS.map(c => `"${c.title}"`).join(';');
    const rows   = leads.map(l => l.toCSVRow());
    const lines  = rows.map(row =>
      CSV_COLUMNS.map(c => {
        const val = row[c.id] !== undefined && row[c.id] !== null ? String(row[c.id]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      }).join(';')
    );
    fs.writeFileSync(filepath, '\uFEFF' + [header, ...lines].join('\r\n'), 'utf8');
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
