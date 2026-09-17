import { AppNavConfig } from '@app/shared/components/app-navigation/app-navigation.component';

/**
 * LOYALTY-App-Navigationskonfiguration – reine Daten, keine eigene
 * `LoyaltyNavComponent` (Faktortest App Factory: derselbe generische
 * `AppNavigationComponent`, den DHL/MARITIME bereits verwenden).
 *
 * LOYALTY ist wie DHL eine STORE-Scope-App (`scoped` bleibt default
 * `true`): `appSegment` + `legacySegment` sorgen dafür, dass
 * `resolveAppBasePath()` konsistent innerhalb derselben Routen-Familie
 * bleibt, mit der die Seite aufgerufen wurde (`/apps/loyalty/:storeId`
 * bzw. Legacy-Alias `/stores/:storeId/loyalty`).
 */
export const LOYALTY_NAV_CONFIG: AppNavConfig = {
  appSegment: 'loyalty',
  legacySegment: 'loyalty',
  items: [
    { key: 'overview', labelKey: 'loyalty.nav.overview', icon: '🎁', route: '' },
    { key: 'account', labelKey: 'app.account.title', icon: '👤', route: 'account' }
  ]
};
