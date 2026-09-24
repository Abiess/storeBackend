/**
 * Lead-Datenmodell – erweitert um Händler-Finder-Felder + Tier-System + SaaS-Fit
 */

class Lead {
  constructor() {
    // ── Identifikation ──────────────────────────────────────────────────
    this.id            = '';         // Eindeutige ID (source_profileId)
    this.source        = '';         // avito | opensooq | jumia | instagram
    this.profileUrl    = '';         // Öffentliche Profil-URL
    this.scrapedAt     = new Date().toISOString();

    // ── Tier-Klassifikation (nach Produktanzahl) ────────────────────────
    // IGNORED (<5) | BASIC (5–9) | PRIORITY (10–19) | HOT_LEAD (≥20)
    this.tier          = '';
    this.tierEmoji     = '';

    // ── SaaS-Fit-Score ──────────────────────────────────────────────────
    this.saasScore     = 0;          // 0–100
    this.saasLabel     = '';         // HIGH_FIT | MEDIUM_FIT | LOW_FIT | NO_FIT
    this.saasEmoji     = '';
    this.saasReason    = '';

    // ── Hot-Lead Produktdaten (nur für tier === HOT_LEAD) ───────────────
    // Jedes Objekt: { title, description, price, currency, category, imageUrls[], adUrl }
    this.hotProducts   = [];
    this.importReady   = false;      // true wenn imageUrls vorhanden → automatischer Import möglich

    // ── Geschäftsinformationen (öffentlich sichtbar) ────────────────────
    this.businessName  = '';
    this.sellerType    = '';         // individual | business | pro
    this.city          = '';
    this.region        = '';
    this.country       = 'MA';
    this.phone         = '';         // Nur wenn öffentlich angezeigt
    this.whatsapp      = '';
    this.email         = '';         // Nur wenn öffentlich angezeigt
    this.description   = '';
    this.memberSince   = '';
    this.hasProfilePic = false;

    // ── Produkt-/Anzeigendaten ──────────────────────────────────────────
    this.productCount  = 0;
    this.activeListings= 0;
    this.categories    = [];         // Produktkategorien
    this.avgPrice      = 0;
    this.currency      = 'MAD';
    this.lastActivity  = null;       // Datum der letzten Anzeige

    // ── Online-Präsenz ──────────────────────────────────────────────────
    this.hasOwnWebsite    = false;
    this.websiteUrl       = '';
    this.hasInstagram     = false;
    this.instagramHandle  = '';
    this.instagramFollowers = 0;
    this.hasFacebook      = false;
    this.facebookUrl      = '';
    this.hasTikTok        = false;
    this.hasWhatsAppBusiness = false;

    // ── Branding-Indikatoren ────────────────────────────────────────────
    this.hasLogo          = false;
    this.hasBrandedName   = false;   // Kein "user123"-Style
    this.hasDescription   = false;
    this.responseRate     = '';      // falls öffentlich

    // ── Lead-Score (markt.ma Scoring) ──────────────────────────────────
    this.totalScore           = 0;   // 0–100
    this.scoreBreakdown       = {};
    this.leadCategory         = '';  // HOT | WARM | MEDIUM | COLD
    this.leadEmoji            = '';
    this.potentialRevenue     = '';  // LOW | MEDIUM | HIGH | VERY_HIGH
    this.recommendedAction    = '';
    this.notes                = [];

    // ── Conversion-Potenzial (Händler-Finder) ───────────────────────────
    this.conversionScore  = 0;       // 0–100: Wahrscheinlichkeit Shop zu eröffnen
    this.conversionLabel  = '';      // SEHR_HOCH | HOCH | MITTEL | GERING
    this.conversionEmoji  = '';
    this.conversionReason = '';      // Kurze Begründung
    this.outreachChannel  = '';      // Empfohlener Kontaktkanal
  }

  toCSVRow() {
    return {
      // Tier + SaaS-Fit zuerst (wichtigste Felder)
      tierEmoji:         this.tierEmoji,
      tier:              this.tier,
      saasEmoji:         this.saasEmoji,
      saasLabel:         this.saasLabel,
      saasScore:         this.saasScore,
      saasReason:        this.saasReason,
      importReady:       this.importReady ? 'JA' : 'NEIN',
      hotProductsCount:  this.hotProducts ? this.hotProducts.length : 0,
      hotProductImages:  this.hotProducts
        ? this.hotProducts.reduce((sum, p) => sum + (p.imageUrls ? p.imageUrls.length : 0), 0)
        : 0,
      conversionEmoji:   this.conversionEmoji,
      conversionLabel:   this.conversionLabel,
      conversionScore:   this.conversionScore,
      conversionReason:  this.conversionReason,
      leadEmoji:         this.leadEmoji,
      leadCategory:      this.leadCategory,
      totalScore:        this.totalScore,
      source:            this.source,
      businessName:      this.businessName,
      sellerType:        this.sellerType,
      city:              this.city,
      region:            this.region,
      phone:             this.phone,
      whatsapp:          this.whatsapp,
      memberSince:       this.memberSince,
      productCount:      this.productCount,
      activeListings:    this.activeListings,
      categories:        this.categories.join(' | '),
      avgPrice:          this.avgPrice,
      currency:          this.currency,
      lastActivity:      this.lastActivity || '',
      hasOwnWebsite:     this.hasOwnWebsite ? 'JA' : 'NEIN',
      websiteUrl:        this.websiteUrl,
      hasInstagram:      this.hasInstagram ? 'JA' : 'NEIN',
      instagramHandle:   this.instagramHandle,
      instagramFollowers:this.instagramFollowers,
      hasFacebook:       this.hasFacebook ? 'JA' : 'NEIN',
      hasTikTok:         this.hasTikTok ? 'JA' : 'NEIN',
      hasWhatsAppBusiness: this.hasWhatsAppBusiness ? 'JA' : 'NEIN',
      hasLogo:           this.hasLogo ? 'JA' : 'NEIN',
      hasDescription:    this.hasDescription ? 'JA' : 'NEIN',
      outreachChannel:   this.outreachChannel,
      recommendedAction: this.recommendedAction,
      notes:             this.notes.join(' | '),
      profileUrl:        this.profileUrl,
      scrapedAt:         this.scrapedAt,
      scoreBreakdown:    JSON.stringify(this.scoreBreakdown),
    };
  }
}

module.exports = Lead;
