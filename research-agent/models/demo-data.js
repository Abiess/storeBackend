/**
 * Demo-Datengenerator
 * Erstellt realistische Beispiel-Leads ohne echte HTTP-Requests.
 * Nützlich zum Testen der Scoring-Logik und des CSV-Exports.
 */

const Lead = require('../models/lead');

const DEMO_LEADS = [
  {
    source: 'avito', businessName: 'Boutique Fatima – Mode Casablanca', city: 'Casablanca',
    sellerType: 'business', productCount: 87, activeListings: 82,
    memberSince: '2022-03-15', hasProfilePic: true, hasLogo: true,
    hasDescription: true, hasBrandedName: true,
    categories: ['Mode Femme', 'Chaussures', 'Sacs'],
    lastActivity: new Date(Date.now() - 1 * 86400000).toISOString(),
    hasInstagram: true, instagramHandle: 'boutique_fatima_casa', instagramFollowers: 4200,
    hasFacebook: true, hasWhatsAppBusiness: true, whatsapp: '+212661234567',
    hasOwnWebsite: false, profileUrl: 'https://www.avito.ma/fr/vendeur/123456',
  },
  {
    source: 'avito', businessName: 'Électronique Plus Rabat', city: 'Rabat',
    sellerType: 'pro', productCount: 234, activeListings: 210,
    memberSince: '2021-07-01', hasProfilePic: true, hasLogo: true,
    hasDescription: true, hasBrandedName: true,
    categories: ['Smartphones', 'Tablettes', 'Accessoires', 'Ordinateurs'],
    lastActivity: new Date(Date.now() - 3600000).toISOString(), // Heute
    hasInstagram: true, instagramHandle: 'electronique_plus_ma', instagramFollowers: 8900,
    hasFacebook: true, hasWhatsAppBusiness: true, whatsapp: '+212662345678',
    hasTikTok: true,
    hasOwnWebsite: false, profileUrl: 'https://www.avito.ma/fr/vendeur/234567',
  },
  {
    source: 'opensooq', businessName: 'Mohamed Artisanat Marrakech', city: 'Marrakech',
    sellerType: 'individual', productCount: 12, activeListings: 10,
    memberSince: '2023-01-20', hasProfilePic: false, hasLogo: false,
    hasDescription: false, hasBrandedName: true,
    categories: ['Artisanat', 'Décoration', 'Bijoux'],
    lastActivity: new Date(Date.now() - 5 * 86400000).toISOString(),
    hasInstagram: false, hasFacebook: false, hasWhatsAppBusiness: true, whatsapp: '+212663456789',
    hasOwnWebsite: false, profileUrl: 'https://ma.opensooq.com/post/123',
  },
  {
    source: 'opensooq', businessName: 'Jardin Bio Maroc – Produits Naturels', city: 'Fès',
    sellerType: 'business', productCount: 45, activeListings: 44,
    memberSince: '2022-09-10', hasProfilePic: true, hasLogo: true,
    hasDescription: true, hasBrandedName: true,
    categories: ['Bio', 'Cosmétiques Naturels', 'Alimentation'],
    lastActivity: new Date(Date.now() - 2 * 86400000).toISOString(),
    hasInstagram: true, instagramHandle: 'jardinbiomaroc', instagramFollowers: 15600,
    hasFacebook: true, hasWhatsAppBusiness: true, hasTikTok: true,
    hasOwnWebsite: false, websiteUrl: 'https://www.instagram.com/jardinbiomaroc', // Nur Social-Link
    profileUrl: 'https://ma.opensooq.com/post/456',
  },
  {
    source: 'jumia', businessName: 'TechVision Store', city: 'Casablanca',
    sellerType: 'business', productCount: 156, activeListings: 156,
    memberSince: '2020-05-12', hasProfilePic: true, hasLogo: true,
    hasDescription: true, hasBrandedName: true,
    categories: ['Électronique', 'Smartphones', 'Gaming'],
    lastActivity: new Date(Date.now() - 86400000).toISOString(),
    hasInstagram: true, instagramHandle: 'techvision_ma', instagramFollowers: 22000,
    hasFacebook: true, hasWhatsAppBusiness: true,
    hasOwnWebsite: false, profileUrl: 'https://www.jumia.ma/seller/techvision',
    notes: ['Aktiver Jumia-Händler → kennt E-Commerce-Konzept'],
  },
  {
    source: 'instagram', businessName: 'Souk Beldi Artisanat', city: 'Marrakech',
    sellerType: 'business', productCount: 320, activeListings: 320,
    instagramHandle: 'soukbeldi_ma', instagramFollowers: 51000,
    hasInstagram: true, hasFacebook: true, hasWhatsAppBusiness: true,
    hasProfilePic: true, hasLogo: true, hasDescription: true, hasBrandedName: true,
    categories: ['Artisanat', 'Décoration', 'Mobilier'],
    lastActivity: new Date(Date.now() - 12 * 3600000).toISOString(),
    hasOwnWebsite: false, profileUrl: 'https://www.instagram.com/soukbeldi_ma',
    memberSince: '2019-04-01',
  },
  {
    source: 'avito', businessName: 'user78432', city: 'Agadir',
    sellerType: 'individual', productCount: 3, activeListings: 3,
    memberSince: '2025-11-01', hasProfilePic: false, hasLogo: false,
    hasDescription: false, hasBrandedName: false,
    categories: ['Divers'],
    lastActivity: new Date(Date.now() - 45 * 86400000).toISOString(),
    hasInstagram: false, hasFacebook: false, hasWhatsAppBusiness: false,
    hasOwnWebsite: false, profileUrl: 'https://www.avito.ma/fr/vendeur/789012',
  },
  {
    source: 'opensooq', businessName: 'Chaussures & Maroquinerie Atlas', city: 'Casablanca',
    sellerType: 'business', productCount: 68, activeListings: 65,
    memberSince: '2021-02-28', hasProfilePic: true, hasLogo: true,
    hasDescription: true, hasBrandedName: true,
    categories: ['Chaussures', 'Sacs', 'Ceintures', 'Accessoires Mode'],
    lastActivity: new Date(Date.now() - 1 * 86400000).toISOString(),
    hasInstagram: true, instagramHandle: 'atlas_chaussures', instagramFollowers: 3100,
    hasFacebook: true, hasWhatsAppBusiness: true, whatsapp: '+212664567890',
    hasOwnWebsite: false, profileUrl: 'https://ma.opensooq.com/post/789',
  },
];

function generateDemoLeads() {
  return DEMO_LEADS.map(data => {
    const lead = new Lead();
    Object.assign(lead, data);
    lead.id         = lead.id || `${data.source}_demo_${Math.random().toString(36).slice(2, 8)}`;
    lead.currency   = 'MAD';
    lead.country    = 'MA';
    lead.scrapedAt  = new Date().toISOString();
    if (!lead.notes) lead.notes = [];
    return lead;
  });
}

module.exports = generateDemoLeads;

