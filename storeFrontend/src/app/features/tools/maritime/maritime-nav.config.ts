import { AppNavConfig } from '@app/shared/components/app-navigation/app-navigation.component';

/**
 * MARITIME-App-Navigationskonfiguration – reine Daten, keine eigene
 * `MaritimeNavComponent` (Faktortest: derselbe generische
 * `AppNavigationComponent`, den DHL bereits verwendet).
 *
 * MARITIME ist eine GLOBAL-Scope-App (kein `storeId`/Context): `scoped:
 * false` sorgt dafür, dass `resolveAppBasePath()` die Basis-Route literal
 * als `/apps/maritime` auflöst (kein dynamisches Context-Segment). Die
 * bestehende, bereits produktiv genutzte Route `/tools/maritime` bleibt als
 * Legacy-Alias über `legacyBasePath` erreichbar.
 */
export const MARITIME_NAV_CONFIG: AppNavConfig = {
  appSegment: 'maritime',
  scoped: false,
  legacyBasePath: '/tools/maritime',
  items: [
    { key: 'overview', labelKey: 'maritime.nav.overview', icon: '⚓', route: '' },
    { key: 'account', labelKey: 'app.account.title', icon: '👤', route: 'account' }
  ]
};
