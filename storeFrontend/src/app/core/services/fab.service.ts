import { Injectable, signal } from '@angular/core';

export interface FabConfig {
  icon: string;
  label: string;
  color?: 'primary' | 'green' | 'orange' | 'red' | 'teal';
  action: () => void;
  /** Optional: Speed-Dial-Einträge (mehrere Aktionen) */
  speedDial?: SpeedDialItem[];
}

export interface SpeedDialItem {
  icon: string;
  label: string;
  action: () => void;
  color?: string;
}

@Injectable({ providedIn: 'root' })
export class FabService {
  /** Aktuell aktive FAB-Konfiguration (null = kein FAB sichtbar) */
  readonly config = signal<FabConfig | null>(null);

  /** FAB registrieren (von jeder Komponente aufgerufen) */
  register(config: FabConfig): void {
    this.config.set(config);
  }

  /** FAB entfernen (beim Verlassen der Komponente) */
  clear(): void {
    this.config.set(null);
  }
}

