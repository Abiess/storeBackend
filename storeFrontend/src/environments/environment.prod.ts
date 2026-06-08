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
   * ⚠️  NICHT hier direkt eintragen – wird zur Build-Zeit durch GitHub Actions Secret ersetzt.
   * GitHub Secret: CLARITY_ID → Settings → Secrets and variables → Actions → New repository secret
   * Der Platzhalter __CLARITY_ID__ wird in deploy.yml via sed ersetzt.
   * Deaktivieren: CLARITY_ID Secret leer lassen oder entfernen.
   */
  clarityId: '__CLARITY_ID__'
};
