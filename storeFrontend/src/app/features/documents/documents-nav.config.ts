import { AppNavConfig } from '@app/shared/components/app-navigation/app-navigation.component';

/**
 * DOCUMENTS-App-Navigationskonfiguration – reine Daten, keine eigene
 * `DocumentsNavComponent` (siehe Faktortest MARITIME/DHL: derselbe
 * generische `AppNavigationComponent`).
 *
 * DOCUMENTS ist eine GLOBAL-Scope-App (kein `storeId`/Context): `scoped:
 * false` sorgt dafür, dass `resolveAppBasePath()` die Basis-Route literal
 * als `/apps/documents` auflöst (kein dynamisches Context-Segment, keine
 * Context-Auswahl-Route nötig).
 */
export const DOCUMENTS_NAV_CONFIG: AppNavConfig = {
  appSegment: 'documents',
  scoped: false,
  items: [
    { key: 'overview', labelKey: 'documents.nav.overview', icon: '📄', route: '' },
    { key: 'account', labelKey: 'documents.nav.account', icon: '👤', route: 'account' }
  ]
};
