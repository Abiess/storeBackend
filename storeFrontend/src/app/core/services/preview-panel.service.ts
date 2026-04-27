import { Injectable, signal } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';

export type PreviewMode = 'mini' | 'live';

export interface PreviewPanelConfig {
  /** Titel im Panel-Header (z.B. "Live-Vorschau") */
  title: string;
  /** Optionales Badge neben dem Titel (z.B. Theme-Name) */
  badge?: string;
  /** Aktuelle Vorschau-URL für den Live-Iframe */
  liveUrl: SafeResourceUrl;
  /** Basis-URL (als Text, für den "In neuem Tab öffnen"-Link) */
  liveBaseUrl: string;
  /** Mini-Stil-Vorschau – beliebiges Template,
   *  wird via ng-content / TemplateRef in die Komponente injiziert.
   *  Alternativ: mini-Daten direkt übergeben. */
  miniData?: PreviewMiniData | null;
  /** Callback: Panel-Tab "Neu laden" geklickt */
  onReload?: () => void;
}

/** Farbschema + Schrift für die eingebaute Mini-Stil-Vorschau */
export interface PreviewMiniData {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    border?: string;
    textSecondary?: string;
  };
  typography: {
    fontFamily: string;
  };
  presetName?: string;
}

@Injectable({ providedIn: 'root' })
export class PreviewPanelService {
  /** Aktuelle Konfiguration – null = Panel nicht registriert */
  readonly config = signal<PreviewPanelConfig | null>(null);
  /** Geöffnet / Geschlossen */
  readonly isOpen = signal(false);
  /** Aktueller Tab */
  readonly mode = signal<PreviewMode>('mini');

  /** Panel konfigurieren (wird von der Eltern-Komponente aufgerufen) */
  register(config: PreviewPanelConfig): void {
    this.config.set(config);
  }

  /** Konfiguration aktualisieren (z.B. nach Theme-Save neue URL / Badge) */
  update(partial: Partial<PreviewPanelConfig>): void {
    const cur = this.config();
    if (cur) this.config.set({ ...cur, ...partial });
  }

  /** Beim Verlassen der Komponente aufrufen */
  clear(): void {
    this.config.set(null);
    this.isOpen.set(false);
  }

  toggle(): void {
    this.isOpen.update(v => !v);
    document.body.style.overflow = this.isOpen() ? 'hidden' : '';
  }

  open(): void {
    this.isOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  close(): void {
    this.isOpen.set(false);
    document.body.style.overflow = '';
  }

  setMode(m: PreviewMode): void {
    this.mode.set(m);
  }

  reload(): void {
    const cfg = this.config();
    cfg?.onReload?.();
  }
}

