/**
 * Avito.ma Scraper – v3
 * Strategie: Seller-Daten direkt aus __NEXT_DATA__ der Suchergebnisseite
 * extrahieren und nach Seller-ID GRUPPIEREN → ein Lead pro Händler,
 * productCount = Anzahl seiner gefundenen Anzeigen.
 * KEINE einzelnen Listing-HTTP-Requests mehr.
 */

const cheerio     = require('cheerio');
const BaseScraper = require('./base-scraper');
const Lead        = require('../models/lead');

const CATEGORY_MAP = {
  mode:         'vetements_et_accessoires',
  electronique: 'electronique',
  maison:       'maison_et_jardin',
  informatique: 'informatique_et_multimedia',
  beaute:       'beaute_et_bien_etre',
  sport:        'sport_loisirs_et_jeux',
};

class AvitoScraper extends BaseScraper {
  constructor() {
    super('avito', 'https://www.avito.ma');
  }

  async scrapeListings(options = {}) {
    const { category = '', city = '', maxPages = 3, keywords = '' } = options;

    // Seller nach ID gruppieren (mehrere Listings desselben Händlers → ein Lead)
    const sellerMap = new Map(); // sellerId → { hint, listingCount, lastActivity }

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

      // ── __NEXT_DATA__ JSON parsen ─────────────────────────────────
      const nextData = this._parseNextData(html);
      let pageAds = [];

      if (nextData) {
        pageAds = this._extractAdsFromJson(nextData);
        this.log(`JSON: ${pageAds.length} Anzeigen gefunden`);
      }

      // ── HTML-Fallback ─────────────────────────────────────────────
      if (pageAds.length === 0) {
        const $ = cheerio.load(html);
        pageAds = this._extractAdsFromHtml($, category);
        this.log(`HTML-Fallback: ${pageAds.length} Anzeigen`);
      }

      if (pageAds.length === 0) {
        this.log('Keine weiteren Anzeigen – Abbruch.');
        break;
      }

      // ── Nach Seller gruppieren ────────────────────────────────────
      for (const ad of pageAds) {
        const sid = ad.sellerId || ad.sellerUrl || ad.listingUrl || `anon_${Math.random()}`;
        if (!sellerMap.has(sid)) {
          sellerMap.set(sid, { ...ad, listingCount: 0 });
        }
        const entry = sellerMap.get(sid);
        entry.listingCount++;
        // Neueste Aktivität behalten
        if (ad.lastActivity && (!entry.lastActivity || ad.lastActivity > entry.lastActivity)) {
          entry.lastActivity = ad.lastActivity;
        }
        // Höheren adCount bevorzugen
        if (ad.sellerAdCount > (entry.sellerAdCount || 0)) entry.sellerAdCount = ad.sellerAdCount;
      }
    }

    this.log(`Einzigartige Händler: ${sellerMap.size}`);

