import { Injectable } from '@angular/core';

/**
 * Akustisches Feedback NACH der DHL-Validierung eines Scans.
 *
 * WICHTIG (fachliche Anforderung):
 * - Der Ton kommt NICHT direkt beim Barcode-Scan, sondern erst nachdem
 *   DHL geantwortet hat (VALID/INVALID/TECHNICAL_ERROR). Die aufrufenden
 *   Komponenten (dhl-store-parcel/dhl-pickup-parcel) rufen playForState()
 *   daher ausschließlich in den Endzuständen der DHL-Antwort auf - niemals
 *   direkt bei onTrackingCodeChange()/VALIDATING.
 * - Kein externes Audio-File nötig: Töne werden per Web Audio API
 *   (OscillatorNode) generiert.
 * - Mobile Safari/iOS: AudioContext darf laut Spezifikation nur nach einer
 *   echten User-Geste gestartet/fortgesetzt werden. Wir "entsperren" den
 *   Context deshalb beim ersten beliebigen Klick/Touch/Keydown im Dokument
 *   (siehe unlockOnFirstGesture()) - das deckt in der Praxis IMMER den
 *   ersten Scan-Vorgang ab (Fokussieren des Scanner-Felds, Tippen, etc.).
 * - Fail-safe: Jeder Fehler (AudioContext nicht verfügbar, Autoplay
 *   blockiert, SSR ohne `window`, etc.) wird verschluckt. Die App muss
 *   OHNE Ton vollständig funktionsfähig bleiben - Sound ist rein additiv.
 * - Ein/Aus-Schalter wird in localStorage gespeichert (geräte-/browser-
 *   lokale Einstellung "Scan-Töne"), Default: an.
 */
@Injectable({ providedIn: 'root' })
export class DhlScanAudioService {
  private static readonly STORAGE_KEY = 'dhl-scan-sounds-enabled';

  private audioCtx: AudioContext | null = null;
  private gestureUnlockBound = false;

  constructor() {
    this.unlockOnFirstGesture();
  }

  /** Aktuelle Nutzer-Einstellung "Scan-Töne" (Default: true). */
  isEnabled(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return true;
    }
    const stored = window.localStorage.getItem(DhlScanAudioService.STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  }

  setEnabled(enabled: boolean): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(DhlScanAudioService.STORAGE_KEY, String(enabled));
  }

  /**
   * Spielt genau EINEN Ton passend zum fachlichen DHL-Validierungsergebnis.
   * VALIDATING/IDLE erzeugen bewusst KEINEN Ton (siehe Klassenkommentar).
   */
  playForState(state: 'VALID' | 'INVALID' | 'TECHNICAL_ERROR'): void {
    if (!this.isEnabled()) {
      return;
    }
    try {
      switch (state) {
        case 'VALID':
          this.playSuccess();
          break;
        case 'INVALID':
          this.playError();
          break;
        case 'TECHNICAL_ERROR':
          this.playWarning();
          break;
      }
    } catch {
      // Audio ist rein additiv - niemals den Scan-Flow durch einen
      // Audio-Fehler (z.B. blockiertes Autoplay) beeinträchtigen.
    }
  }

  /** Kurzer, positiver Doppel-Beep (aufsteigend). */
  private playSuccess(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    this.tone(ctx, 880, ctx.currentTime, 0.09, 'sine', 0.18);
    this.tone(ctx, 1320, ctx.currentTime + 0.11, 0.11, 'sine', 0.18);
  }

  /** Klar abgesetzter, etwas längerer Fehler-Ton (tief, "buzzer"-artig). */
  private playError(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    this.tone(ctx, 220, ctx.currentTime, 0.32, 'square', 0.12);
  }

  /** Eigener Warn-Ton für technische Fehler (zwei tiefe, langsame Töne). */
  private playWarning(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    this.tone(ctx, 330, ctx.currentTime, 0.18, 'triangle', 0.15);
    this.tone(ctx, 262, ctx.currentTime + 0.22, 0.22, 'triangle', 0.15);
  }

  /** Einzelner generierter Ton via OscillatorNode + Gain-Envelope. */
  private tone(
    ctx: AudioContext,
    frequency: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    peakGain: number
  ): void {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);

    // Kurze Attack/Release-Hüllkurve, um Knackgeräusche zu vermeiden.
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }

  /** Lazily erzeugter (Singleton-)AudioContext, resumed falls suspended. */
  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const AudioContextCtor: typeof AudioContext | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }
    if (!this.audioCtx) {
      this.audioCtx = new AudioContextCtor();
    }
    if (this.audioCtx.state === 'suspended') {
      // Best-effort: ohne vorherige Nutzer-Geste kann resume() vom Browser
      // ignoriert/blockiert werden - dann bleibt der Ton stumm, ohne Fehler.
      void this.audioCtx.resume().catch(() => undefined);
    }
    return this.audioCtx;
  }

  /**
   * Entsperrt den AudioContext beim allerersten Klick/Touch/Keydown im
   * Dokument (iOS/Safari Autoplay-Policy). Registriert sich nur einmal
   * und entfernt sich nach der ersten Geste selbst wieder.
   */
  private unlockOnFirstGesture(): void {
    if (this.gestureUnlockBound || typeof document === 'undefined') {
      return;
    }
    this.gestureUnlockBound = true;
    const unlock = () => {
      try {
        this.getContext();
      } catch {
        // ignorieren - Audio bleibt optional
      }
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock, { once: true, passive: true });
    document.addEventListener('keydown', unlock, { once: true });
  }
}
