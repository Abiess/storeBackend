import { Component, ViewChild, ElementRef, OnDestroy, forwardRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { BrowserMultiFormatReader, NotFoundException, Result } from '@zxing/library';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

@Component({
    selector: 'app-barcode-input',
    imports: [CommonModule, FormsModule, TranslatePipe],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => BarcodeInputComponent),
            multi: true
        }
    ],
    template: `
    <div class="barcode-input-container">
      <!-- Manual/Hardware Scanner Input -->
      <input
        #barcodeInput
        type="text"
        [(ngModel)]="value"
        (ngModelChange)="onValueChange($event)"
        (keydown)="onKeyDown($event)"
        [placeholder]="placeholder"
        [disabled]="disabled"
        class="barcode-input-field"
        autocomplete="off"
      />

      <!-- Camera Scanner Button -->
      <button
        *ngIf="!isCameraActive"
        (click)="startCameraScanning()"
        [disabled]="disabled"
        class="barcode-camera-btn"
        type="button">
        📷 {{ 'product.scanWithCamera' | translate }}
      </button>
      <button
        *ngIf="isCameraActive"
        (click)="stopCameraScanning()"
        class="barcode-camera-btn barcode-camera-btn--active"
        type="button">
        ✕ {{ 'product.stopCamera' | translate }}
      </button>

      <!-- Camera Video Preview -->
      <div class="barcode-camera-preview" *ngIf="isCameraActive">
        <video #videoElement class="barcode-camera-video" playsinline></video>
        <div class="barcode-camera-overlay">
          <div class="barcode-scan-frame"></div>
          <div class="barcode-scan-hint">{{ 'product.cameraHint' | translate }}</div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .barcode-input-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .barcode-input-field {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      font-family: monospace;
    }

    .barcode-input-field:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .barcode-input-field:disabled {
      background-color: #f5f5f5;
      cursor: not-allowed;
    }

    .barcode-camera-btn {
      padding: 0.75rem 1rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .barcode-camera-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .barcode-camera-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .barcode-camera-btn--active {
      background: #dc3545;
    }

    .barcode-camera-preview {
      position: relative;
      width: 100%;
      max-width: 500px;
      margin-top: 1rem;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .barcode-camera-video {
      width: 100%;
      height: auto;
      display: block;
    }

    .barcode-camera-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .barcode-scan-frame {
      width: 80%;
      height: 200px;
      border: 3px solid rgba(102, 126, 234, 0.8);
      border-radius: 8px;
      background: transparent;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
    }

    .barcode-scan-hint {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border-radius: 4px;
      font-size: 0.9rem;
    }
  `]
})
export class BarcodeInputComponent implements ControlValueAccessor, OnDestroy {
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('barcodeInput') barcodeInputElement?: ElementRef<HTMLInputElement>;

  value: string = '';
  disabled: boolean = false;
  @Input() placeholder: string = '';
  
  isCameraActive = false;
  private codeReader: BrowserMultiFormatReader | null = null;
  private preferredBackCameraId: string | null = null;

  /**
   * "Clear-Guard" für Scanner-UX (opt-in, siehe prepareForNextScan()):
   * wird von aufrufender Komponente NUR nach einem abgelehnten/technisch
   * fehlgeschlagenen Scan aktiviert (z.B. DHL INVALID/TECHNICAL_ERROR).
   * Standardmäßig false → Verhalten für andere Nutzer dieser
   * Shared-Komponente (POS, Produkt-Formular) bleibt unverändert.
   */
  private awaitingNextScan = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  // ControlValueAccessor Implementation
  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onValueChange(value: string): void {
    this.onChange(value);
    this.onTouched();
  }

  /**
   * Selektiert den gesamten Text im Eingabefeld.
   *
   * Wird nach einem ungültigen (INVALID) DHL-Scan aufgerufen: der abgelehnte
   * Barcode bleibt sichtbar, aber der nächste Scan (HID-Scanner "tippt" die
   * Zeichen sehr schnell in das fokussierte Feld) ERSETZT automatisch die
   * Selektion, ohne dass der Mitarbeiter manuell löschen/markieren muss.
   */
  selectAll(): void {
    this.barcodeInputElement?.nativeElement.focus();
    this.barcodeInputElement?.nativeElement.select();
  }

