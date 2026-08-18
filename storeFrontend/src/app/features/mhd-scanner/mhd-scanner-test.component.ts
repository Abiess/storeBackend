import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { PageHeaderComponent } from '@app/shared/components/page-header.component';

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
    }
  `]
})
export class MhdScannerTestComponent implements OnInit, AfterViewInit {
  @ViewChild('barcodeInput') barcodeInputElement!: ElementRef<HTMLInputElement>;

  storeId: number | null = null;
  currentBarcode = '';
  lastScannedBarcode = '';

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
}
