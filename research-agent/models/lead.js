/**
 * Lead-Datenmodell
 * Enthält alle gesammelten öffentlichen Informationen eines Händlers.
 */

class Lead {
  constructor() {
    // ── Identifikation ──────────────────────────────────────────────────
    this.id            = '';         // Eindeutige ID (source_profileId)
    this.source        = '';         // avito | opensooq | jumia | instagram
    this.profileUrl    = '';         // Öffentliche Profil-URL
    this.scrapedAt     = new Date().toISOString();

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
    this.brandingScore    = 0;       // 0–5 (intern)
    this.hasLogo          = false;
    this.hasBrandedName   = false;   // Kein "user123"-Style
    this.hasDescription   = false;
    this.responseRate     = '';      // falls öffentlich

    // ── Lead-Score (wird vom Scorer gesetzt) ───────────────────────────
    this.totalScore           = 0;   // 0–100
    this.scoreBreakdown       = {};
    this.leadCategory         = '';  // HOT | WARM | MEDIUM | COLD
    this.leadEmoji            = '';
    this.potentialRevenue     = '';  // LOW | MEDIUM | HIGH | VERY_HIGH
    this.recommendedAction    = '';
    this.notes                = [];
  }

  toCSVRow() {
    return {
      id:               this.id,
      source:           this.source,
      profileUrl:       this.profileUrl,
      scrapedAt:        this.scrapedAt,
      businessName:     this.businessName,
      sellerType:       this.sellerType,
      city:             this.city,
      region:           this.region,
      phone:            this.phone,
      whatsapp:         this.whatsapp,
      email:            this.email,
      memberSince:      this.memberSince,
      productCount:     this.productCount,
      activeListings:   this.activeListings,
      categories:       this.categories.join(' | '),
      avgPrice:         this.avgPrice,
      currency:         this.currency,
      lastActivity:     this.lastActivity || '',
      hasOwnWebsite:    this.hasOwnWebsite ? 'JA' : 'NEIN',
      websiteUrl:       this.websiteUrl,
      hasInstagram:     this.hasInstagram ? 'JA' : 'NEIN',
      instagramHandle:  this.instagramHandle,
      instagramFollowers: this.instagramFollowers,
      hasFacebook:      this.hasFacebook ? 'JA' : 'NEIN',
      hasTikTok:        this.hasTikTok ? 'JA' : 'NEIN',
      hasWhatsAppBusiness: this.hasWhatsAppBusiness ? 'JA' : 'NEIN',
      hasLogo:          this.hasLogo ? 'JA' : 'NEIN',
      hasDescription:   this.hasDescription ? 'JA' : 'NEIN',
      totalScore:       this.totalScore,
      scoreBreakdown:   JSON.stringify(this.scoreBreakdown),
      leadCategory:     this.leadCategory,
      leadEmoji:        this.leadEmoji,
      potentialRevenue: this.potentialRevenue,
      recommendedAction: this.recommendedAction,
      notes:            this.notes.join(' | '),
    };
  }
}

module.exports = Lead;

