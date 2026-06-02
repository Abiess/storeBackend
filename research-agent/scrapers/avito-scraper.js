/**
 * Avito.ma Scraper – v4 (Datenqualität-Fix)
 *
 * Strategie:
 *  1. Suchergebnis-Seiten laden → componentProps.ads.ads
 *  2. Einzigartige Händler nach seller.id gruppieren
 *  3. Pro Händler: /fr/vendeur/{id} laden → echte Profildaten
 *  4. Max. maxSellers Profile laden (Standard: 150)
 *
 * Fixes gegenüber v3:
 *  - Korrekter JSON-Pfad: componentProps.ads.ads
 *  - phone.number statt phone (war [object Object])
 *  - price.value statt price (war [object Object])
 *  - location ist String "Stadt, Viertel" → korrekt aufgeteilt
 *  - memberSince aus HTML der Profilseite
 *  - productCount = Anzahl Seiten × Ads + Rest
 */

'use strict';

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
    this.maxSellers = 150; // Max. Profil-Besuche pro Lauf
  }

  // ── Haupt-Methode ─────────────────────────────────────────────────

  async scrapeListings(options = {}) {
    const { category = '', city = '', maxPages = 3, keywords = '' } = options;

    // Schritt 1: Eindeutige Händler-IDs aus Suchergebnissen sammeln
    const sellerMap = new Map(); // id → { rawSeller, ads[] }

    for (let page = 1; page <= maxPages; page++) {
      const url = this._buildSearchUrl(category, city, keywords, page);
      this.log(`Suchergebnis Seite ${page}/${maxPages}: ${url}`);

      const html = await this._fetchHtml(url);
      if (!html) { this.warn('Seite nicht ladbar'); break; }

      const ads = this._extractAds(html);
      if (ads.length === 0) { this.log('Keine weiteren Anzeigen.'); break; }
      this.log(`${ads.length} Anzeigen, ${new Set(ads.map(a => a.seller?.id)).size} Händler`);

      for (const ad of ads) {
        const sid = String(ad.seller?.id || '');
        if (!sid) continue;
        if (!sellerMap.has(sid)) {
          sellerMap.set(sid, { rawSeller: ad.seller, ads: [] });
        }
        sellerMap.get(sid).ads.push(ad);
      }
    }

    this.log(`Einzigartige Händler: ${sellerMap.size} → lade Profile...`);

    // Schritt 2: Für jeden Händler das vollständige Profil laden
    const leads = [];
    let count = 0;
    for (const [sellerId, { rawSeller, ads }] of sellerMap) {
      if (count >= this.maxSellers) {
        this.log(`Max. ${this.maxSellers} Profil-Besuche erreicht – Abbruch`);
        break;
      }
      count++;

      try {
        const lead = await this._buildProfileLead(sellerId, rawSeller, ads);
        if (lead) leads.push(lead);
      } catch (err) {
        this.warn(`Händler ${sellerId}: ${err.message}`);
        // Fallback: Lead aus Suchergebnis-Daten bauen
        const fallback = this._buildFallbackLead(sellerId, rawSeller, ads);
        if (fallback) leads.push(fallback);
      }
    }

    return leads;
  }

  // ── Profil-Seite laden und Lead bauen ────────────────────────────

  async _buildProfileLead(sellerId, rawSeller, searchAds) {
    const profileUrl = `${this.baseUrl}/fr/vendeur/${sellerId}`;
    const html       = await this._fetchHtml(profileUrl);

    const lead = new Lead();
    lead.source     = 'avito';
    lead.id         = `avito_${sellerId}`;
    lead.profileUrl = profileUrl;
    lead.scrapedAt  = new Date().toISOString();
    lead.country    = 'MA';

    // ── Grunddaten aus Suchergebnis (bereits bekannt) ──────────────
    this._applySellerData(lead, rawSeller, searchAds);

    if (!html) return lead; // Profil nicht ladbar → Fallback reicht

    // ── Profil-JSON ────────────────────────────────────────────────
    const profileAds = this._extractAds(html);
    if (profileAds.length > 0) {
      // Seller-Daten aus Profil-Ads überschreiben (mehr Details möglich)
      this._applySellerData(lead, profileAds[0].seller || rawSeller, profileAds);
    }

    // Gesamte Produktanzahl = Anzahl Anzeigen auf der Profilseite
    // (Avito zeigt auf Profilseite alle aktuellen Anzeigen, paginiert)
    lead.productCount   = Math.max(lead.productCount, profileAds.length);
    lead.activeListings = lead.productCount;

    // ── HTML-Extraktion für Felder die nicht im JSON sind ──────────
    const $ = cheerio.load(html);
    this._enrichFromProfileHtml(lead, $);

    return lead;
  }

  _buildFallbackLead(sellerId, rawSeller, searchAds) {
    const lead = new Lead();
    lead.source     = 'avito';
    lead.id         = `avito_${sellerId}`;
    lead.profileUrl = `${this.baseUrl}/fr/vendeur/${sellerId}`;
    lead.scrapedAt  = new Date().toISOString();
    lead.country    = 'MA';
    this._applySellerData(lead, rawSeller, searchAds);
    return lead;
  }

  // ── Seller-Daten aus JSON-Feldern korrekt extrahieren ────────────

  _applySellerData(lead, seller, ads) {
    if (!seller) return;

    // Name
    if (!lead.businessName && seller.name) lead.businessName = seller.name;

    // Telefon: seller.phone ist { number: "...", verified: bool }
    if (!lead.phone) {
      const p = seller.phone;
      if (typeof p === 'string')           lead.phone = p;
      else if (p && typeof p === 'object') lead.phone = p.number || p.value || '';
    }

    // Profilbild
    if (!lead.hasProfilePic && (seller.img || seller.avatar || seller.photo)) {
      lead.hasProfilePic = true;
      lead.hasLogo       = true;
    }

    // Händlertyp
    const type = (seller.type || '').toUpperCase();
    if (type === 'STORE' || type === 'SHOP' || type === 'PRO') {
      lead.sellerType = 'business';
    } else if (type === 'PROFESSIONAL') {
      lead.sellerType = 'pro';
    } else {
      lead.sellerType = lead.sellerType || 'individual';
    }

    // Aus den Anzeigen: Stadt, Kategorie, Datum, Preis
    if (ads && ads.length > 0) {
      // productCount = Anzeigen dieses Händlers die wir gesehen haben
      lead.productCount   = Math.max(lead.productCount, ads.length);
      lead.activeListings = lead.productCount;

      // Neueste Anzeige = letzte Aktivität
      const firstAd = ads[0];

      // Stadt: ad.location ist ein String z.B. "Fès, Hay Saada"
      if (!lead.city && firstAd.location) {
        const parts = String(firstAd.location).split(',');
        lead.city   = parts[0].trim();
        if (parts[1]) lead.region = parts[1].trim();
      }

      // Datum der Anzeige (relativ)
      if (!lead.lastActivity && firstAd.date) {
        lead.lastActivity = this._parseRelDate(String(firstAd.date));
      }
      if (!lead.lastActivity) lead.lastActivity = new Date().toISOString();

      // Preis: ad.price ist { value: 1900, currency: "DH" }
      if (!lead.avgPrice && firstAd.price) {
        const pr = firstAd.price;
        lead.avgPrice = typeof pr === 'number' ? pr
          : (pr && typeof pr === 'object') ? (pr.value || pr.amount || 0)
          : 0;
        lead.currency = (pr && pr.currency) ? pr.currency : 'MAD';
      }

      // Kategorien aus Anzeigen
      const cats = new Set();
      for (const ad of ads.slice(0, 5)) {
        const cat = ad.category?.name || ad.category?.formatted || '';
        if (cat) cats.add(cat.split('-').pop().trim());
      }
      if (cats.size > 0) lead.categories = [...cats];
    }

    lead.hasBrandedName = this._isBrandedName(lead.businessName);
    lead.hasOwnWebsite  = false; // Avito-Händler haben standardmäßig keinen eigenen Shop
  }

  // ── HTML-Felder die nicht im JSON verfügbar sind ──────────────────

  _enrichFromProfileHtml(lead, $) {
    // Mitglied seit (typischerweise im HTML sichtbar)
    if (!lead.memberSince) {
      const memberSinceText = [
        '[class*="member"] [class*="since"]',
        '[class*="memberSince"]',
        '[class*="joinDate"]',
        '[class*="inscription"]',
        '[class*="Inscription"]',
      ].reduce((acc, sel) => acc || $(sel).first().text().trim(), '');
      if (memberSinceText) {
        lead.memberSince = memberSinceText
          .replace(/Membre depuis|منذ|Member since|Inscrit le|Inscrit depuis/gi, '')
          .trim();
      }
    }

    // Beschreibung / Shop-Bio
    if (!lead.hasDescription) {
      const desc = [
        '[class*="description"]',
        '[class*="about"]',
        '[class*="bio"]',
        '[class*="shopDescription"]',
      ].reduce((acc, sel) => acc || $(sel).first().text().trim(), '');
      if (desc && desc.length > 10) {
        lead.hasDescription = true;
        lead.description    = desc.slice(0, 300);
      }
    }

    // Social-Media-Links & Website
    $('a[href]').each((_, el) => {
      this._detectSocial(lead, $(el).attr('href'));
    });

    // Gesamte Anzeigenanzahl (falls als Text sichtbar)
    const totalAdsText = [
      '[class*="adCount"]',
      '[class*="nbAds"]',
      '[class*="listings-count"]',
      '[class*="total"]',
    ].reduce((acc, sel) => acc || $(sel).first().text().trim(), '');
    if (totalAdsText) {
      const n = parseInt(totalAdsText.replace(/\D/g, ''), 10);
      if (n > lead.productCount) {
        lead.productCount   = n;
        lead.activeListings = n;
      }
    }
  }

  // ── JSON extrahieren ──────────────────────────────────────────────

  _extractAds(html) {
    try {
      const m = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/i);
      if (!m) return this._extractAdsFromHtml(html);
      const data = JSON.parse(m[1]);
      // Korrekter Pfad: componentProps.ads.ads
      const ads =
        data?.props?.pageProps?.componentProps?.ads?.ads ||
        data?.pageProps?.componentProps?.ads?.ads ||
        [];
      return Array.isArray(ads) ? ads : [];
    } catch {
      return [];
    }
  }

  _extractAdsFromHtml(html) {
    // Fallback: Links aus HTML
    const $ = cheerio.load(html);
    const results = [];
    $('a[href*="/fr/annonce/"], a[href*="/fr/vendeur/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('/vendeur/')) {
        const m = href.match(/\/vendeur\/(\d+)/);
        if (m) results.push({ seller: { id: m[1], name: $(el).text().trim() } });
      }
    });
    return results;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  async _fetchHtml(url) {
    try {
      const res = await this.get(url);
      return res.data;
    } catch (err) {
      this.warn(`Fetch fehlgeschlagen: ${url} – ${err.message}`);
      return null;
    }
  }

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

  _parseRelDate(text) {
    if (!text) return new Date().toISOString();
    const t = text.toLowerCase();
    const now = Date.now();
    if (t.includes("aujourd'hui") || t.includes('today')     || t.includes('اليوم')) return new Date(now).toISOString();
    if (t.includes('hier')        || t.includes('yesterday') || t.includes('أمس'))   return new Date(now - 86400000).toISOString();
    const h = t.match(/il y a (\d+) heure/); if (h) return new Date(now - parseInt(h[1]) * 3600000).toISOString();
    const d = t.match(/(\d+)\s*(jour|day|يوم)/);  if (d) return new Date(now - parseInt(d[1]) * 86400000).toISOString();
    const w = t.match(/(\d+)\s*(semaine|week)/);   if (w) return new Date(now - parseInt(w[1]) * 7 * 86400000).toISOString();
    if (/\d{4}-\d{2}-\d{2}/.test(text)) return new Date(text).toISOString();
    return new Date().toISOString();
  }

  _detectSocial(lead, href) {
    if (!href || typeof href !== 'string') return;
    if (href.includes('instagram.com')) {
      lead.hasInstagram = true;
      const m = href.match(/instagram\.com\/([^/?&#]+)/);
      if (m && !['p', 'reel', 'stories'].includes(m[1])) lead.instagramHandle = m[1];
    }
    if (href.includes('facebook.com'))  { lead.hasFacebook  = true; lead.facebookUrl = href; }
    if (href.includes('wa.me') || href.includes('api.whatsapp')) {
      lead.hasWhatsAppBusiness = true;
      const m = href.match(/wa\.me\/(\d+)/);
      if (m && !lead.whatsapp) lead.whatsapp = `+${m[1]}`;
    }
    if (href.includes('tiktok.com')) lead.hasTikTok = true;
    if (href.match(/^https?:\/\//) &&
        !['avito.ma','instagram.com','facebook.com','wa.me','tiktok.com','whatsapp.com'].some(d => href.includes(d))) {
      lead.hasOwnWebsite = true;
      if (!lead.websiteUrl) lead.websiteUrl = href;
    }
  }

  _isBrandedName(name) {
    if (!name || name.length < 3) return false;
    if (/^(user|seller|vendeur|vendor|membre|عضو)\s*\d*$/i.test(name.trim())) return false;
    if (/^\+?\d[\d\s]{8,}$/.test(name)) return false;
    return true;
  }
}

module.exports = AvitoScraper;

