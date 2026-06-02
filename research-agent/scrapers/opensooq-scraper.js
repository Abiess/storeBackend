/**
 * OpenSooq.com Scraper (Marokko-Sektion: ma.opensooq.com)
 * Öffentliche Händlerprofile & Anzeigen.
 */

const cheerio    = require('cheerio');
const BaseScraper = require('./base-scraper');
const Lead       = require('../models/lead');

class OpensooqScraper extends BaseScraper {
  constructor() {
    super('opensooq', 'https://ma.opensooq.com');
  }

  async scrapeListings(options = {}) {
    const { category = '', maxPages = 3, keywords = '' } = options;
    const leads = [];
    const seenProfiles = new Set();

    for (let page = 1; page <= maxPages; page++) {
      const url = this._buildSearchUrl(category, keywords, page);
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
      const items = this._extractListingItems($);

      if (items.length === 0) {
        this.log('Keine weiteren Anzeigen.');
        break;
      }

      this.log(`${items.length} Anzeigen auf Seite ${page}`);

      for (const item of items) {
        if (!item.profileUrl || seenProfiles.has(item.profileUrl)) continue;
        seenProfiles.add(item.profileUrl);

        try {
          const lead = await this.scrapeProfile(item.profileUrl, item);
          if (lead) leads.push(lead);
        } catch (err) {
          this.warn(`Profil übersprungen: ${err.message}`);
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

    lead.source     = 'opensooq';
    lead.profileUrl = profileUrl;
    lead.id         = `opensooq_${this._extractId(profileUrl)}`;

    // ── Geschäftsinformationen ────────────────────────────────────────
    lead.businessName = this._text($, [
      '.user-name', '.seller-name', 'h1.name', '[data-testid="seller-name"]',
    ]).trim();

    lead.city = hint.city || this._text($, [
      '.user-location', '.seller-city', '[data-testid="location"]',
    ]).trim();

    lead.memberSince = this._text($, [
      '.member-since', '.join-date', '[data-testid="member-since"]',
    ]).replace(/منذ|since|depuis/i, '').trim();

    // Profilbild
    const avatarSrc = $('.user-avatar img, .seller-photo img, .profile-img').attr('src') || '';
    lead.hasProfilePic = !!avatarSrc && !avatarSrc.includes('default');
    lead.hasLogo = lead.hasProfilePic;

    // Produktanzahl
    const countText = this._text($, ['.ads-count', '.listings-count', '.user-ads-count']);
    lead.productCount   = this._parseNumber(countText) || (hint.productCount || 0);
    lead.activeListings = lead.productCount;

    // Beschreibung
    lead.description  = this._text($, ['.user-bio', '.seller-description', '.about-me']).trim();
    lead.hasDescription = lead.description.length > 10;

    // Letzte Aktivität
    lead.lastActivity = hint.lastActivity;

    // Telefon (nur öffentlich)
    lead.phone = this._text($, ['.phone', '.contact-phone', '[data-type="phone"]'])
      .replace(/\s+/g, '').trim();

    // Social Links
    $('a[href]').each((_, el) => this._detectSocialLinks(lead, $(el).attr('href')));

    // Händlertyp
    const badge = this._text($, ['.seller-type', '.account-type', '.pro-tag']).toLowerCase();
    lead.sellerType = badge.includes('pro') ? 'pro' : badge.includes('business') ? 'business' : 'individual';

    // Kategorien
    const cats = new Set();
    $('.category-tag, .ad-category, [data-category]').each((_, el) => {
      const c = $(el).text().trim();
      if (c) cats.add(c);
    });
    lead.categories = [...cats].slice(0, 5);

    lead.hasBrandedName = this._isBrandedName(lead.businessName);

    return lead;
  }

  // ── Privat ────────────────────────────────────────────────────────────

  _buildSearchUrl(category, keywords, page) {
    const params = new URLSearchParams();
    if (keywords) params.set('q', keywords);
    params.set('page', String(page));
    const cat = category ? `/${encodeURIComponent(category)}` : '';
    return `${this.baseUrl}/ar${cat}?${params.toString()}`;
  }

  _extractListingItems($) {
    const items = [];
    $('li[data-id], .listing-item, .post-item, article.ad-item').each((_, el) => {
      const card = $(el);
      const link = card.find('a[href*="/view/"], a[href*="/post/"]').first();
      if (!link.length) return;

      const href = link.attr('href') || '';
      const profileLink = card.find('a[href*="/user/"], a[href*="/seller/"]').first().attr('href');

      const dateText = card.find('.date, .post-date, time').first().text().trim();
      const city     = card.find('.location, .city').first().text().trim();

      if (profileLink) {
        items.push({
          profileUrl:   this._abs(profileLink),
          lastActivity: this._parseRelDate(dateText),
          city,
        });
      } else if (href) {
        // Anzeigen-URL speichern, Profil-URL später ableiten
        items.push({
          profileUrl:   this._abs(href),
          lastActivity: this._parseRelDate(dateText),
          city,
          isListing:    true,
        });
      }
    });
    return items;
  }

  _extractId(url) {
    const m = url.match(/\/(\d+)\/?$/);
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
    const m = (text || '').replace(/\s/g, '').match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
  }

  _parseRelDate(text) {
    if (!text) return null;
    const t = text.toLowerCase();
    const now = Date.now();
    if (t.includes('اليوم') || t.includes('today') || t.includes("aujourd'hui")) return new Date(now).toISOString();
    if (t.includes('أمس')  || t.includes('yesterday') || t.includes('hier'))     return new Date(now - 86400000).toISOString();
    const d = t.match(/(\d+)\s*(يوم|day|jour)/);
    if (d) return new Date(now - parseInt(d[1]) * 86400000).toISOString();
    return null;
  }

  _detectSocialLinks(lead, href) {
    if (!href) return;
    if (href.includes('instagram.com')) {
      lead.hasInstagram = true;
      const m = href.match(/instagram\.com\/([^/?]+)/);
      if (m && m[1] !== 'p') lead.instagramHandle = m[1];
    }
    if (href.includes('facebook.com')) { lead.hasFacebook = true; lead.facebookUrl = href; }
    if (href.includes('wa.me') || href.includes('whatsapp')) {
      lead.hasWhatsAppBusiness = true;
      const m = href.match(/wa\.me\/(\d+)/);
      if (m && !lead.whatsapp) lead.whatsapp = `+${m[1]}`;
    }
    if (href.includes('tiktok.com')) lead.hasTikTok = true;
    if (href.match(/^https?:\/\//) &&
        !['opensooq.com','instagram.com','facebook.com','wa.me','tiktok.com'].some(d => href.includes(d))) {
      lead.hasOwnWebsite = true;
      lead.websiteUrl    = href;
    }
  }

  _isBrandedName(name) {
    if (!name || name.length < 3) return false;
    if (/^(user|seller|عضو|مستخدم)\d+$/i.test(name)) return false;
    if (/^\+?\d[\d\s]{8,}$/.test(name)) return false;
    return true;
  }

  _abs(href) {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    return `${this.baseUrl}${href}`;
  }
}

module.exports = OpensooqScraper;

