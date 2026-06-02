/**
 * Avito.ma Scraper
 * Quelle: https://www.avito.ma (öffentliche Anzeigen & Händlerprofile)
 *
 * Avito.ma ist eine Next.js-App – Daten stecken im <script id="__NEXT_DATA__">
 * JSON-Block. Dieser Scraper extrahiert daraus Listings + Händlerprofile.
 * Fallback: HTML-Selektoren für statisch gerendertes HTML.
 */

const cheerio     = require('cheerio');
const BaseScraper = require('./base-scraper');
const Lead        = require('../models/lead');

// Avito.ma echte Kategorie-Slugs (aus der Live-Seite)
const CATEGORY_MAP = {
  mode:         'vetements_et_accessoires',
  electronique: 'electronique',
  maison:       'maison_et_jardin',
  informatique: 'informatique_et_multimedia',
  beaute:       'beaute_et_bien_etre',
  sport:        'sport_loisirs_et_jeux',
  default:      '',
};

class AvitoScraper extends BaseScraper {
  constructor() {
    super('avito', 'https://www.avito.ma');
  }

  async scrapeListings(options = {}) {
    const { category = '', city = '', maxPages = 3, keywords = '' } = options;
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

      // ── Strategie 1: __NEXT_DATA__ JSON ──────────────────────────
      let profileLinks = this._extractFromNextData(html);

      // ── Strategie 2: HTML-Selektoren (Fallback) ──────────────────
      if (profileLinks.length === 0) {
        const $ = cheerio.load(html);
        profileLinks = this._extractFromHtml($);
      }

      if (profileLinks.length === 0) {
        this.log('Keine weiteren Anzeigen auf dieser Seite.');
        break;
      }

      this.log(`${profileLinks.length} Profil-Links gefunden`);

      for (const link of profileLinks) {
        if (!link.profileUrl || seenProfiles.has(link.profileUrl)) continue;
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

  async scrapeProfile(profileUrl, hint = {}) {
    // Wenn hint bereits vollständige Daten enthält (aus __NEXT_DATA__ mit echten Feldern)
    if (hint.fullData && hint.businessName && hint.productCount > 0) {
      return this._buildLeadFromHint(profileUrl, hint);
    }

    this.log(`Profil: ${profileUrl}`);
    let html;
    try {
      const res = await this.get(profileUrl);
      html = res.data;
    } catch (err) {
      this.warn(`Nicht ladbar: ${err.message}`);
      return this._buildLeadFromHint(profileUrl, hint);
    }

    const $ = cheerio.load(html);
    const lead = this._buildLeadFromHint(profileUrl, hint);

    // ── __NEXT_DATA__ aus der Seite lesen (Listing oder Profil) ─────
    const nextData = this._parseNextData(html);
    if (nextData) {
      this._enrichLeadFromPageJson(lead, nextData, $);
    } else {
      this._enrichLeadFromHtml(lead, $);
    }

    lead.hasBrandedName = this._isBrandedName(lead.businessName);
    return lead;
  }

  /** Daten aus Next.js JSON einer Listing- oder Profilseite extrahieren */
  _enrichLeadFromPageJson(lead, data, $) {
    try {
      // ── Händler/Store-Objekt finden ──────────────────────────────
      const pageProps = data?.props?.pageProps || data?.pageProps || {};

      // Listing-Seite: ad.store oder ad.user
      const ad = pageProps.ad || pageProps.listing || pageProps.annonce || {};
      const store = ad.store || ad.seller || ad.user || pageProps.store || pageProps.seller || {};

      if (store.name      && !lead.businessName)  lead.businessName  = store.name;
      if (store.adCount   && !lead.productCount)  { lead.productCount = store.adCount; lead.activeListings = store.adCount; }
      if (store.avatar    && !lead.hasProfilePic) { lead.hasProfilePic = true; lead.hasLogo = true; }
      if (store.memberSince && !lead.memberSince) lead.memberSince   = store.memberSince;
      if (store.phone     && !lead.phone)         lead.phone         = store.phone;
      if (store.isPro)                             lead.sellerType   = 'pro';
      if (store.description && store.description.length > 5) lead.hasDescription = true;

      // Stadt aus Anzeige
      const loc = ad.location || ad.city || {};
      if (!lead.city) lead.city = typeof loc === 'string' ? loc : (loc.city || loc.name || '');

      // Datum der Anzeige
      const publishedAt = ad.publishedAt || ad.createdAt || ad.date || '';
      if (publishedAt && !hint?.lastActivity) {
        lead.lastActivity = /^\d{4}/.test(publishedAt)
          ? new Date(publishedAt).toISOString()
          : this._parseRelativeDate(publishedAt);
      }

      // Preis
      if (ad.price && !lead.avgPrice) lead.avgPrice = ad.price;

      // Kategorie
      const cat = ad.category?.label || ad.categoryLabel || '';
      if (cat && !lead.categories.length) lead.categories = [cat];

      // Website/Social aus Store
      const links = store.links || store.socialLinks || [];
      for (const lnk of (Array.isArray(links) ? links : [])) {
        this._detectSocial(lead, typeof lnk === 'string' ? lnk : lnk.url || '');
      }
      if (store.website) this._detectSocial(lead, store.website);
    } catch { /* ignorieren */ }

    // Zusätzlich HTML-Fallback
    this._enrichLeadFromHtml(lead, $);
  }

  /** HTML-basiertes Anreichern eines Leads (Listing- oder Profilseite) */
  _enrichLeadFromHtml(lead, $) {
    // Händlername
    if (!lead.businessName) {
      lead.businessName = this._t($, [
        '[class*="seller-name"]', '[class*="sellerName"]', '[class*="StoreName"]',
        '[class*="username"]', '[class*="UserName"]', 'h1',
      ]);
    }

    // Anzeigenanzahl des Händlers
    if (lead.productCount <= 1) {
      const cntText = this._t($, [
        '[class*="adCount"]', '[class*="ad-count"]', '[class*="listingCount"]',
        '[class*="adsNumber"]', '[class*="nbAds"]',
      ]);
      const cnt = this._parseCount(cntText);
      if (cnt > 1) { lead.productCount = cnt; lead.activeListings = cnt; }
    }

    // Profilbild
    if (!lead.hasProfilePic) {
      const avatar = $('[class*="avatar"] img, [class*="Avatar"] img, [class*="seller"] img').first().attr('src') || '';
      if (avatar && !avatar.includes('default') && !avatar.includes('placeholder')) {
        lead.hasProfilePic = true;
        lead.hasLogo = true;
      }
    }

    // Stadt
    if (!lead.city) {
      lead.city = this._t($, [
        '[class*="location"]', '[class*="Location"]', '[class*="city"]', '[class*="City"]',
      ]).split(',')[0].trim();
    }

    // Telefon
    if (!lead.phone) {
      lead.phone = this._t($, ['[class*="phone"]', '[data-type="phone"]', '[class*="Phone"]'])
        .replace(/\s+/g, '');
    }

    // Beschreibung
    if (!lead.hasDescription) {
      const desc = this._t($, ['[class*="description"]', '[class*="Description"]', '[class*="about"]']);
      lead.hasDescription = desc.length > 10;
    }

    // Mitglied seit
    if (!lead.memberSince) {
      lead.memberSince = this._t($, [
        '[class*="memberSince"]', '[class*="member-since"]', '[class*="joinDate"]',
      ]).replace(/Membre depuis|عضو منذ|Member since/i, '').trim();
    }

    // Social-Media-Links
    $('a[href]').each((_, el) => this._detectSocial(lead, $(el).attr('href')));
  }

  // ── Next.js JSON-Extraktion ────────────────────────────────────────

  _extractFromNextData(html) {
    const data = this._parseNextData(html);
    if (!data) return [];

    const links = [];
    try {
      // Verschiedene mögliche Pfade in der Next.js-Struktur
      const ads = this._deepFind(data, ['ads', 'data', 'props', 'items', 'listings'])
        || this._deepFind(data, ['pageProps', 'ads'])
        || this._deepFind(data, ['pageProps', 'data', 'ads'])
        || this._deepFind(data, ['pageProps', 'listings'])
        || [];

      for (const ad of (Array.isArray(ads) ? ads : [])) {
        const profilePath = ad.store?.url || ad.seller?.url || ad.user?.url
          || ad.storeUrl || ad.sellerUrl || '';
        const listingPath = ad.url || ad.listingUrl || `/fr/annonce/${ad.id}` || '';

        // Direkte Daten aus JSON
        const hint = {
          businessName:    ad.store?.name || ad.seller?.name || ad.user?.username || ad.storeName || '',
          city:            ad.location?.city || ad.city || ad.location || '',
          productCount:    ad.store?.adCount || ad.seller?.adCount || 0,
          hasProfilePic:   !!(ad.store?.avatar || ad.seller?.avatar || ad.user?.avatar),
          lastActivity:    ad.publishedAt || ad.createdAt || ad.date || null,
          phone:           ad.phone || '',
          sellerType:      ad.store?.isPro ? 'pro' : ad.seller?.isPro ? 'pro' : 'individual',
          memberSince:     ad.store?.memberSince || ad.seller?.memberSince || '',
          category:        ad.category?.label || ad.categoryLabel || '',
          avgPrice:        ad.price || 0,
          fullData:        true,
        };

        if (hint.lastActivity && typeof hint.lastActivity === 'string') {
          if (!/^\d{4}/.test(hint.lastActivity)) {
            hint.lastActivity = this._parseRelativeDate(hint.lastActivity);
          }
        }

        const url = profilePath
          ? this._abs(profilePath)
          : listingPath
            ? this._abs(listingPath)
            : null;

        if (url) links.push({ profileUrl: url, ...hint });
      }
    } catch (e) {
      // kein crash bei unbekannter Struktur
    }
    return links;
  }

  _parseNextData(html) {
    try {
      const m = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([^<]+)<\/script>/i);
      if (m) return JSON.parse(m[1]);
    } catch { /* ignorieren */ }
    // Fallback: window.__initialState__
    try {
      const m2 = html.match(/window\.__initialState__\s*=\s*(\{.+?\});\s*<\/script>/is);
      if (m2) return JSON.parse(m2[1]);
    } catch { /* ignorieren */ }
    return null;
  }

  /** Sucht rekursiv nach einem Array in einem Objekt */
  _deepFind(obj, keys, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 6) return null;
    for (const key of keys) {
      if (obj[key] && Array.isArray(obj[key]) && obj[key].length > 0) return obj[key];
    }
    for (const val of Object.values(obj)) {
      const found = this._deepFind(val, keys, depth + 1);
      if (found) return found;
    }
    return null;
  }

