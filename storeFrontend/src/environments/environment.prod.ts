export const environment = {
  production: true,
  useMockData: false,
  apiUrl: 'https://api.markt.ma/api',
  publicApiUrl: 'https://api.markt.ma/api/public',
  assetsBaseUrl: 'https://api.markt.ma',
  whatsappNumber: '+212675522961',

  /**
   * Meta Pixel ID für Production.
   * Leer ('') = kein Pixel, kein Script wird geladen.
   * TODO: Erst nach DSGVO/RGPD-Consent-Implementation befüllen.
   * Beispiel: metaPixelId: '1234567890123456'
   */
  metaPixelId: '',

  /**
   * Microsoft Clarity Projekt-ID (Production).
   * Wird über ClarityService dynamisch geladen (nur in production, nur wenn ID gesetzt).
   * CI: GitHub Secret CLARITY_ID → deploy.yml ersetzt __CLARITY_ID__ via sed vor dem Build.
   */
  clarityId: '__CLARITY_ID__',

  /**
   * Clarity Cookie Masking / IP-Anonymisierung (Production).
   * true  = IP-Adressen und sensible Daten werden maskiert (DSGVO-konform)
   * false = Volle Daten ohne Maskierung (für Debugging)
   * DEFAULT: false (volle Daten anzeigen)
   * 
   * HINWEIS: Diese Einstellung steuert den "cookieMask" Parameter beim Clarity-Init.
   * Siehe: https://learn.microsoft.com/en-us/clarity/setup-and-installation/cookie-masking
   */
  clarityMaskData: false,

  /**
   * CAPTCHA Configuration (Production)
   * Provider: 'hcaptcha' (empfohlen, DSGVO-konform) oder 'recaptcha'
   * 
   * hCaptcha Setup:
   * 1. https://www.hcaptcha.com/ → Register → Sites → New Site
   * 2. Domain: markt.ma (+ optional Subdomains: *.markt.ma)
   * 3. Kopiere SITE KEY (hier eintragen)
   * 4. Kopiere SECRET KEY (Backend: CAPTCHA_SECRET Environment Variable)
   * 
   * WICHTIG für lokale Tests (localhost):
   * - Verwende hCaptcha Test Site Key: 10000000-ffff-ffff-ffff-000000000001
   * - Dieser Key zeigt CAPTCHA an, aber lässt alle Verifikationen durch
   * - Für echte Tests auf markt.ma: GitHub Secret HCAPTCHA_SITE_KEY → wird via sed ersetzt
   */
  captcha: {
    enabled: true,
    provider: 'hcaptcha' as 'hcaptcha' | 'recaptcha',
    siteKey: '__HCAPTCHA_SITE_KEY__' // CI: wird durch deploy.yml ersetzt, lokal: Test-Key verwenden
  }
};
