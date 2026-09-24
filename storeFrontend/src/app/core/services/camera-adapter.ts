import { Injectable } from '@angular/core';

/**
 * Kamera-Abstraktion für Barcode-/QR-Scanning (Mobile-Factory-Pilot M1).
 *
 * Kapselt ausschließlich den Web-`getUserMedia`-Aufruf zur Ermittlung der
 * Rückkamera (Strategy 2 in `BarcodeInputComponent`). Die eigentliche
 * Barcode-Dekodierung (ZXing `BrowserMultiFormatReader`) bleibt bewusst
 * Web-spezifisch und wird NICHT durch diesen Adapter ersetzt – das ist ein
 * bewusster Scope-Schnitt für M1 (siehe ARCHITECTURE_APP_FACTORY.md §7g).
 *
 * BarcodeInputComponent
 *    ↓
 * CameraAdapter (abstract)
 *    ├── WebCameraAdapter          (heute, Default via DI, getUserMedia)
 *    └── später: CapacitorCameraAdapter / natives Scanner-Plugin
 */
export interface BackCameraProbeResult {
  stream: MediaStream;
  deviceId: string | null;
}

export abstract class CameraAdapter {
  /**
   * Fordert (falls möglich) direkt die Rückkamera an und liefert den
   * `MediaStream` + die ermittelte `deviceId` zurück (oder `null`, wenn im
   * aktuellen Kontext keine direkte Rückkamera-Anforderung möglich ist –
   * der Aufrufer fällt dann auf Label-/Geräte-basierte Strategien zurück).
   */
  abstract requestBackCameraStream(): Promise<BackCameraProbeResult | null>;
}

@Injectable({ providedIn: 'root' })
export class WebCameraAdapter implements CameraAdapter {
  async requestBackCameraStream(): Promise<BackCameraProbeResult | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      return { stream, deviceId: settings.deviceId ?? null };
    } catch {
      return null;
    }
  }
}
