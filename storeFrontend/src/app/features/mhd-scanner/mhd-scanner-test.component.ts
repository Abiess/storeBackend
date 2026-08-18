import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { PageHeaderComponent } from '@app/shared/components/page-header.component';
import { BrowserMultiFormatReader, NotFoundException, Result } from '@zxing/library';

@Component({
  selector: 'app-mhd-scanner-test',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PageHeaderComponent],
  template: `
    <div class="mhd-scanner-test-container">
      <app-page-header
        [title]="'sidebarAdmin.items.mhdScannerTest' | translate"
        [showBackButton]="true">
      </app-page-header>

      <div class="scanner-test-content">
        <div class="input-section">
          <label for="barcodeInput" class="input-label">
            {{ 'mhdScanner.barcodeInputLabel' | translate }}
          </label>
          <input
            #barcodeInput
            type="text"
            id="barcodeInput"
            [(ngModel)]="currentBarcode"
            (keydown.enter)="onEnterPressed()"
            class="barcode-input"
            [placeholder]="'mhdScanner.barcodeInputPlaceholder' | translate"
            autocomplete="off"
          />
        </div>

        <!-- Camera Scan Button -->
        <div class="camera-button-section">
          <button 
            *ngIf="!isCameraActive"
            (click)="startCameraScanning()"
            class="camera-btn camera-btn--start"
            type="button">
            📷 {{ 'mhdScanner.startCamera' | translate }}
          </button>
          <button 
            *ngIf="isCameraActive"
            (click)="stopCameraScanning()"
            class="camera-btn camera-btn--stop"
            type="button">
            ✕ {{ 'mhdScanner.stopCamera' | translate }}
          </button>
        </div>

        <!-- Camera Video Preview -->
        <div class="camera-preview" *ngIf="isCameraActive">
          <video #videoElement class="camera-video" playsinline></video>
          <div class="camera-overlay">
            <div class="scan-frame"></div>
            <div class="scan-hint">{{ 'mhdScanner.cameraHint' | translate }}</div>
          </div>
        </div>

        <div class="current-value" *ngIf="currentBarcode">
          <div class="label">{{ 'mhdScanner.currentValue' | translate }}:</div>
          <div class="value">{{ currentBarcode }}</div>
        </div>

        <div class="last-scanned" *ngIf="lastScannedBarcode">
          <div class="label">{{ 'mhdScanner.lastScanned' | translate }}:</div>
          <div class="value">{{ lastScannedBarcode }}</div>
        </div>

        <div class="instructions">
          <h3>{{ 'mhdScanner.instructionsTitle' | translate }}</h3>
          <ol>
            <li>{{ 'mhdScanner.instruction1' | translate }}</li>
            <li>{{ 'mhdScanner.instruction2' | translate }}</li>
            <li>{{ 'mhdScanner.instruction3' | translate }}</li>
            <li>{{ 'mhdScanner.instruction4' | translate }}</li>
          </ol>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mhd-scanner-test-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
    }

    .scanner-test-content {
      max-width: 800px;
      margin: 2rem auto;
      background: white;
      border-radius: 12px;
      padding: 3rem;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    }

    .input-section {
      margin-bottom: 2rem;
    }

    .input-label {
      display: block;
      font-size: 1.125rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.75rem;
    }

    .barcode-input {
      width: 100%;
      padding: 1rem;
      font-size: 1.5rem;
      font-family: 'Courier New', monospace;
      border: 3px solid #667eea;
      border-radius: 8px;
      outline: none;
      transition: all 0.3s ease;
      text-align: center;
      letter-spacing: 2px;
    }

    .barcode-input:focus {
      border-color: #764ba2;
      box-shadow: 0 0 0 4px rgba(118, 75, 162, 0.1);
      transform: scale(1.02);
    }

    .camera-button-section {
      margin-bottom: 2rem;
      text-align: center;
    }

    .camera-btn {
      padding: 1.25rem 2.5rem;
      font-size: 1.25rem;
      font-weight: 600;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 280px;
      touch-action: manipulation;
    }

    .camera-btn--start {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }

    .camera-btn--start:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
    }

    .camera-btn--start:active {
      transform: translateY(0);
    }

    .camera-btn--stop {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
    }

    .camera-btn--stop:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
    }

    .camera-preview {
      position: relative;
      width: 100%;
      max-width: 600px;
      margin: 0 auto 2rem;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      background: #000;
    }

    .camera-video {
      width: 100%;
      height: auto;
      display: block;
      min-height: 300px;
    }

    .camera-overlay {
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

    .scan-frame {
      width: 80%;
      max-width: 300px;
      aspect-ratio: 1;
      border: 4px solid #667eea;
      border-radius: 12px;
      box-shadow: 
        0 0 0 9999px rgba(0, 0, 0, 0.5),
        inset 0 0 20px rgba(102, 126, 234, 0.3);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% {
        border-color: #667eea;
        box-shadow: 
          0 0 0 9999px rgba(0, 0, 0, 0.5),
          inset 0 0 20px rgba(102, 126, 234, 0.3);
      }
      50% {
        border-color: #764ba2;
        box-shadow: 
          0 0 0 9999px rgba(0, 0, 0, 0.5),
          inset 0 0 30px rgba(118, 75, 162, 0.5);
      }
    }

    .scan-hint {
      margin-top: 1.5rem;
      padding: 0.75rem 1.5rem;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      backdrop-filter: blur(4px);
    }

    .current-value,
    .last-scanned {
      background: #f3f4f6;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .current-value .label,
    .last-scanned .label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .current-value .value,
    .last-scanned .value {
      font-size: 1.25rem;
      font-family: 'Courier New', monospace;
      color: #1f2937;
      font-weight: 600;
      letter-spacing: 1px;
    }

    .last-scanned {
      background: linear-gradient(135deg, #667eea15, #764ba215);
      border-left: 4px solid #667eea;
    }

    .instructions {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 2px solid #e5e7eb;
    }

    .instructions h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 1rem;
    }

    .instructions ol {
      list-style: none;
      counter-reset: instruction-counter;
      padding: 0;
    }

    .instructions li {
      counter-increment: instruction-counter;
      position: relative;
      padding-left: 2.5rem;
      margin-bottom: 1rem;
      color: #4b5563;
      line-height: 1.6;
    }

    .instructions li::before {
      content: counter(instruction-counter);
      position: absolute;
      left: 0;
      top: 0;
      width: 1.75rem;
      height: 1.75rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .mhd-scanner-test-container {
        padding: 1rem;
      }

      .scanner-test-content {
        padding: 2rem 1.5rem;
      }

      .barcode-input {
        font-size: 1.25rem;
      }

      .camera-btn {
        min-width: 100%;
        padding: 1.5rem 2rem;
        font-size: 1.125rem;
      }

      .scan-hint {
        font-size: 0.875rem;
      }
    }
  `]
})
export class MhdScannerTestComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('barcodeInput') barcodeInputElement!: ElementRef<HTMLInputElement>;
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

  storeId: number | null = null;
  currentBarcode = '';
  lastScannedBarcode = '';
  
  // Camera scanning
  isCameraActive = false;
  private codeReader: BrowserMultiFormatReader | null = null;
  private videoStream: MediaStream | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // 3-stufige Store-ID Extraktion (wie im Custom Instruction vorgegeben)
    let id = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    if (!id && this.route.parent) {
      id = this.route.parent.snapshot.paramMap.get('id');
    }
    if (!id) {
      const match = this.router.url.match(/\/stores\/(\d+)/);
      if (match) {
        id = match[1];
      }
    }
    this.storeId = id ? +id : null;
    console.log('✅ MHD Scanner Test - Store ID:', this.storeId);
  }

  ngAfterViewInit(): void {
    // Autofokus auf das Eingabefeld setzen
    setTimeout(() => {
      this.barcodeInputElement?.nativeElement.focus();
    }, 100);
  }

  ngOnDestroy(): void {
    // Kamera sauber stoppen beim Verlassen der Komponente
    this.stopCameraScanning();
  }

  onEnterPressed(): void {
    if (this.currentBarcode.trim()) {
      console.log('📦 Barcode gescannt:', this.currentBarcode);
      this.lastScannedBarcode = this.currentBarcode;
      this.currentBarcode = '';
      
      // Fokus zurück auf das Eingabefeld
      setTimeout(() => {
        this.barcodeInputElement?.nativeElement.focus();
      }, 50);
    }
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

      // Verfügbare Geräte abrufen
      const videoInputDevices = await this.codeReader.listVideoInputDevices();
      console.log('📷 Verfügbare Kameras:', videoInputDevices.length);

      // Rückkamera bevorzugen (falls vorhanden)
      let selectedDeviceId: string | undefined;
      const backCamera = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );

      if (backCamera) {
        selectedDeviceId = backCamera.deviceId;
        console.log('✅ Rückkamera gefunden:', backCamera.label);
      } else if (videoInputDevices.length > 0) {
        selectedDeviceId = videoInputDevices[0].deviceId;
        console.log('✅ Erste verfügbare Kamera:', videoInputDevices[0].label);
      }

      // Kamera starten
      const videoElement = this.videoElement.nativeElement;
      
      this.codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoElement,
        (result: Result | null, error?: Error) => {
          if (result) {
            const barcode = result.getText();
            console.log('📦 Kamera-Barcode erkannt:', barcode);
            
            // Barcode ins Eingabefeld schreiben
            this.currentBarcode = barcode;
            
            // Automatisch "Enter" auslösen
            setTimeout(() => {
              this.onEnterPressed();
              // Kamera nach erfolgreichem Scan schließen
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
}
