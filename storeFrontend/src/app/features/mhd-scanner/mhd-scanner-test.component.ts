import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { PageHeaderComponent } from '@app/shared/components/page-header.component';
import { BrowserMultiFormatReader, NotFoundException, Result } from '@zxing/library';
import { ProductService } from '@app/core/services/product.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  brands?: string;
  quantity?: string;
  image_url?: string;
  image_front_url?: string;
}

@Component({
    selector: 'app-mhd-scanner-test',
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

        <!-- Loading State -->
        <div class="loading-message" *ngIf="isLoadingProduct">
          <div class="spinner"></div>
          {{ 'mhdScanner.searchingProduct' | translate }}
        </div>

        <!-- Product Found -->
        <div class="product-result" *ngIf="foundProduct && !isLoadingProduct">
          <h3 class="product-result-title">✅ {{ 'mhdScanner.productFound' | translate }}</h3>
          <div class="product-card">
            <img 
              *ngIf="foundProduct.image_url || foundProduct.image_front_url" 
              [src]="foundProduct.image_url || foundProduct.image_front_url" 
              [alt]="foundProduct.product_name"
              class="product-image"
              (error)="onImageError($event)">
            <div class="product-info">
              <h4 class="product-name">{{ foundProduct.product_name || 'Unbekannt' }}</h4>
              <div class="product-detail" *ngIf="foundProduct.brands">
                <strong>{{ 'mhdScanner.brand' | translate }}:</strong> {{ foundProduct.brands }}
              </div>
              <div class="product-detail" *ngIf="foundProduct.quantity">
                <strong>{{ 'mhdScanner.quantity' | translate }}:</strong> {{ foundProduct.quantity }}
              </div>
              <div class="product-detail">
                <strong>{{ 'mhdScanner.barcode' | translate }}:</strong> {{ foundProduct.code }}
              </div>
            </div>
          </div>
        </div>

        <!-- Product Not Found -->
        <div class="product-not-found" *ngIf="productNotFound && !isLoadingProduct">
          <h3 class="not-found-title">❌ {{ 'mhdScanner.productNotFound' | translate }}</h3>
          <p>{{ 'mhdScanner.productNotFoundHint' | translate }}</p>
          <div class="scanned-barcode">
            <strong>{{ 'mhdScanner.scannedBarcode' | translate }}:</strong> {{ lastScannedBarcode }}
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

        <!-- Product List Section -->
        <div class="product-list-section">
          <h3>Produkte mit Ablaufdatum</h3>
          
          <!-- Search -->
          <div class="product-search">
            <input 
              type="text" 
              class="search-input"
              placeholder="Produkte suchen..."
              [(ngModel)]="searchTerm"
              (input)="onSearchChange()"
            />
          </div>

          <!-- Loading -->
          <div *ngIf="isLoadingProducts" class="loading-spinner">
            Lade Produkte...
          </div>

          <!-- Product List -->
          <div *ngIf="!isLoadingProducts && products.length > 0" class="product-list">
            <div 
              *ngFor="let product of products" 
              class="product-item"
              [class.expired]="isExpired(product)"
            >
              <div class="product-name">{{ product.title }}</div>
              <div class="product-expiry">
                <span class="label">Ablauf:</span>
                <span class="value">{{ formatExpiryDate(product.expiryDate) }}</span>
              </div>
              <div class="product-remaining">
                <span class="label">Restzeit:</span>
                <span class="value" [class.expired-text]="isExpired(product)">
                  {{ formatRemainingTime(product.expiryDate) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div *ngIf="!isLoadingProducts && products.length === 0" class="empty-state">
            Keine Produkte gefunden.
          </div>

          <!-- Pagination -->
          <div *ngIf="!isLoadingProducts && totalPages > 1" class="pagination">
            <button 
              class="pagination-btn"
              [disabled]="currentPage === 0"
              (click)="previousPage()"
            >
              Zurück
            </button>
            <span class="page-info">
              Seite {{ currentPage + 1 }} von {{ totalPages }}
            </span>
            <button 
              class="pagination-btn"
              [disabled]="currentPage >= totalPages - 1"
              (click)="nextPage()"
            >
              Weiter
            </button>
          </div>
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

    .loading-message {
      text-align: center;
      padding: 2rem;
      background: linear-gradient(135deg, #667eea15, #764ba215);
      border-radius: 12px;
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      font-size: 1.125rem;
      color: #667eea;
      font-weight: 600;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid #667eea40;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .product-result {
      margin-bottom: 2rem;
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .product-result-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #10b981;
      margin-bottom: 1rem;
    }

    .product-card {
      display: flex;
      gap: 1.5rem;
      background: white;
      border: 2px solid #10b981;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
    }

    .product-image {
      width: 120px;
      height: 120px;
      object-fit: contain;
      border-radius: 8px;
      background: #f9fafb;
      flex-shrink: 0;
    }

    .product-info {
      flex: 1;
    }

    .product-name {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.75rem;
    }

    .product-detail {
      margin-bottom: 0.5rem;
      color: #4b5563;
      line-height: 1.5;
    }

    .product-detail strong {
      color: #667eea;
    }

    .product-not-found {
      padding: 2rem;
      background: #fef2f2;
      border: 2px solid #ef4444;
      border-radius: 12px;
      margin-bottom: 2rem;
      text-align: center;
      animation: fadeIn 0.3s ease-in;
    }

    .not-found-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #ef4444;
      margin-bottom: 1rem;
    }

    .product-not-found p {
      color: #6b7280;
      margin-bottom: 1rem;
    }

    .scanned-barcode {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: white;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      color: #1f2937;
    }

    .scanned-barcode strong {
      color: #ef4444;
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

    /* Product List Styles */
    .product-list-section {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 2px solid #e5e7eb;
    }

    .product-list-section h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 1.5rem;
    }

    .product-search {
      margin-bottom: 1.5rem;
    }

    .search-input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .search-input:focus {
      outline: none;
      border-color: #667eea;
    }

    .loading-spinner {
      text-align: center;
      padding: 2rem;
      color: #6b7280;
      font-style: italic;
    }

    .product-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .product-item {
      background: white;
      padding: 1rem;
      border-radius: 8px;
      border-left: 4px solid #667eea;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .product-item.expired {
      border-left-color: #ef4444;
      background: #fef2f2;
    }

    .product-name {
      font-size: 1.125rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.5rem;
    }

    .product-expiry,
    .product-remaining {
      font-size: 0.875rem;
      color: #6b7280;
      margin-top: 0.25rem;
    }

    .product-expiry .label,
    .product-remaining .label {
      font-weight: 500;
      margin-right: 0.5rem;
    }

    .product-expiry .value,
    .product-remaining .value {
      font-weight: 600;
      color: #1f2937;
    }

    .expired-text {
      color: #ef4444 !important;
      font-weight: 700 !important;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #9ca3af;
      font-style: italic;
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      margin-top: 1.5rem;
      padding: 1rem;
    }

    .pagination-btn {
      padding: 0.5rem 1rem;
      background: white;
      border: 2px solid #667eea;
      color: #667eea;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .pagination-btn:hover:not(:disabled) {
      background: #667eea;
      color: white;
    }

    .pagination-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .page-info {
      font-size: 0.875rem;
      font-weight: 500;
      color: #4b5563;
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
  private preferredBackCameraId: string | null = null; // Gespeicherte Rückkamera-ID

  // Open Food Facts
  isLoadingProduct = false;
  foundProduct: OpenFoodFactsProduct | null = null;
  productNotFound = false;

  // Product List
  products: any[] = [];
  isLoadingProducts = false;
  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
  totalElements = 0;
  searchTerm = '';
  private searchSubject = new Subject<string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private productService: ProductService
  ) {
    // Debounce Search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(search => {
      this.currentPage = 0;
      this.loadProducts();
    });
  }

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
    
    // Load initial products
    if (this.storeId) {
      this.loadProducts();
    }
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
      
      // Open Food Facts Lookup
      this.lookupProduct(this.currentBarcode);
      
      this.currentBarcode = '';
      
      // Fokus zurück auf das Eingabefeld
      setTimeout(() => {
        this.barcodeInputElement?.nativeElement.focus();
      }, 50);
    }
  }

  lookupProduct(barcode: string): void {
    // Reset previous results
    this.foundProduct = null;
    this.productNotFound = false;
    this.isLoadingProduct = true;

    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
    console.log('🔍 Suche Produkt bei Open Food Facts:', url);

    this.http.get<{ status: number; product?: any }>(url).subscribe({
      next: (response) => {
        this.isLoadingProduct = false;
        if (response.status === 1 && response.product) {
          this.foundProduct = {
            code: barcode,
            product_name: response.product.product_name,
            brands: response.product.brands,
            quantity: response.product.quantity,
            image_url: response.product.image_url,
            image_front_url: response.product.image_front_url
          };
          console.log('✅ Produkt gefunden:', this.foundProduct);
        } else {
          this.productNotFound = true;
          console.log('❌ Produkt nicht gefunden');
        }
      },
      error: (error) => {
        this.isLoadingProduct = false;
        this.productNotFound = true;
        console.error('❌ Fehler bei Open Food Facts Anfrage:', error);
      }
    });
  }

  onImageError(event: Event): void {
    // Bild konnte nicht geladen werden - verstecken
    (event.target as HTMLImageElement).style.display = 'none';
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

  // ─────────────────────────────────────────────────────────────────────────
  // Product List Methods
  // ─────────────────────────────────────────────────────────────────────────

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  loadProducts(): void {
    if (!this.storeId) return;
    
    this.isLoadingProducts = true;
    this.productService.getProductsForExpiryList(
      this.storeId,
      this.currentPage,
      this.pageSize,
      this.searchTerm
    ).subscribe({
      next: (response) => {
        this.products = response.content || [];
        this.totalPages = response.page?.totalPages || response.totalPages || 0;
        this.totalElements = response.page?.totalElements || response.totalElements || 0;
        this.isLoadingProducts = false;
        console.log('✅ Products loaded:', this.products.length);
      },
      error: (error) => {
        console.error('❌ Error loading products:', error);
        this.isLoadingProducts = false;
      }
    });
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadProducts();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadProducts();
    }
  }

  formatExpiryDate(expiryDate: string | null): string {
    if (!expiryDate) return '--';
    
    const [year, month, day] = expiryDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatRemainingTime(expiryDate: string | null): string {
    if (!expiryDate) return '--';
    
    const [year, month, day] = expiryDate.split('-').map(Number);
    const expiry = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffMs = expiry.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      const absDays = Math.abs(diffDays);
      return absDays === 1 ? 'Seit 1 Tag abgelaufen' : `Seit ${absDays} Tagen abgelaufen`;
    }
    
    if (diffDays === 0) return 'Heute fällig';
    if (diffDays === 1) return 'Noch 1 Tag';
    if (diffDays < 60) return `Noch ${diffDays} Tage`;
    
    const months = Math.floor(diffDays / 30);
    return months === 1 ? 'Noch 1 Monat' : `Noch ${months} Monate`;
  }

  isExpired(product: any): boolean {
    if (!product.expiryDate) return false;
    
    const [year, month, day] = product.expiryDate.split('-').map(Number);
    const expiry = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return expiry < today;
  }
}
