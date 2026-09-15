import { AppNavConfig } from '@app/shared/components/app-navigation/app-navigation.component';

/**
 * DHL-App-Navigationskonfiguration – reine Daten, keine eigene Komponente.
 * Entspricht dem Zielbild:
 * ```
 * {
 *   app: 'DHL',
 *   navigation: [
 *     { key: 'overview', route: '' },
 *     { key: 'store', route: 'store' },
 *     { key: 'pickup', route: 'pickup' },
 *     { key: 'plan', route: 'plan' },
 *     { key: 'account', route: 'account' }
 *   ]
 * }
 * ```
 * `appSegment`/`legacySegment` steuern über `resolveAppBasePath()`, dass die
 * Navigation konsistent in derselben Routen-Familie bleibt, mit der die
 * Seite aufgerufen wurde (`/apps/dhl/:storeId` bzw. Legacy-Alias
 * `/stores/:storeId/dhl`).
 */
export const DHL_NAV_CONFIG: AppNavConfig = {
  appSegment: 'dhl',
  legacySegment: 'dhl',
  items: [
    { key: 'overview', labelKey: 'dhl.nav.overview', icon: '🏠', route: '' },
    { key: 'store', labelKey: 'dhl.nav.store', icon: '📥', route: 'store' },
    { key: 'pickup', labelKey: 'dhl.nav.pickup', icon: '📤', route: 'pickup' },
    { key: 'plan', labelKey: 'dhl.nav.plan', icon: '📋', route: 'plan' },
    { key: 'account', labelKey: 'dhl.nav.account', icon: '👤', route: 'account' }
  ]
};
