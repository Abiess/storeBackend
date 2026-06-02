/**
 * Avito.ma Scraper
 * Quelle: https://www.avito.ma (öffentliche Anzeigen & Händlerprofile)
 *
 * Was gesammelt wird (nur öffentlich sichtbar):
 *  - Händlername, Stadt, Kategorie
 *  - Anzahl der öffentlichen Anzeigen
 *  - Datum der letzten Anzeige
 *  - Profilbild vorhanden (J/N)
 *  - Mitglied seit
 *  - Öffentlich sichtbare Telefonnummer (nur falls freiwillig angezeigt)
 *  - Social-Media-Links im öffentlichen Profil
 */

const cheerio    = require('cheerio');
const BaseScraper = require('./base-scraper');
const Lead       = require('../models/lead');

class AvitoScraper extends BaseScraper {
  constructor() {
    super('avito', 'https://www.avito.ma');
  }

  /**
   * Sucht nach Händler-Listings in einer Kategorie/Stadt.
   * @param {object} options - { category, city, maxPages, keywords }
   * @returns {Lead[]}
   */
  async scrapeListings(options = {}) {
    const {
      category  = '',
      city      = '',
      maxPages  = 3,
      keywords  = '',
    } = options;

    const leads = [];
    const seenProfiles = new Set();

    for (let page = 1; page <= maxPages; page++) {
      const url = this._buildSearchUrl(category, city, keywords, page);
      this.log(`Seite ${page}/${maxPages}: ${url}`);

      let html;
      try {
        const res = await this.get(url);
        html = res.data;
      } catch (err) {
        this.warn(`Seite ${page} nicht ladbar: ${err.message}`);
        break;
      }

      const $ = cheerio.load(html);
      const profileLinks = this._extractProfileLinks($);

      if (profileLinks.length === 0) {
        this.log('Keine weiteren Anzeigen – Abbruch.');
        break;
      }

      this.log(`${profileLinks.length} Anzeigen gefunden auf Seite ${page}`);

      for (const link of profileLinks) {
        if (seenProfiles.has(link.profileUrl)) continue;
        seenProfiles.add(link.profileUrl);

        try {
          const lead = await this.scrapeProfile(link.profileUrl, link);
          if (lead) leads.push(lead);
        } catch (err) {
          this.warn(`Profil übersprungen: ${err.message}`);
        }
      }
    }

    return leads;
  }

