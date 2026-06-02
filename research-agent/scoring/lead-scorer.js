/**
 * Lead-Scoring-System für markt.ma
 *
 * Bewertet Händler auf einer Skala von 0–100:
 *  - Produktanzahl      (0–25 Pkt)  → Wie aktiv verkauft der Händler?
 *  - Aktivität          (0–25 Pkt)  → Wie aktuell sind seine Anzeigen?
 *  - Branding           (0–20 Pkt)  → Wie professionell wirkt das Profil?
 *  - Social-Media       (0–15 Pkt)  → Ist er auf Social-Media präsent?
 *  - Keine eigene Website (0–15 Pkt)→ Braucht er eine digitale Heimat?
 *
 * Kategorien:
 *  🔥 HOT    80–100 → Sofort kontaktieren
 *  ☀️  WARM   60–79  → In 48h kontaktieren
 *  🌤️  MEDIUM 40–59  → In dieser Woche
 *  ❄️  COLD   0–39   → Niedrige Priorität
 */

class LeadScorer {

  score(lead) {
    const breakdown = {};

    // ── 1. Produktanzahl (0–25 Pkt) ─────────────────────────────────────
    breakdown.products = this._scoreProducts(lead.productCount);

    // ── 2. Aktivität (0–25 Pkt) ─────────────────────────────────────────
    breakdown.activity = this._scoreActivity(lead.lastActivity);

    // ── 3. Branding-Qualität (0–20 Pkt) ─────────────────────────────────
    breakdown.branding = this._scoreBranding(lead);

    // ── 4. Social-Media-Präsenz (0–15 Pkt) ──────────────────────────────
    breakdown.socialMedia = this._scoreSocialMedia(lead);

    // ── 5. Keine eigene Website (0–15 Pkt) ──────────────────────────────
    breakdown.noWebsite = this._scoreNoWebsite(lead);

    const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
    lead.totalScore    = Math.min(100, total);
    lead.scoreBreakdown = breakdown;

    // ── Kategorie ────────────────────────────────────────────────────────
    if (total >= 80) {
      lead.leadCategory      = 'HOT';
      lead.leadEmoji         = '🔥';
      lead.potentialRevenue  = 'VERY_HIGH';
      lead.recommendedAction = 'Sofort anrufen – innerhalb von 24 Stunden';
    } else if (total >= 60) {
      lead.leadCategory      = 'WARM';
      lead.leadEmoji         = '☀️';
      lead.potentialRevenue  = 'HIGH';
      lead.recommendedAction = 'In 48 Stunden per WhatsApp kontaktieren';
    } else if (total >= 40) {
      lead.leadCategory      = 'MEDIUM';
      lead.leadEmoji         = '🌤️';
      lead.potentialRevenue  = 'MEDIUM';
      lead.recommendedAction = 'E-Mail-Kampagne diese Woche';
    } else {
      lead.leadCategory      = 'COLD';
      lead.leadEmoji         = '❄️';
      lead.potentialRevenue  = 'LOW';
      lead.recommendedAction = 'In monatlichen Newsletter aufnehmen';
    }

    // ── Notizen generieren ───────────────────────────────────────────────
    lead.notes = this._generateNotes(lead, breakdown);

    return lead;
  }

  // ── Bewertungs-Helfer ─────────────────────────────────────────────────

  _scoreProducts(count) {
    if (count >= 100) return 25;
    if (count >= 50)  return 22;
    if (count >= 20)  return 18;
    if (count >= 10)  return 14;
    if (count >= 5)   return 10;
    if (count >= 1)   return 5;
    return 0;
  }

  _scoreActivity(lastActivity) {
    if (!lastActivity) return 5; // unbekannt → leicht positiv
    const days = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000);
    if (days <= 1)   return 25;
    if (days <= 7)   return 22;
    if (days <= 30)  return 18;
    if (days <= 90)  return 13;
    if (days <= 180) return 7;
    return 2;
  }

  _scoreBranding(lead) {
    let pts = 0;
    if (lead.hasLogo || lead.hasProfilePic) pts += 7;   // Profilbild vorhanden
    if (lead.hasDescription)               pts += 5;   // Beschreibung ausgefüllt
    if (lead.hasBrandedName)               pts += 4;   // Echter Markenname (kein "user123")
    if (lead.memberSince && this._memberSinceLong(lead.memberSince)) pts += 4; // Etabliert
    return Math.min(20, pts);
  }

  _scoreSocialMedia(lead) {
    let pts = 0;
    if (lead.hasInstagram) {
      pts += 5;
      if (lead.instagramFollowers >= 1000)  pts += 2;
      if (lead.instagramFollowers >= 5000)  pts += 2;
    }
    if (lead.hasFacebook)           pts += 3;
    if (lead.hasWhatsAppBusiness)   pts += 3;
    if (lead.hasTikTok)             pts += 2;
    return Math.min(15, pts);
  }

  _scoreNoWebsite(lead) {
    // Kein Shop = starke Notwendigkeit für markt.ma
    if (!lead.hasOwnWebsite) return 15;
    // Hat eine Website, aber vielleicht nur Social-Media-Link?
    const url = (lead.websiteUrl || '').toLowerCase();
    if (url.includes('instagram.com') || url.includes('facebook.com') ||
        url.includes('linktr.ee')     || url.includes('wa.me')) {
      return 10; // "Website" ist nur ein Social-Link → noch kein eigener Shop
    }
    return 0; // Hat wirklich einen eigenen Online-Shop
  }

  _memberSinceLong(memberSince) {
    // Mitglied seit mindestens 1 Jahr?
    try {
      const ms = new Date(memberSince).getTime();
      return (Date.now() - ms) > 365 * 86400000;
    } catch { return false; }
  }

  _generateNotes(lead, breakdown) {
    const notes = [];
    if (!lead.hasOwnWebsite)           notes.push('Kein eigener Online-Shop → perfekter markt.ma-Kandidat');
    if (breakdown.products >= 18)      notes.push(`Hohe Produktanzahl (${lead.productCount}) → professioneller Händler`);
    if (breakdown.activity >= 22)      notes.push('Sehr aktiv – Anzeigen in letzten 7 Tagen');
    if (lead.hasInstagram && lead.instagramFollowers >= 1000) notes.push(`Instagram: ${lead.instagramFollowers} Follower – bereits aufgebaut`);
    if (lead.sellerType === 'business' || lead.sellerType === 'pro') notes.push('Als Business-Konto registriert');
    if (!lead.hasProfilePic && !lead.hasLogo) notes.push('Kein Profilbild → Branding-Potenzial');
    if (breakdown.noWebsite === 10)    notes.push('Website = nur Social-Link, kein echter Shop');
    return notes;
  }
}

module.exports = LeadScorer;