  /**
   * OPT-IN Scanner-UX (aktuell nur von DHL Einlagern/Abholen genutzt):
   * bereitet das Feld robust auf den NÄCHSTEN Scan vor, nachdem der aktuelle
   * Code fachlich abgelehnt wurde (INVALID) oder technisch nicht geprüft
   * werden konnte (TECHNICAL_ERROR):
   *
   * 1. Visuelle Selektion des kompletten (weiterhin sichtbaren) alten Codes
   *    via selectAll() - hilft bei manueller Korrektur/gewohnter UX.
   * 2. ZUSÄTZLICH ein deterministischer "Clear-Guard": das ALLERERSTE
   *    Zeichen der nächsten Eingabe (HID-Scanner tippt Zeichen wie eine
   *    Tastatur) leert das Feld zuerst komplett, statt an den alten Code
   *    anzuhängen. Das ist unabhängig davon, ob native
   *    Selection-Replace-on-Type zuverlässig funktioniert (Fokus-/Timing-
   *    Eigenheiten je nach Scanner/Browser).
   *
   * Ein kompletter Scan wird als EINE Einheit behandelt: nur das erste
   * Zeichen räumt das Feld, alle weiteren Zeichen desselben Scans werden
   * normal angehängt (kein Löschen nach jedem einzelnen Zeichen).
   */
  prepareForNextScan(): void {
    this.awaitingNextScan = true;
    this.selectAll();
  }

  /**
   * Wird auf JEDES keydown-Event des nativen Eingabefelds angewendet, ist
   * aber ohne vorheriges prepareForNextScan() ein No-Op (Standardverhalten
   * für andere Nutzer dieser Komponente bleibt unverändert).
   */
  onKeyDown(event: KeyboardEvent): void {
    if (!this.awaitingNextScan) {
      return;
    }

    // Nur eine "echte" Zeicheneingabe (Ziffer/Buchstabe/Symbol - genau das,
    // was ein HID-Scanner oder eine manuelle Eingabe für Barcode-Inhalt
    // sendet) löst das Leeren aus. Modifier-/Navigationstasten (Tab, Shift,
    // Pfeile, Strg+..., ...) lassen das Feld unangetastet.
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    this.awaitingNextScan = false;

    // WICHTIG: Model UND natives DOM-Value synchron leeren, BEVOR der
    // Browser die Standardaktion (Zeichen einfügen) für dieses keydown
    // ausführt. Sonst könnte Angulars Change Detection den (noch alten)
    // gebundenen Wert zurück ins DOM schreiben und unser Clear überschreiben.
    this.value = '';
    if (this.barcodeInputElement) {
      this.barcodeInputElement.nativeElement.value = '';
    }
    this.onChange('');
  }

  async startCameraScanning(): Promise<void> {
    try {
      this.isCameraActive = true;

      // Warte auf View-Update
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!this.videoElement) {
        console.error('❌ Video-Element nicht gefunden');
        this.isCameraActive = false;
        return;
      }

      // Code-Reader initialisieren
      this.codeReader = new BrowserMultiFormatReader();

      let selectedDeviceId: string | null = null;

      // Strategie 1: Bereits gespeicherte und bestätigte Rückkamera verwenden
      if (this.preferredBackCameraId) {
        const videoInputDevices = await this.codeReader.listVideoInputDevices();
        const savedCamera = videoInputDevices.find(device => device.deviceId === this.preferredBackCameraId);
        
        if (savedCamera) {
          selectedDeviceId = this.preferredBackCameraId;
          console.log('✅ [Strategy 1] Gespeicherte Rückkamera wiederverwendet');
          console.log('   Device ID:', savedCamera.deviceId);
          console.log('   Label:', savedCamera.label);
        } else {
          console.log('⚠️ Gespeicherte Kamera nicht mehr verfügbar, neue Auswahl...');
          this.preferredBackCameraId = null;
        }
      }

      // Strategie 2: facingMode: environment direkt nutzen
      if (!selectedDeviceId) {
        console.log('🔍 [Strategy 2] Versuche facingMode: environment...');
        
        try {
          // Erst mit getUserMedia die Rückkamera anfordern
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: { ideal: 'environment' }
            }
          });

          // deviceId aus dem Stream extrahieren
          const track = stream.getVideoTracks()[0];
          const settings = track.getSettings();
          
