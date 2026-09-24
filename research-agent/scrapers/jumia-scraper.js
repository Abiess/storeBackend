/**
 * Jumia.ma Scraper
 * Quelle: https://www.jumia.ma (öffentliche Seller-Seiten)
 *
 * Jumia zeigt Händlerseiten öffentlich an mit:
 *  - Shop-Name, Bewertungen, Produktanzahl
 *  - Registrierungsdatum (soweit öffentlich)
 *  - Kategorien
 */

const cheerio    = require('cheerio');
const BaseScraper = require('./base-scraper');
const Lead       = require('../models/lead');

class JumiaScraper extends BaseScraper {
  constructor() {
    super('jumia', 'https://www.jumia.ma');
  }

  async scrapeListings(options = {}) {
    const { category = 'mode', maxPages = 3 } = options;
    const leads       = [];
    const seenSellers = new Set();

    for (let page = 1; page <= maxPages; page++) {
      const url = `${this.baseUrl}/${encodeURIComponent(category)}/?page=${page}`;
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
      const sellers = this._extractSellers($);

      if (sellers.length === 0) {
        this.log('Keine weiteren Händler.');
        break;
      }

      this.log(`${sellers.length} Händler auf Seite ${page}`);

      for (const s of sellers) {
        if (!s.profileUrl || seenSellers.has(s.profileUrl)) continue;
        seenSellers.add(s.profileUrl);
        try {
          const lead = await this.scrapeProfile(s.profileUrl, s);
          if (lead) leads.push(lead);
        } catch (err) {
          this.warn(`Übersprungen: ${err.message}`);
        }
      }
    }

    return leads;
  }

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

    const $ = cheerio.load(html);
    const lead = new Lead();

    lead.source     = 'jumia';
    lead.profileUrl = profileUrl;
    lead.id         = `jumia_${this._extractId(profileUrl)}`;

    lead.businessName = hint.sellerName || this._text($, [
      'h1.shop-name', '.seller-name', '[data-testid="shop-name"]', 'h1',
    ]).trim();

    lead.city = this._text($, ['.shop-location', '.seller-location']).trim();

    // Jumia Händler haben immer ein Profil (sind bereits registriert)
    lead.sellerType = 'business';

    // Produktanzahl
    const countText = this._text($, [
      '.shop-products-count', '.products-count', '[data-testid="products-count"]',
    ]);
    lead.productCount   = this._parseNumber(countText) || (hint.productCount || 0);
    lead.activeListings = lead.productCount;

    // Logo / Profilbild
    const logoSrc = $('.shop-logo img, .seller-logo img, .brand-logo').attr('src') || '';
    lead.hasLogo       = !!logoSrc && !logoSrc.includes('placeholder');
    lead.hasProfilePic = lead.hasLogo;

    // Beschreibung
    lead.description  = this._text($, ['.shop-description', '.seller-about']).trim();
    lead.hasDescription = lead.description.length > 10;

    // Kategorien
    const cats = new Set();
    $('.shop-category, [data-category], .category-tag').each((_, el) => {
      const c = $(el).text().trim();
      if (c) cats.add(c);
    });
    if (hint.category) cats.add(hint.category);
    lead.categories = [...cats].slice(0, 5);

    lead.lastActivity = hint.lastActivity || null;

    // Jumia-Händler haben KEINE eigene externe Website direkt im Profil
    // Wir prüfen trotzdem auf verlinkte externe URLs
    $('a[href]').each((_, el) => this._detectExternalLinks(lead, $(el).attr('href')));

    lead.hasBrandedName = this._isBrandedName(lead.businessName);

    // Jumia ist bereits ein Marktplatz – diese Händler sind digital,
    // aber NICHT auf markt.ma → gute Leads
    lead.notes = [`Aktiver Jumia-Händler → kennt E-Commerce-Konzept`];

    return lead;
  }

  // ── Privat ────────────────────────────────────────────────────────────

  _extractSellers($) {
    const sellers = [];
    // Produktkarten → Händlernamen extrahieren
    $('a[href*="/seller/"], a[href*="/shop/"], [data-seller]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (!href) return;
      const sellerName = $(el).text().trim() || '';
      const count = $(el).closest('article, .c-prd').find('.count, .prd-count').first().text();
      sellers.push({
        profileUrl:   this._abs(href),
        sellerName,
        productCount: this._parseNumber(count),
        category:     '',
      });
    });
    return sellers;
  }

  _extractId(url) {
    const m = url.match(/\/seller\/([^/?]+)/);
    return m ? m[1] : encodeURIComponent(url).slice(-16);
  }

  _text($, selectors) {
    for (const s of selectors) {
      const t = $(s).first().text().trim();
      if (t) return t;
    }
    return '';
  }

  _parseNumber(text) {
    const m = (text || '').replace(/[\s,\.]/g, '').match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
  }

  _detectExternalLinks(lead, href) {
    if (!href) return;
    if (href.includes('instagram.com')) {
      lead.hasInstagram = true;
      const m = href.match(/instagram\.com\/([^/?]+)/);
      if (m) lead.instagramHandle = m[1];
    }
    if (href.includes('facebook.com')) { lead.hasFacebook = true; lead.facebookUrl = href; }
    if (href.includes('wa.me')) { lead.hasWhatsAppBusiness = true; }
    if (href.includes('tiktok.com')) lead.hasTikTok = true;
    if (href.match(/^https?:\/\//) &&
        !['jumia.ma','instagram.com','facebook.com','wa.me','tiktok.com'].some(d => href.includes(d))) {
      lead.hasOwnWebsite = true;
      lead.websiteUrl    = href;
    }
  }

  _isBrandedName(name) {
    if (!name || name.length < 2) return false;
    if (/^[a-z0-9_-]+$/i.test(name) && name.length < 5) return false;
    return true;
  }

  _abs(href) {
    if (!href || href === '#') return '';
    if (href.startsWith('http')) return href;
    return `${this.baseUrl}${href}`;
  }
}

module.exports = JumiaScraper;

