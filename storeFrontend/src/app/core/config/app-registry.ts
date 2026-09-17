import { AppKey } from '../models';

/**
 * Skalierungs-Dimension einer App:
 * - 'STORE'  → App ist an einen technischen Kontext gebunden (heute: storeId).
 * - 'GLOBAL' → App hat genau einen (impliziten) Kontext, keine Auswahl nötig.
 *
 * Rein deskriptiv für UI/Routing – KEINE Berechtigungslogik.
 */
export type AppScope = 'STORE' | 'GLOBAL';

/**
 * Darstellungs-/Routing-Metadaten einer App für App-Launcher, App-Switcher
 * und Context-Auswahl. Enthält bewusst KEINE Zugriffsentscheidung – wer
 * welche App/Context nutzen darf, kommt ausschließlich aus
 * `AuthService.getCurrentUser().apps` (Backend-Entitlements), ausgewertet
 * über `AppContextService`/`AppAccessService`.
 */
export interface AppRegistryEntry {
  key: AppKey;
  /** i18n-Key für den Kartentitel im App-Launcher/-Switcher. */
  titleKey: string;
  /** Optionaler i18n-Key für eine kurze Beschreibung im Launcher. */
  descriptionKey?: string;
  icon: string;
  /**
   * Basis-Route der App. Bei `scope: 'STORE'` UND
   * `contextSelectorSupported: true` ist dies zugleich die bare
   * Context-Auswahl-Route (z.B. `/apps/dhl` → Liste der Contexts).
   */
  baseRoute: string;
  scope: AppScope;
  /**
   * Ob es für diese App bereits eine dedizierte, app-zentrische
   * Context-Auswahl-Route gibt (bare `baseRoute`, siehe
   * `AppContextSelectorComponent`). Aktuell nur DHL – andere Apps sind
   * (noch) nicht auf das `/apps/{segment}`-Schema umgestellt.
   */
  contextSelectorSupported?: boolean;
  /**
   * Nur für `scope: 'GLOBAL'` relevant: optionale, bereits produktiv
   * genutzte Legacy-URL (z.B. `/tools/maritime`), die weiterhin als
   * gültiger Alias zu `baseRoute` gilt. Wird von
   * `AppAccessService.classifyUrl()` generisch ausgewertet – GLOBAL-Apps
   * benötigen dadurch KEINE eigene URL-Erkennung in `AppAccessService`.
   */
  legacyBasePath?: string;
}

/**
 * Zentrales, rein deklaratives App-Verzeichnis. Eine neue App wird primär
 * durch einen zusätzlichen Eintrag hier + Konfiguration/Routing/
 * Fachkomponenten eingebunden – NICHT durch eine neue Launcher-/Switcher-/
 * Navigations-Komponente.
 */
export const APP_REGISTRY: Record<AppKey, AppRegistryEntry> = {
  [AppKey.DHL]: {
    key: AppKey.DHL,
    titleKey: 'apps.registry.dhl.title',
    descriptionKey: 'apps.registry.dhl.description',
    icon: '📦',
    baseRoute: '/apps/dhl',
    scope: 'STORE',
    contextSelectorSupported: true
  },
  [AppKey.LOYALTY]: {
    key: AppKey.LOYALTY,
    titleKey: 'apps.registry.loyalty.title',
    descriptionKey: 'apps.registry.loyalty.description',
    icon: '🎁',
    baseRoute: '/apps/loyalty',
    scope: 'STORE',
    contextSelectorSupported: true
  },
  [AppKey.SHOP]: {
    key: AppKey.SHOP,
    titleKey: 'apps.registry.shop.title',
    descriptionKey: 'apps.registry.shop.description',
    icon: '🛍️',
    baseRoute: '/stores',
    scope: 'STORE'
  },
  [AppKey.MARITIME]: {
    key: AppKey.MARITIME,
    titleKey: 'apps.registry.maritime.title',
    descriptionKey: 'apps.registry.maritime.description',
    icon: '⚓',
    baseRoute: '/apps/maritime',
    scope: 'GLOBAL',
    legacyBasePath: '/tools/maritime'
  },
  [AppKey.ISSUE_ANALYSIS]: {
    key: AppKey.ISSUE_ANALYSIS,
    titleKey: 'apps.registry.issueAnalysis.title',
    descriptionKey: 'apps.registry.issueAnalysis.description',
    icon: '🛠️',
    baseRoute: '/tools/issue-analysis',
    scope: 'GLOBAL'
  }
};

/** Deterministische Anzeige-Reihenfolge (App-Launcher/-Switcher). */
export const APP_REGISTRY_ORDER: AppKey[] = [
  AppKey.DHL,
  AppKey.LOYALTY,
  AppKey.SHOP,
  AppKey.MARITIME,
  AppKey.ISSUE_ANALYSIS
];

export function getAppRegistryEntry(app: AppKey): AppRegistryEntry {
  return APP_REGISTRY[app];
}