          console.log('📷 getUserMedia erfolgreich:');
          console.log('   Device ID:', settings.deviceId);
          console.log('   Label:', track.label);
          console.log('   Facing Mode:', settings.facingMode);
          
          if (settings.deviceId) {
            selectedDeviceId = settings.deviceId;
            this.preferredBackCameraId = settings.deviceId; // Für nächste Scans speichern
            console.log('✅ Rückkamera via facingMode gefunden und gespeichert');
          }
          
          // Stream sofort stoppen, da ZXing eigenen Stream öffnet
          stream.getTracks().forEach(track => track.stop());
          
        } catch (envError) {
          console.warn('⚠️ facingMode: environment nicht verfügbar:', envError);
        }
      }

      // Strategie 3: Label-basierte Suche (Fallback für ältere Browser)
      if (!selectedDeviceId) {
        console.log('🔍 [Strategy 3] Label-basierte Kamerasuche...');
        
        const videoInputDevices = await this.codeReader.listVideoInputDevices();
        console.log(`📷 Verfügbare Kameras (${videoInputDevices.length}):`);
        videoInputDevices.forEach((device, index) => {
          console.log(`   [${index}] ${device.label} (${device.deviceId})`);
        });

        // Rückkamera via Label finden
        const backCamera = videoInputDevices.find(device => {
          const label = device.label.toLowerCase();
          return label.includes('back') || 
                 label.includes('rear') || 
                 label.includes('environment') ||
                 label.includes('rück'); // Deutsch
        });

        if (backCamera) {
          selectedDeviceId = backCamera.deviceId;
          this.preferredBackCameraId = backCamera.deviceId;
          console.log('✅ Rückkamera via Label gefunden:', backCamera.label);
        } else {
          console.warn('⚠️ Keine Rückkamera via Label gefunden');
        }
      }

      // Strategie 4: Letzte Option - erste Kamera (NUR wenn wirklich keine andere Wahl)
      if (!selectedDeviceId) {
        const videoInputDevices = await this.codeReader.listVideoInputDevices();
        if (videoInputDevices.length > 0) {
          selectedDeviceId = videoInputDevices[0].deviceId;
          console.warn('⚠️ [Strategy 4 - Fallback] Erste verfügbare Kamera:', videoInputDevices[0].label);
          console.warn('   ⚠️ WARNUNG: Dies könnte die Frontkamera sein!');
          // Bewusst NICHT als preferredBackCameraId speichern!
        }
      }

      if (!selectedDeviceId) {
        throw new Error('Keine Kamera verfügbar');
      }

      console.log('🎥 Starte ZXing mit Device ID:', selectedDeviceId);

      // Kamera starten
      const videoElement = this.videoElement.nativeElement;
      
      this.codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoElement,
        (result: Result | null, error?: Error) => {
          if (result) {
            const barcode = result.getText();
            console.log('📦 Kamera-Barcode erkannt:', barcode);

            // Kamera schreibt den Wert atomar (kein Zeichen-für-Zeichen
            // keydown) - Clear-Guard ist hier nicht nötig, defensiv trotzdem
            // deaktivieren, falls noch von einem vorherigen HID-Scan armiert.
            this.awaitingNextScan = false;

            // Barcode ins Eingabefeld schreiben und FormControl aktualisieren
            this.value = barcode;
            this.onChange(barcode);
            this.onTouched();
            
            // Kamera nach erfolgreichem Scan schließen
            setTimeout(() => {
              this.stopCameraScanning();
            }, 100);
          }

          if (error && !(error instanceof NotFoundException)) {
            console.warn('⚠️ Barcode-Scan-Fehler:', error);
          }
        }
      );

      console.log('✅ Kamera-Scanning gestartet');

    } catch (error) {
      console.error('❌ Fehler beim Starten der Kamera:', error);
      this.isCameraActive = false;
      alert('Kamerazugriff fehlgeschlagen. Bitte Berechtigungen prüfen.');
    }
  }

  stopCameraScanning(): void {
    if (this.codeReader) {
      this.codeReader.reset();
      this.codeReader = null;
    }

    // Video-Stream stoppen
    if (this.videoElement?.nativeElement.srcObject) {
      const stream = this.videoElement.nativeElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      this.videoElement.nativeElement.srcObject = null;
    }

    this.isCameraActive = false;
    console.log('✅ Kamera gestoppt');
  }

  ngOnDestroy(): void {
    this.stopCameraScanning();
  }
}
