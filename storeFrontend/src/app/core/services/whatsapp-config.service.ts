import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '@env/environment';

/**
 * Zentraler Service für die WhatsApp-Kontaktkonfiguration.
 *
 * Datenquellen (Priorität):
 *  1. setNumber() / setMessage() – programmatisch (z.B. aus Store-Settings)
 *  2. environment.whatsappNumber / environment.whatsappMessage – Plattform-Fallback
 *  3. null / default-Text → Widget-Defaults greifen
 */
@Injectable({
  providedIn: 'root'
})
export class WhatsappConfigService {

  /** Vorbefüllte Nachricht, die beim Klick direkt in WhatsApp erscheint */
  static readonly DEFAULT_MESSAGE =
    'Hallo, ich interessiere mich für eure Produkte auf markt.ma';

  private readonly numberSubject = new BehaviorSubject<string | null>(
    this.readEnv('whatsappNumber')
  );

  private readonly messageSubject = new BehaviorSubject<string>(
    this.readEnv('whatsappMessage') ?? WhatsappConfigService.DEFAULT_MESSAGE
  );

  readonly number$: Observable<string | null> = this.numberSubject.asObservable();
  readonly message$: Observable<string>       = this.messageSubject.asObservable();

  /** Nummer programmatisch setzen (null → Widget ausblenden) */
  setNumber(phone: string | null | undefined): void {
    const cleaned = phone?.trim() || null;
    if (cleaned !== this.numberSubject.value) this.numberSubject.next(cleaned);
  }

  /** Vorbefüllte Nachricht programmatisch überschreiben */
  setMessage(msg: string): void {
    const cleaned = msg.trim();
    if (cleaned !== this.messageSubject.value) this.messageSubject.next(cleaned);
  }

  get currentNumber():  string | null { return this.numberSubject.value; }
  get currentMessage(): string        { return this.messageSubject.value; }

  private readEnv(key: string): any {
    const val = (environment as Record<string, any>)[key];
    return typeof val === 'string' && val.trim() ? val.trim() : null;
  }
}

