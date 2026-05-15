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
 */
@Injectable({
  providedIn: 'root'
})
export class WhatsappConfigService {

  private readonly numberSubject = new BehaviorSubject<string | null>(
    this.readFromEnvironment()
  );

  readonly number$: Observable<string | null> = this.numberSubject.asObservable();

  setNumber(phone: string | null | undefined): void {
    const cleaned = phone?.trim() || null;
    if (cleaned !== this.numberSubject.value) {
      this.numberSubject.next(cleaned);
    }
  }

  get currentNumber(): string | null {
    return this.numberSubject.value;
  }

  private readFromEnvironment(): string | null {
    // Sicherer Zugriff: TypeScript kennt das Feld, fallback auf null wenn leer
    const num = (environment as Record<string, any>)['whatsappNumber'];
    return typeof num === 'string' && num.trim() ? num.trim() : null;
  }
}