  _enrichFromNextData(lead, data) {
    // Legacy – wird nicht mehr direkt aufgerufen, bleibt für Kompatibilität
    this._enrichLeadFromPageJson(lead, data, null);
  }

  _parseCount(text) {
    const m = (text || '').replace(/[\s,]/g, '').match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
  }

  // ── HTML-Fallback-Extraktion ───────────────────────────────────────

  _extractFromHtml($) {
    const links = [];
    const seen  = new Set();

    // Alle plausiblen Link-Muster für avito.ma
    const selectors = [
      'a[href*="/fr/annonce/"]',
      'a[href*="/ar/"]',
      'a[href*="/fr/"]',
      'a[href*="avito.ma"]',
      '[class*="listing"] a',
      '[class*="Listing"] a',
      '[class*="ad-"] a',
      '[class*="Ad"] a',
      'article a',
      'li[data-id] a',
    ];

    for (const sel of selectors) {
      $(sel).each((_, el) => {
        const href = $(el).attr('href') || '';
        if (!href || href === '#') return;
        const abs = this._abs(href);
        if (seen.has(abs)) return;
        // Nur Anzeigen/Profil-URLs (keine Nav-Links etc.)
        if (abs.includes('avito.ma/fr/') || abs.includes('avito.ma/ar/')) {
          seen.add(abs);
          const card = $(el).closest('article, li, [class*="item"], [class*="card"]');
          const dateText = card.find('time, [class*="date"], [class*="Date"]').first().text().trim();
          const city     = card.find('[class*="location"], [class*="city"], [class*="Location"]').first().text().trim();
          links.push({
            profileUrl:   abs,
            lastActivity: this._parseRelativeDate(dateText),
            city,
          });
        }
      });
      if (links.length > 0) break; // Erste funktionierende Strategie nutzen
    }

    return links;
  }

