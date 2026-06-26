export const environment = {
  production: true,
  useMockData: false,
  apiUrl: 'https://api.markt.ma/api',
  publicApiUrl: 'https://api.markt.ma/api/public',
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
  clarityMaskData: false
};
