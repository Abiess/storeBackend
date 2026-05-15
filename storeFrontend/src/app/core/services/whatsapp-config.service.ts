import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '@env/environment';

/**
 * Zentraler Service für die WhatsApp-Kontaktkonfiguration.
 *
 * Aktuelle Datenquelle (Prio-Reihenfolge):
 *  1. setNumber() – programmatisch gesetzt (z.B. aus Store-Settings)
 *  2. environment.whatsappNumber – Plattform-weiter Fallback aus der Umgebungskonfiguration
 *  3. null → Widget wird automatisch ausgeblendet
 *
 * TODO (nächster Schritt):
 *  - Backend-Feld `whatsapp_number` in Store-Tabelle ergänzen
 *  - `PublicStore.whatsappNumber` im Frontend nutzen
 *  - Im StorefrontComponent nach `loadStore()`: `whatsappConfigService.setNumber(store.whatsappNumber ?? null)`
 */
@Injectable({
  providedIn: 'root'
})
export class WhatsappConfigService {

  /**
   * Aktuelle WhatsApp-Nummer.
   * null oder '' = Widget unsichtbar.
   */
  private readonly numberSubject = new BehaviorSubject<string | null>(
    (environment as any).whatsappNumber?.trim() || null
  );

  /** Reaktives Observable – das Widget abonniert dieses. */
  readonly number$: Observable<string | null> = this.numberSubject.asObservable();

  /**
   * Nummer programmatisch setzen.
   * Aufruf z.B. nachdem Store-Daten geladen wurden:
   *   this.whatsappConfigService.setNumber(store.whatsappNumber ?? null);
   *
   * @param phone Internationale Nummer (z.B. '+49123456789') oder null zum Ausblenden
   */
  setNumber(phone: string | null | undefined): void {
    const cleaned = phone?.trim() || null;
    if (cleaned !== this.numberSubject.value) {
      this.numberSubject.next(cleaned);
    }
  }

  /** Synchroner Zugriff auf die aktuelle Nummer (z.B. für Guards) */
  get currentNumber(): string | null {
    return this.numberSubject.value;
  }
}

