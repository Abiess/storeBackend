/**
 * Instagram Business Page Scraper
 *
 * ⚠️  LEGAL NOTICE:
 * Dieser Scraper verwendet NUR öffentlich zugängliche Instagram-Daten
 * (öffentliche Business-Seiten, die ohne Login sichtbar sind).
 * Es werden KEINE privaten Profile, keine Login-Daten und keine
 * interne Instagram-API verwendet.
 *
 * Anmerkung: Instagram blockiert aggressiv direkte HTTP-Requests.
 * Dieser Scraper arbeitet über öffentliche Embeds & Graph-Metadaten.
 * Für produktiven Einsatz empfiehlt sich die offizielle
 * Instagram Graph API (für Business-Konten mit eigenem Token).
 */

const cheerio    = require('cheerio');
const BaseScraper = require('./base-scraper');
const Lead       = require('../models/lead');

class InstagramScraper extends BaseScraper {
  constructor() {
    super('instagram', 'https://www.instagram.com');
  }

  /**
   * Analysiert eine Liste von Instagram-Handles (öffentliche Business-Seiten).
   * @param {object} options - { handles: string[] }
   */
  async scrapeListings(options = {}) {
    const { handles = [] } = options;
    const leads = [];

    for (const handle of handles) {
      try {
        const lead = await this.scrapeProfile(handle);
        if (lead) leads.push(lead);
      } catch (err) {
        this.warn(`@${handle}: ${err.message}`);
      }
    }

    return leads;
  }

  /**
   * Öffentliche Metadaten einer Instagram Business Page auslesen.
   * Verwendet den öffentlichen oEmbed-Endpunkt von Meta.
   */
  async scrapeProfile(handle, hint = {}) {
    // Handle normalisieren
    const cleanHandle = handle.replace(/^@/, '').replace(/https?:\/\/[^/]+\//, '').split('/')[0];
    this.log(`@${cleanHandle}`);

    const profileUrl = `https://www.instagram.com/${cleanHandle}/`;
    const lead = new Lead();
    lead.source           = 'instagram';
    lead.profileUrl       = profileUrl;
    lead.id               = `instagram_${cleanHandle}`;
    lead.instagramHandle  = cleanHandle;
    lead.hasInstagram     = true;

    // ── Meta-oEmbed (öffentlich, kein Auth erforderlich) ─────────────
    try {
      const oembedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(profileUrl)}&omitscript=true`;
      // Ohne App-Token funktioniert oEmbed nur begrenzt – wir versuchen es trotzdem
      const res = await this.get(oembedUrl).catch(() => null);
      if (res && res.data) {
        const data = res.data;
        if (data.author_name) lead.businessName = data.author_name;
      }
    } catch { /* ignorieren */ }

    // ── Öffentliche Profilseite laden ──────────────────────────────────
    let html = '';
    try {
      const res = await this.get(profileUrl, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'fr-MA,fr;q=0.9,ar;q=0.8',
        }
      });
      html = res.data;
    } catch (err) {
      this.warn(`Profilseite nicht erreichbar: ${err.message}`);
    }

    if (html) {
      const $ = cheerio.load(html);

      // Metadaten aus Open Graph Tags
      const ogTitle   = $('meta[property="og:title"]').attr('content') || '';
      const ogDesc    = $('meta[property="og:description"]').attr('content') || '';
      const ogImage   = $('meta[property="og:image"]').attr('content') || '';

      if (!lead.businessName && ogTitle) {
        // Format: "Name (@handle) • Instagram photos and videos"
        lead.businessName = ogTitle.replace(/\s*\(.*?\)\s*•.*$/, '').trim();
      }

      if (ogDesc) {
        // Format: "123K Followers, 456 Following, 789 Posts"
        const followersMatch = ogDesc.match(/([\d,.]+[KkMm]?)\s*(Followers|Abonnés|متابع)/i);
        if (followersMatch) {
          lead.instagramFollowers = this._parseFollowers(followersMatch[1]);
        }

        const postsMatch = ogDesc.match(/([\d,.]+)\s*(Posts|Publications|منشور)/i);
        if (postsMatch) {
          lead.productCount   = parseInt(postsMatch[1].replace(/[,.\s]/g, ''), 10);
          lead.activeListings = lead.productCount;
        }

        // Bio / Beschreibung extrahieren
        const descParts = ogDesc.split('–');
        if (descParts.length > 1) {
          lead.description  = descParts[descParts.length - 1].trim();
          lead.hasDescription = lead.description.length > 5;
        }
      }

      lead.hasProfilePic = !!ogImage && !ogImage.includes('default');
      lead.hasLogo       = lead.hasProfilePic;

      // Website-Link aus Bio
      const websiteLink = $('a[href*="://"]').filter((_, el) => {
        const h = $(el).attr('href') || '';
        return !h.includes('instagram.com') && !h.includes('facebook.com');
      }).first().attr('href');

      if (websiteLink) {
        lead.hasOwnWebsite = true;
        lead.websiteUrl    = websiteLink;
      }

      // WhatsApp-Link
      const waLink = $('a[href*="wa.me"], a[href*="whatsapp"]').first().attr('href');
      if (waLink) {
        lead.hasWhatsAppBusiness = true;
        const m = waLink.match(/wa\.me\/(\d+)/);
        if (m) lead.whatsapp = `+${m[1]}`;
      }

      // Facebook-Link
      const fbLink = $('a[href*="facebook.com"]').first().attr('href');
      if (fbLink) { lead.hasFacebook = true; lead.facebookUrl = fbLink; }
    }

    // ── Fallbacks ────────────────────────────────────────────────────
    if (!lead.businessName) lead.businessName = `@${cleanHandle}`;
    lead.country      = 'MA';
    lead.sellerType   = 'business';
    lead.hasBrandedName = this._isBrandedName(lead.businessName, cleanHandle);

    // Instagram-Aktivität: Profilbild + Beschreibung + Posts als Branding-Indikator
    lead.lastActivity = new Date().toISOString(); // Wenn Profil existiert → aktiv

    return lead;
  }

  _parseFollowers(text) {
    const t = text.toString().replace(/,/g, '').trim();
    if (/k$/i.test(t)) return Math.round(parseFloat(t) * 1000);
    if (/m$/i.test(t)) return Math.round(parseFloat(t) * 1000000);
    return parseInt(t, 10) || 0;
  }

  _isBrandedName(name, handle) {
    if (!name || name === `@${handle}`) return false;
    if (/^[a-z0-9._]+$/i.test(name) && name.length < 6) return false;
    return true;
  }
}

module.exports = InstagramScraper;