  // ── Lead aus Hint-Daten bauen ──────────────────────────────────────

  _buildLeadFromHint(profileUrl, hint) {
    const lead = new Lead();
    lead.source      = 'avito';
    lead.profileUrl  = profileUrl;
    lead.id          = `avito_${this._extractId(profileUrl)}`;

    lead.businessName   = hint.businessName || '';
    lead.city           = hint.city         || '';
    lead.memberSince    = hint.memberSince   || '';
    lead.phone          = hint.phone         || '';
    lead.hasProfilePic  = !!hint.hasProfilePic;
    lead.hasLogo        = lead.hasProfilePic;
    // ⚡ Minimum 1: wenn wir das Listing in der Suche gefunden haben,
    //    gibt es mindestens diese eine Anzeige
    lead.productCount   = hint.productCount  || 1;
    lead.activeListings = lead.productCount;
    // ⚡ Default: Listing in Suche gefunden = heute aktiv
    lead.lastActivity   = hint.lastActivity  || new Date().toISOString();
    lead.sellerType     = hint.sellerType    || 'individual';
    lead.avgPrice       = hint.avgPrice      || 0;
    lead.hasDescription = !!hint.hasDescription;
    // ⚡ Avito-Händler haben standardmäßig keine eigene Website
    lead.hasOwnWebsite  = hint.hasOwnWebsite || false;

    if (hint.category) lead.categories = [hint.category];

    lead.hasBrandedName = this._isBrandedName(lead.businessName);
    return lead;
  }

