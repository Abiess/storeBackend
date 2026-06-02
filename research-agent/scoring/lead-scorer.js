/**
 * Lead-Scoring-System + Conversion-Potenzial für markt.ma
 *
 * Lead-Score (0–100): Wie wertvoll ist dieser Lead?
 * Conversion-Score (0–100): Wie wahrscheinlich eröffnet dieser Händler einen Shop?
 */

'use strict';

// Kategorien die besonders gut für markt.ma geeignet sind
const HIGH_VALUE_CATEGORIES = [
  'mode', 'vêtements', 'chaussures', 'beauté', 'cosmétique', 'parfum',
  'électronique', 'informatique', 'smartphone', 'téléphone',
  'maison', 'décoration', 'artisanat', 'bijoux', 'accessoires',
  'sport', 'alimentation', 'bio',
];

class LeadScorer {

  // ── Haupt-Methode: beide Scores berechnen ──────────────────────────

  score(lead) {
    // 1. Lead-Score (Qualität des Leads)
    const breakdown = {
      products:   this._scoreProducts(lead.productCount),
      activity:   this._scoreActivity(lead.lastActivity),
      branding:   this._scoreBranding(lead),
      socialMedia:this._scoreSocialMedia(lead),
      noWebsite:  this._scoreNoWebsite(lead),
    };

    lead.totalScore     = Math.min(100, Object.values(breakdown).reduce((s, v) => s + v, 0));
    lead.scoreBreakdown = breakdown;

    // Kategorie + Aktion
    if (lead.totalScore >= 80) {
      lead.leadCategory      = 'HOT';   lead.leadEmoji = '🔥';
      lead.potentialRevenue  = 'VERY_HIGH';
      lead.recommendedAction = 'Sofort anrufen – innerhalb von 24h';
    } else if (lead.totalScore >= 60) {
      lead.leadCategory      = 'WARM';  lead.leadEmoji = '☀️';
      lead.potentialRevenue  = 'HIGH';
      lead.recommendedAction = 'WhatsApp in 48h';
    } else if (lead.totalScore >= 40) {
      lead.leadCategory      = 'MEDIUM'; lead.leadEmoji = '🌤️';
      lead.potentialRevenue  = 'MEDIUM';
      lead.recommendedAction = 'E-Mail diese Woche';
    } else {
      lead.leadCategory      = 'COLD';  lead.leadEmoji = '❄️';
      lead.potentialRevenue  = 'LOW';
      lead.recommendedAction = 'Newsletter';
    }

    // 2. Conversion-Potenzial (Shop-Eröffnungs-Wahrscheinlichkeit)
    this._scoreConversion(lead);

    // 3. Bester Outreach-Kanal
    lead.outreachChannel = this._bestOutreachChannel(lead);

    // 4. Notizen
    lead.notes = this._generateNotes(lead, breakdown);

    return lead;
  }

  // ── Lead-Score-Faktoren ────────────────────────────────────────────

  _scoreProducts(count) {
    if (count >= 100) return 25;
    if (count >= 50)  return 22;
    if (count >= 20)  return 18;
    if (count >= 10)  return 14;
    if (count >= 5)   return 10;
    if (count >= 2)   return 5;
    return 2;
  }

