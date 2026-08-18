import { Component, ViewChild, ElementRef, OnDestroy, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { BrowserMultiFormatReader, NotFoundException, Result } from '@zxing/library';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

@Component({
  selector: 'app-barcode-input',
  standalone: true,
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
  placeholder: string = '';
  
  isCameraActive = false;
  private codeReader: BrowserMultiFormatReader | null = null;
  private preferredBackCameraId: string | null = null;

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

      // Prüfen, ob bereits eine Rückkamera-ID gespeichert ist
      if (this.preferredBackCameraId) {
        // Verfügbare Geräte abrufen
        const videoInputDevices = await this.codeReader.listVideoInputDevices();
        
        // Prüfen, ob die gespeicherte Kamera noch verfügbar ist
        const savedCamera = videoInputDevices.find(device => device.deviceId === this.preferredBackCameraId);
        
        if (savedCamera) {
          selectedDeviceId = this.preferredBackCameraId;
          console.log('✅ Gespeicherte Rückkamera wiederverwendet:', savedCamera.label);
        } else {
          console.log('⚠️ Gespeicherte Kamera nicht mehr verfügbar, neue Suche...');
          this.preferredBackCameraId = null;
        }
      }

      // Falls keine gespeicherte Kamera: neue Suche
      if (!selectedDeviceId) {
        const videoInputDevices = await this.codeReader.listVideoInputDevices();
        console.log('📷 Verfügbare Kameras:', videoInputDevices.length);

        // Rückkamera bevorzugen (falls vorhanden)
        const backCamera = videoInputDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );

        if (backCamera) {
          selectedDeviceId = backCamera.deviceId;
          this.preferredBackCameraId = backCamera.deviceId;
          console.log('✅ Rückkamera gefunden und gespeichert:', backCamera.label);
        } else if (videoInputDevices.length > 0) {
          selectedDeviceId = videoInputDevices[0].deviceId;
          this.preferredBackCameraId = videoInputDevices[0].deviceId;
          console.log('✅ Erste verfügbare Kamera gespeichert:', videoInputDevices[0].label);
        }
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