    // ── Ein Lead pro Händler bauen ────────────────────────────────────
    const leads = [];
    for (const [, hint] of sellerMap) {
      leads.push(this._buildLead(hint));
    }
    return leads;
  }

  // scrapeProfile wird nicht mehr für Batch-Läufe benötigt,
  // bleibt für manuelle Einzelabfragen erhalten
  async scrapeProfile(profileUrl, hint = {}) {
    return this._buildLead({ ...hint, profileUrl });
  }

  // ── JSON-Extraktion ───────────────────────────────────────────────

  _extractAdsFromJson(data) {
    const ads = [];
    try {
      // Mögliche Pfade in Avito Next.js JSON
      const pageProps = data?.props?.pageProps || data?.pageProps || data || {};

      const rawAds =
        pageProps.ads ||
        pageProps.data?.ads ||
        pageProps.listings ||
        pageProps.data?.listings ||
        pageProps.searchResults?.ads ||
        this._deepFindArray(data, ['ads', 'listings', 'items', 'annonces']) ||
        [];

      for (const ad of rawAds) {
        const seller   = ad.store  || ad.seller || ad.user || {};
        const location = ad.location || {};

        const sellerName = seller.name || seller.storeName || seller.username || ad.userName || '';
        const sellerId   = String(seller.id || seller.storeId || seller.userId || ad.userId || '');
        const sellerUrl  = seller.url || seller.profileUrl || '';
        const listingUrl = ad.url || ad.listingUrl || (ad.id ? `/fr/annonce/${ad.id}` : '');

        const publishedRaw = ad.publishedAt || ad.createdAt || ad.date || ad.publishedAgo || '';
        const lastActivity = publishedRaw
          ? (/^\d{4}/.test(publishedRaw)
              ? new Date(publishedRaw).toISOString()
              : this._parseRelDate(publishedRaw))
          : new Date().toISOString(); // Fallback: heute

        ads.push({
          sellerId,
          sellerUrl:    sellerUrl   ? this._abs(sellerUrl)   : '',
          profileUrl:   sellerUrl   ? this._abs(sellerUrl)   : this._abs(listingUrl),
          listingUrl:   this._abs(listingUrl),
          sellerName,
          sellerAdCount: seller.adCount || seller.nbAds || 0,
          hasAvatar:    !!(seller.avatar || seller.photo),
          isPro:        !!(seller.isPro || seller.isStore || seller.isProfessional),
          hasDescription: !!(seller.description && seller.description.length > 5),
          sellerDescription: seller.description || '',
          phone:        seller.phone || ad.phone || '',
          city:         (typeof location === 'string' ? location : location.city || location.name || ''),
          memberSince:  seller.memberSince || seller.createdAt || '',
          lastActivity,
          price:        ad.price || 0,
          category:     ad.category?.label || ad.categoryLabel || '',
          // Social-Links aus dem Seller-Objekt
          instagram:    seller.instagram || '',
          facebook:     seller.facebook  || '',
          website:      seller.website   || seller.externalUrl || '',
        });
      }
    } catch (e) {
      this.warn(`JSON-Parse-Fehler: ${e.message}`);
    }
    return ads;
  }

  _extractAdsFromHtml($, category) {
    const ads = [];
    const seen = new Set();

    // Anzeigen-Karten
    const cards = $('article, li[data-id], [class*="listing-item"], [class*="ListingItem"]');
    cards.each((_, el) => {
      const card = $(el);

      // Anzeigen-Link
      const link = card.find('a[href*="/fr/annonce/"], a[href*="/ar/annonce/"]').first();
      const href = link.attr('href') || '';
      if (!href || seen.has(href)) return;
      seen.add(href);

      // Verkäufer-Info
      const sellerLink = card.find('a[href*="/fr/vendeur/"], a[href*="/ar/vendeur/"], a[href*="/fr/boutique/"]').first();
      const sellerUrl  = sellerLink.attr('href') || '';
      const sellerName = sellerLink.text().trim() || card.find('[class*="seller"], [class*="Seller"]').first().text().trim();

      // Datum
      const dateText = card.find('time, [class*="date"], [class*="Date"]').first().text().trim();

      ads.push({
        sellerId:    sellerUrl || href,
        profileUrl:  sellerUrl ? this._abs(sellerUrl) : this._abs(href),
        listingUrl:  this._abs(href),
        sellerName,
        city:        card.find('[class*="location"], [class*="city"]').first().text().trim().split(',')[0],
        lastActivity: this._parseRelDate(dateText) || new Date().toISOString(),
        price:       this._parseNum(card.find('[class*="price"], [class*="Price"]').first().text()),
        category,
        sellerAdCount: 0,
        hasAvatar:   false,
        isPro:       card.find('[class*="pro"], [class*="Pro"]').length > 0,
      });
    });
    return ads;
  }

  // ── Lead-Builder ──────────────────────────────────────────────────

  _buildLead(hint) {
    const lead = new Lead();
    lead.source     = 'avito';
    lead.id         = `avito_${hint.sellerId || Math.random().toString(36).slice(2, 10)}`;
    lead.profileUrl = hint.profileUrl || hint.listingUrl || '';
    lead.scrapedAt  = new Date().toISOString();

    lead.businessName   = hint.sellerName || '';
    lead.city           = hint.city        || '';
    lead.memberSince    = hint.memberSince  || '';
    lead.phone          = hint.phone        || '';
    lead.hasProfilePic  = !!hint.hasAvatar;
    lead.hasLogo        = lead.hasProfilePic;
    lead.hasDescription = !!hint.hasDescription;
    lead.description    = hint.sellerDescription || '';

    // productCount: gesehene Anzeigen ODER bekannter adCount
    const seenListings = hint.listingCount || 1;
    lead.productCount   = Math.max(seenListings, hint.sellerAdCount || 0);
    lead.activeListings = lead.productCount;

    // Letzte Aktivität = Datum der neuesten Anzeige im Suchergebnis
    lead.lastActivity   = hint.lastActivity || new Date().toISOString();

    lead.sellerType  = hint.isPro ? 'pro' : 'individual';
    lead.avgPrice    = hint.price || 0;
    lead.categories  = hint.category ? [hint.category] : [];
    lead.country     = 'MA';

    // Website / Social
    if (hint.website) this._detectSocial(lead, hint.website);
    if (hint.instagram) { lead.hasInstagram = true; lead.instagramHandle = hint.instagram; }
    if (hint.facebook)  { lead.hasFacebook  = true; lead.facebookUrl    = hint.facebook;  }

    lead.hasOwnWebsite  = !!hint.website && !['instagram.com','facebook.com','wa.me'].some(d => (hint.website||'').includes(d));
    lead.hasBrandedName = this._isBrandedName(lead.businessName);

    return lead;
  }

  // ── URL-Builder ────────────────────────────────────────────────────

  _buildSearchUrl(category, city, keywords, page) {
    const slug = CATEGORY_MAP[category] || category.toLowerCase().replace(/\s+/g, '_') || '';
    let path   = '/fr/maroc';
    if (city) path += `/${encodeURIComponent(city.toLowerCase().replace(/\s+/g, '-'))}`;
    if (slug) path += `/${slug}`;
    const params = new URLSearchParams();
    if (keywords) params.set('q', keywords);
    if (page > 1) params.set('o', String(page));
    const qs = params.toString();
    return `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  _parseNextData(html) {
    try {
      const m = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]+?)<\/script>/i);
      if (m) return JSON.parse(m[1]);
    } catch { /* ignorieren */ }
    return null;
  }

  _deepFindArray(obj, keys, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 8) return null;
    for (const key of keys) {
      if (Array.isArray(obj[key]) && obj[key].length > 0) return obj[key];
    }
    for (const val of Object.values(obj)) {
      const found = this._deepFindArray(val, keys, depth + 1);
      if (found) return found;
    }
    return null;
  }

  _parseRelDate(text) {
    if (!text) return null;
    const t = text.toLowerCase();
    const now = Date.now();
    if (t.includes("aujourd'hui") || t.includes('today')     || t.includes('اليوم')) return new Date(now).toISOString();
    if (t.includes('hier')        || t.includes('yesterday') || t.includes('أمس'))   return new Date(now - 86400000).toISOString();
    const d = t.match(/(\d+)\s*(jour|day|يوم)/);
    if (d) return new Date(now - parseInt(d[1]) * 86400000).toISOString();
    const w = t.match(/(\d+)\s*(semaine|week|أسبوع)/);
    if (w) return new Date(now - parseInt(w[1]) * 7 * 86400000).toISOString();
    if (/\d{4}-\d{2}-\d{2}/.test(text)) return new Date(text).toISOString();
    return null;
  }

  _parseNum(text) {
    const m = (text || '').replace(/[\s,.]/g, '').match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
  }

  _detectSocial(lead, href) {
    if (!href) return;
    if (href.includes('instagram.com')) { lead.hasInstagram = true; const m = href.match(/instagram\.com\/([^/?]+)/); if (m) lead.instagramHandle = m[1]; }
    if (href.includes('facebook.com'))  { lead.hasFacebook  = true; lead.facebookUrl = href; }
    if (href.includes('wa.me') || href.includes('whatsapp')) { lead.hasWhatsAppBusiness = true; const m = href.match(/wa\.me\/(\d+)/); if (m && !lead.whatsapp) lead.whatsapp = `+${m[1]}`; }
    if (href.includes('tiktok.com')) lead.hasTikTok = true;
  }

  _isBrandedName(name) {
    if (!name || name.length < 3) return false;
    if (/^(user|seller|vendeur|vendor|membre|عضو)\d*$/i.test(name)) return false;
    if (/^\+?\d[\d\s]{8,}$/.test(name)) return false;
    return true;
  }

  _abs(href) {
    if (!href || href === '#') return '';
    if (href.startsWith('http')) return href;
    return `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
  }
}

module.exports = AvitoScraper;