  /** Einzelnes Händlerprofil scrapen */
  async scrapeProfile(profileUrl, hint = {}) {
    this.log(`Profil: ${profileUrl}`);

    let html;
    try {
      const res = await this.get(profileUrl);
      html = res.data;
    } catch (err) {
      this.warn(`Profil nicht ladbar: ${err.message}`);
      return null;
    }

    const $    = cheerio.load(html);
    const lead = new Lead();

    lead.source     = 'avito';
    lead.profileUrl = profileUrl;
    lead.id         = `avito_${this._extractIdFromUrl(profileUrl)}`;

    // ── Basisinformationen ────────────────────────────────────────────
    lead.businessName = this._text($, [
      '[data-testid="user-name"]',
      '.sc-1g3sn3w-3',
      '.seller-name',
      'h1',
    ]).trim();

    lead.city = hint.city || this._text($, [
      '[data-testid="location"]',
      '.sc-1g3sn3w-5',
      '.seller-location',
    ]).trim();

    lead.memberSince = this._text($, [
      '[data-testid="member-since"]',
      '.member-since',
      '.sc-1g3sn3w-7',
    ]).replace(/Membre depuis|عضو منذ|Mitglied seit/i, '').trim();

    // ── Profilbild ────────────────────────────────────────────────────
    const avatarSrc = $('[data-testid="user-avatar"] img, .seller-avatar img, .sc-1g3sn3w-0 img').attr('src') || '';
    lead.hasProfilePic = !!avatarSrc && !avatarSrc.includes('default') && !avatarSrc.includes('placeholder');
    lead.hasLogo       = lead.hasProfilePic;

    // ── Produktanzahl ─────────────────────────────────────────────────
    const countText = this._text($, [
      '[data-testid="ads-count"]',
      '.ads-number',
      '.sc-1g3sn3w-9',
    ]);
    lead.productCount  = this._parseNumber(countText);
    lead.activeListings = lead.productCount;

    // ── Letzte Aktivität ──────────────────────────────────────────────
    const dateTexts = [];
    $('[data-testid="ad-date"], .listing-date, .sc-1nld1l9-2').each((_, el) => {
      dateTexts.push($(el).text().trim());
    });
    lead.lastActivity = hint.lastActivity || this._parseRelativeDate(dateTexts[0] || '');

    // ── Beschreibung / Bio ────────────────────────────────────────────
    lead.description  = this._text($, ['.seller-description', '.sc-1g3sn3w-8', '[data-testid="user-bio"]']).trim();
    lead.hasDescription = lead.description.length > 10;

    // ── Telefon (nur öffentlich sichtbar) ─────────────────────────────
    lead.phone = this._text($, [
      '[data-testid="phone-number"]',
      '.phone-number',
    ]).replace(/\s+/g, '').trim();

    // ── Website & Social Media Links ──────────────────────────────────
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      this._detectSocialLinks(lead, href);
    });

    // ── Händlertyp ────────────────────────────────────────────────────
    const badgeText = this._text($, ['.pro-badge', '.business-badge', '[data-testid="seller-type"]']).toLowerCase();
    if (badgeText.includes('pro') || badgeText.includes('professionnel')) {
      lead.sellerType = 'pro';
    } else if (badgeText.includes('business') || badgeText.includes('boutique')) {
      lead.sellerType = 'business';
    } else {
      lead.sellerType = 'individual';
    }

    // ── Kategorien aus Anzeigen-Titeln ────────────────────────────────
    const cats = new Set();
    $('[data-testid="ad-category"], .ad-category, .category-name').each((_, el) => {
      const cat = $(el).text().trim();
      if (cat) cats.add(cat);
    });
    lead.categories = [...cats].slice(0, 5);

    // ── Branding-Name prüfen ──────────────────────────────────────────
    lead.hasBrandedName = this._isBrandedName(lead.businessName);

    return lead;
  }

  // ── Privat-Helfer ───────────────────────────────────────────────────

  _buildSearchUrl(category, city, keywords, page) {
    let path = '/fr/maroc';
    if (city)     path += `/${city.toLowerCase().replace(/\s+/g, '-')}`;
    if (category) path += `/${category.toLowerCase().replace(/\s+/g, '-')}`;
    const params = new URLSearchParams();
    if (keywords) params.set('q', keywords);
    params.set('o', String(page));
    return `${this.baseUrl}${path}?${params.toString()}`;
  }

  _extractProfileLinks($) {
    const links = [];
    // Anzeigen-Karten → Händlerprofil-URL ableiten
    $('a[href*="/fr/vendeur/"], a[href*="/fr/boutique/"], a[href*="/ar/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href && !links.find(l => l.profileUrl === this._absoluteUrl(href))) {
        // Letztes Anzeigendatum aus der Karte extrahieren
        const card      = $(el).closest('[data-testid="ad-card"], li, article');
        const dateText  = card.find('[data-testid="ad-date"], .date').first().text().trim();
        const cityText  = card.find('[data-testid="location"], .city').first().text().trim();
        links.push({
          profileUrl:   this._absoluteUrl(href),
          lastActivity: this._parseRelativeDate(dateText),
          city:         cityText,
        });
      }
    });
    return links;
  }

  _extractIdFromUrl(url) {
    const m = url.match(/\/(\d+)\/?$/);
    return m ? m[1] : encodeURIComponent(url).slice(-20);
  }

  _text($, selectors) {
    for (const sel of selectors) {
      const t = $(sel).first().text().trim();
      if (t) return t;
    }
    return '';
  }

  _parseNumber(text) {
    const m = (text || '').replace(/\s/g, '').match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
  }

  _parseRelativeDate(text) {
    if (!text) return null;
    const t = text.toLowerCase();
    const now = Date.now();
    if (t.includes("aujourd'hui") || t.includes('today') || t.includes('اليوم')) return new Date(now).toISOString();
    if (t.includes('hier') || t.includes('yesterday') || t.includes('أمس'))       return new Date(now - 86400000).toISOString();
    const m = t.match(/(\d+)\s*(jour|day|يوم)/);
    if (m) return new Date(now - parseInt(m[1]) * 86400000).toISOString();
    const w = t.match(/(\d+)\s*(semaine|week|أسبوع)/);
    if (w) return new Date(now - parseInt(w[1]) * 7 * 86400000).toISOString();
    return null;
  }

  _detectSocialLinks(lead, href) {
    if (!href) return;
    if (href.includes('instagram.com')) {
      lead.hasInstagram = true;
      const m = href.match(/instagram\.com\/([^/?]+)/);
      if (m) lead.instagramHandle = m[1];
    }
    if (href.includes('facebook.com')) {
      lead.hasFacebook = true;
      lead.facebookUrl = href;
    }
    if (href.includes('wa.me') || href.includes('whatsapp')) {
      lead.hasWhatsAppBusiness = true;
      if (!lead.whatsapp) {
        const m = href.match(/wa\.me\/(\d+)/);
        if (m) lead.whatsapp = `+${m[1]}`;
      }
    }
    if (href.includes('tiktok.com')) lead.hasTikTok = true;
    if (href.match(/^https?:\/\//) &&
        !href.includes('avito.ma') &&
        !href.includes('instagram.com') &&
        !href.includes('facebook.com') &&
        !href.includes('wa.me') &&
        !href.includes('tiktok.com')) {
      lead.hasOwnWebsite = true;
      lead.websiteUrl    = href;
    }
  }

  _isBrandedName(name) {
    if (!name || name.length < 3) return false;
    // Kein reiner Nutzername-Stil (user123, seller_456)
    if (/^(user|seller|vendeur|vendor|membre)\d+$/i.test(name)) return false;
    // Keine reine Telefonnummer
    if (/^\+?\d[\d\s]{8,}$/.test(name)) return false;
    return true;
  }

  _absoluteUrl(href) {
    if (href.startsWith('http')) return href;
    return `${this.baseUrl}${href}`;
  }
}

module.exports = AvitoScraper;