  _scoreActivity(lastActivity) {
    if (!lastActivity) return 8;
    const days = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000);
    if (days <= 1)   return 25;
    if (days <= 7)   return 22;
    if (days <= 30)  return 16;
    if (days <= 90)  return 10;
    if (days <= 180) return 5;
    return 2;
  }

  _scoreBranding(lead) {
    let pts = 0;
    if (lead.hasLogo || lead.hasProfilePic) pts += 7;
    if (lead.hasDescription)               pts += 5;
    if (lead.hasBrandedName)               pts += 4;
    if (lead.memberSince && this._isEstablished(lead.memberSince)) pts += 4;
    return Math.min(20, pts);
  }

  _scoreSocialMedia(lead) {
    let pts = 0;
    if (lead.hasInstagram) {
      pts += 5;
      if (lead.instagramFollowers >= 1000) pts += 2;
      if (lead.instagramFollowers >= 5000) pts += 2;
    }
    if (lead.hasFacebook)          pts += 3;
    if (lead.hasWhatsAppBusiness)  pts += 3;
    if (lead.hasTikTok)            pts += 2;
    return Math.min(15, pts);
  }

  _scoreNoWebsite(lead) {
    if (!lead.hasOwnWebsite) return 15;
    const url = (lead.websiteUrl || '').toLowerCase();
    if (['instagram.com', 'facebook.com', 'wa.me', 'linktr.ee'].some(d => url.includes(d))) {
      return 10; // Nur Social-Link → kein echter Shop
    }
    return 0;
  }

  // ── Conversion-Potenzial ──────────────────────────────────────────

  _scoreConversion(lead) {
    let score = 0;
    const reasons = [];

    // Kein eigener Shop → Hauptgrund für Konversion
    if (!lead.hasOwnWebsite) {
      score += 30;
      reasons.push('Kein eigener Online-Shop');
    } else {
      const url = (lead.websiteUrl || '').toLowerCase();
      if (['instagram.com', 'facebook.com', 'wa.me', 'linktr.ee'].some(d => url.includes(d))) {
        score += 20;
        reasons.push('Nur Social-Link als "Website"');
      }
    }

    // Produktanzahl = Engagement mit E-Commerce
    if (lead.productCount >= 50) { score += 25; reasons.push(`${lead.productCount} aktive Anzeigen`); }
    else if (lead.productCount >= 20) { score += 18; reasons.push(`${lead.productCount} Anzeigen`); }
    else if (lead.productCount >= 5)  { score += 10; }

    // Business-Konto = professionelle Absicht
    if (lead.sellerType === 'business' || lead.sellerType === 'pro') {
      score += 15;
      reasons.push('Gewerblicher Verkäufer');
    }

    // Social Media = digital-affin, leichter zu konvertieren
    const socialCount = [lead.hasInstagram, lead.hasFacebook, lead.hasTikTok, lead.hasWhatsAppBusiness]
      .filter(Boolean).length;
    if (socialCount >= 3) { score += 15; reasons.push('Stark auf Social Media'); }
    else if (socialCount >= 1) { score += 8; reasons.push('Auf Social Media aktiv'); }

    // Etabliert (> 1 Jahr auf Plattform)
    if (lead.memberSince && this._isEstablished(lead.memberSince)) {
      score += 10;
      reasons.push('Erfahrener Verkäufer');
    }

    // Kategorie passt zu markt.ma
    const cats = lead.categories.join(' ').toLowerCase();
    if (HIGH_VALUE_CATEGORIES.some(c => cats.includes(c))) {
      score += 5;
      reasons.push('Passende Kategorie für markt.ma');
    }

    score = Math.min(100, score);

    if (score >= 75) {
      lead.conversionLabel = 'SEHR_HOCH'; lead.conversionEmoji = '🎯';
    } else if (score >= 55) {
      lead.conversionLabel = 'HOCH';      lead.conversionEmoji = '✅';
    } else if (score >= 35) {
      lead.conversionLabel = 'MITTEL';    lead.conversionEmoji = '⚡';
    } else {
      lead.conversionLabel = 'GERING';    lead.conversionEmoji = '📊';
    }

    lead.conversionScore  = score;
    lead.conversionReason = reasons.slice(0, 3).join(' · ');
  }

  // ── Outreach-Empfehlung ───────────────────────────────────────────

  _bestOutreachChannel(lead) {
    if (lead.whatsapp || lead.hasWhatsAppBusiness) return `WhatsApp ${lead.whatsapp || ''}`.trim();
    if (lead.phone)                                return `Anruf ${lead.phone}`;
    if (lead.hasInstagram)                         return `Instagram @${lead.instagramHandle}`;
    if (lead.hasFacebook)                          return 'Facebook Messenger';
    if (lead.email)                                return `E-Mail ${lead.email}`;
    return 'Avito-Nachricht';
  }

  // ── Helpers ────────────────────────────────────────────────────────

  _isEstablished(memberSince) {
    try {
      return (Date.now() - new Date(memberSince).getTime()) > 365 * 86400000;
    } catch { return false; }
  }

  _generateNotes(lead, breakdown) {
    const notes = [];
    if (!lead.hasOwnWebsite)               notes.push('Kein eigener Online-Shop → perfekter markt.ma-Kandidat');
    if (breakdown.products >= 18)          notes.push(`${lead.productCount} Produkte → professioneller Händler`);
    if (breakdown.activity >= 22)          notes.push('Sehr aktiv – Anzeige in letzten 7 Tagen');
    if (lead.hasInstagram && lead.instagramFollowers >= 1000)
                                           notes.push(`Instagram: ${lead.instagramFollowers} Follower`);
    if (lead.sellerType === 'business' || lead.sellerType === 'pro')
                                           notes.push('Gewerbliches Konto');
    if (!lead.hasProfilePic)               notes.push('Kein Profilbild → Branding-Potenzial');
    return notes;
  }
}

module.exports = LeadScorer;
