export const environment = {
  production: false,
  useMockData: false,
  apiUrl: 'http://localhost:8080/api',
  publicApiUrl: 'http://localhost:8080/api/public',
  whatsappNumber: '+212675522961',

  /**
   * Meta/Facebook Pixel ID.
   * Leer ('') = Pixel komplett deaktiviert (no-op), kein Script wird geladen.
   * TODO: Consent-Gate davor schalten bevor in Prod aktiviert wird (DSGVO/RGPD).
   */
  metaPixelId: '',

  /**
   * Microsoft Clarity Projekt-ID.
   * Leer ('') = Clarity komplett deaktiviert – kein Script, kein Tracking.
   * DEV: Bewusst leer gelassen – Tracking NUR in Production aktiv.
   * PROD: ID aus https://clarity.microsoft.com → Einstellungen → Projekt-ID eintragen.
   * Beispiel: clarityId: 'abc123xyz'
   */
  clarityId: '',

  /**
   * Clarity Cookie Masking / IP-Anonymisierung.
   * true  = IP-Adressen und sensible Daten werden maskiert (DSGVO-konform)
   * false = Volle Daten ohne Maskierung (für Debugging/Entwicklung)
   * DEFAULT: false (volle Daten anzeigen)
   */
  clarityMaskData: false,

  /**
   * CAPTCHA Configuration (Bot-Schutz für Registrierung, Login, Password-Reset)
   * Provider: 'hcaptcha' (empfohlen, DSGVO-konform) oder 'recaptcha'
   * 
   * hCaptcha Setup:
   * 1. https://www.hcaptcha.com/ → Register → Sites → New Site
   * 2. Kopiere SITE KEY (sichtbar, für Frontend)
   * 3. Kopiere SECRET KEY (geheim, für Backend Environment Variable)
   * 
   * Development: enabled = false (Skip CAPTCHA)
   */
  captcha: {
    enabled: false,
    provider: 'hcaptcha' as 'hcaptcha' | 'recaptcha',
    siteKey: '' // Development: leer = kein CAPTCHA
  }
};