  // ── URL-Helpers ───────────────────────────────────────────────────

  _buildSearchUrl(category, city, keywords, page) {
    // Avito.ma echte Kategorie-Slugs
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

  _extractId(url) {
    const m = url.match(/\/(\d+)\/?(?:\?|$)/);
    return m ? m[1] : Math.random().toString(36).slice(2, 10);
  }

  _abs(href) {
    if (!href || href === '#') return '';
    if (href.startsWith('http')) return href;
    return `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
  }

  _t($, selectors) {
    for (const s of selectors) {
      try {
        const t = $(s).first().text().trim();
        if (t) return t;
      } catch { /* ignorieren */ }
    }
    return '';
  }

  _parseRelativeDate(text) {
    if (!text) return null;
    const t = text.toLowerCase();
    const now = Date.now();
    if (t.includes("aujourd'hui") || t.includes('today') || t.includes('اليوم'))
      return new Date(now).toISOString();
    if (t.includes('hier') || t.includes('yesterday') || t.includes('أمس'))
      return new Date(now - 86400000).toISOString();
    const d = t.match(/(\d+)\s*(jour|day|يوم)/);
    if (d) return new Date(now - parseInt(d[1]) * 86400000).toISOString();
    const w = t.match(/(\d+)\s*(semaine|week|أسبوع)/);
    if (w) return new Date(now - parseInt(w[1]) * 7 * 86400000).toISOString();
    // ISO-Datum direkt
    if (/\d{4}-\d{2}-\d{2}/.test(text)) return new Date(text).toISOString();
    return null;
  }

  _detectSocial(lead, href) {
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
        !['avito.ma','instagram.com','facebook.com','wa.me','tiktok.com'].some(d => href.includes(d))) {
      lead.hasOwnWebsite = true;
      lead.websiteUrl    = href;
    }
  }

  _isBrandedName(name) {
    if (!name || name.length < 3) return false;
    if (/^(user|seller|vendeur|vendor|membre)\d+$/i.test(name)) return false;
    if (/^\+?\d[\d\s]{8,}$/.test(name)) return false;
    return true;
  }
}

module.exports = AvitoScraper;

