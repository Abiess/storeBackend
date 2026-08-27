import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DhlService, DhlSlot } from '@app/core/services/dhl.service';
import { DhlSlotGridComponent } from './dhl-slot-grid.component';
import { DhlVisualPlanComponent } from './dhl-visual-plan.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

type LayoutMode = 'standard' | 'custom';

/**
 * DHL Warehouse Plan Component
 * 
 * Allows switching between:
 * - Standard Plan (Kino-style grid with auto-generated rows)
 * - Custom Plan (Visual drag-and-drop layout with zones)
 */
@Component({
  selector: 'app-dhl-warehouse-plan',
  standalone: true,
  imports: [CommonModule, DhlSlotGridComponent, DhlVisualPlanComponent, TranslatePipe],
  template: `
    <div class="warehouse-plan-container">
      <div class="plan-header">
        <h1>📋 {{ 'dhl.plan.title' | translate }}</h1>
        <button class="btn-back" (click)="navigateBack()">
          ← {{ 'common.back' | translate }}
        </button>
      </div>

      <!-- Mode Selection -->
      <div class="mode-selection">
        <h3>{{ 'dhl.plan.layoutMode' | translate }}</h3>
        <div class="mode-options">
          <label class="mode-option" [class.active]="selectedMode() === 'standard'">
            <input 
              type="radio" 
              name="layoutMode" 
              value="standard" 
              [checked]="selectedMode() === 'standard'"
              (change)="selectMode('standard')">
            <div class="mode-content">
              <div class="mode-icon">🎭</div>
              <div class="mode-title">{{ 'dhl.plan.standardLayout' | translate }}</div>
              <div class="mode-description">{{ 'dhl.plan.standardLayoutHint' | translate }}</div>
            </div>
          </label>

          <label class="mode-option" [class.active]="selectedMode() === 'custom'">
            <input 
              type="radio" 
              name="layoutMode" 
              value="custom" 
              [checked]="selectedMode() === 'custom'"
              (change)="selectMode('custom')">
            <div class="mode-content">
              <div class="mode-icon">🏗️</div>
              <div class="mode-title">{{ 'dhl.plan.customLayout' | translate }}</div>
              <div class="mode-description">{{ 'dhl.plan.customLayoutHint' | translate }}</div>
            </div>
          </label>
        </div>

        <!-- Create Custom Layout Button -->
        <div *ngIf="selectedMode() === 'standard' && !hasCustomLayout()" class="create-custom-hint">
          <button class="btn-create-custom" (click)="selectMode('custom')">
            ✏️ {{ 'dhl.plan.createCustomLayout' | translate }}
          </button>
        </div>

        <!-- Back to Standard Button -->
        <div *ngIf="selectedMode() === 'custom'" class="back-to-standard-hint">
          <button class="btn-back-standard" (click)="selectMode('standard')">
            ↩️ {{ 'dhl.plan.backToStandard' | translate }}
          </button>
          <p class="hint-text">{{ 'dhl.plan.backToStandardHint' | translate }}</p>
        </div>
      </div>

      <!-- Standard Layout View -->
      <div *ngIf="selectedMode() === 'standard'" class="standard-layout-view">
        <div class="layout-info">
          <h3>{{ 'dhl.plan.standardLayoutTitle' | translate }}</h3>
          <p>{{ 'dhl.plan.standardLayoutDescription' | translate }}</p>
        </div>

        <div *ngIf="loadingSlots()" class="loading-state">
          <div class="loading-spinner"></div>
          <p>{{ 'common.loading' | translate }}...</p>
        </div>

        <app-dhl-slot-grid 
          *ngIf="!loadingSlots() && slots().length > 0"
          [slots]="slots()" 
          [selectable]="false"
          [highlightedSlot]="highlightedSlotCode()">
        </app-dhl-slot-grid>

        <div *ngIf="!loadingSlots() && slots().length === 0" class="empty-state">
          <div class="empty-icon">📦</div>
          <h3>{{ 'dhl.dashboard.noSlots' | translate }}</h3>
          <p>{{ 'dhl.dashboard.noSlotsHint' | translate }}</p>
        </div>
      </div>

      <!-- Custom Layout View -->
      <div *ngIf="selectedMode() === 'custom'" class="custom-layout-view">
        <app-dhl-visual-plan></app-dhl-visual-plan>
      </div>
    </div>
  `,
  styles: [`
    .warehouse-plan-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }

    .plan-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .plan-header h1 {
      font-size: 2rem;
      color: #333;
      margin: 0;
    }

    .btn-back {
      padding: 0.75rem 1.5rem;
      background: white;
      border: 2px solid #667eea;
      color: #667eea;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-back:hover {
      background: #667eea;
      color: white;
    }

    .mode-selection {
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .mode-selection h3 {
      font-size: 1.25rem;
      color: #333;
      margin: 0 0 1.5rem 0;
    }

    .mode-options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .mode-option {
      position: relative;
      display: block;
      cursor: pointer;
    }

    .mode-option input[type="radio"] {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .mode-content {
      background: #f8f9fa;
      border: 3px solid #e0e0e0;
      border-radius: 12px;
      padding: 2rem 1.5rem;
      text-align: center;
      transition: all 0.2s;
    }

    .mode-option:hover .mode-content {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }

    .mode-option.active .mode-content {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    }

    .mode-icon {
      font-size: 3rem;
      margin-bottom: 0.5rem;
    }

    .mode-title {
      font-size: 1.25rem;
      font-weight: bold;
      color: #333;
      margin-bottom: 0.5rem;
    }

    .mode-description {
      font-size: 0.95rem;
      color: #666;
      line-height: 1.4;
    }

    .create-custom-hint,
    .back-to-standard-hint {
      text-align: center;
      padding: 1.5rem;
      background: #e3f2fd;
      border: 2px solid #2196f3;
      border-radius: 12px;
    }

    .back-to-standard-hint {
      background: #fff3cd;
      border-color: #ffc107;
    }

    .btn-create-custom,
    .btn-back-standard {
      padding: 1rem 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-back-standard {
      background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
    }

    .btn-create-custom:hover,
    .btn-back-standard:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    }

    .hint-text {
      margin: 1rem 0 0 0;
      color: #856404;
      font-size: 0.95rem;
    }

    .standard-layout-view,
    .custom-layout-view {
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 2rem;
    }

    .layout-info {
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .layout-info h3 {
      font-size: 1.25rem;
      color: #333;
      margin: 0 0 0.5rem 0;
    }

    .layout-info p {
      margin: 0;
      color: #666;
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .loading-state {
      text-align: center;
      padding: 3rem 1rem;
    }

    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 5px solid #e0e0e0;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-state p {
      color: #666;
      margin: 0;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .empty-state h3 {
      font-size: 1.25rem;
      color: #333;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: #666;
      margin: 0;
    }

    @media (max-width: 768px) {
      .plan-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .mode-options {
        grid-template-columns: 1fr;
      }

      .standard-layout-view,
      .custom-layout-view {
        padding: 1rem;
      }
    }
  `]
})
export class DhlWarehousePlanComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dhlService = inject(DhlService);
  
  storeId!: number;
  selectedMode = signal<LayoutMode>('standard');
  slots = signal<DhlSlot[]>([]);
  loadingSlots = signal(false);
  highlightedSlotCode = signal<string | null>(null);

  hasCustomLayout = computed(() => {
    // TODO: Check if custom layout exists in backend
    // For now, always allow switching to custom mode
    return true;
  });

  ngOnInit(): void {
    this.extractStoreId();
    this.loadStoredMode();
    this.loadSlots();
    this.listenForHighlightEvents();
  }

  private extractStoreId(): void {
    let id = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    if (!id && this.route.parent) {
      id = this.route.parent.snapshot.paramMap.get('id');
    }
    if (!id) {
      const match = this.router.url.match(/\/stores\/(\d+)/);
      if (match) id = match[1];
    }
    this.storeId = id ? parseInt(id, 10) : 0;
  }

  private loadStoredMode(): void {
    const stored = localStorage.getItem(`dhl-layout-mode-${this.storeId}`);
    if (stored === 'custom' || stored === 'standard') {
      this.selectedMode.set(stored);
    }
  }

  selectMode(mode: LayoutMode): void {
    this.selectedMode.set(mode);
    localStorage.setItem(`dhl-layout-mode-${this.storeId}`, mode);
    
    // Reload slots when switching to standard view
    if (mode === 'standard') {
      this.loadSlots();
    }
  }

  private loadSlots(): void {
    this.loadingSlots.set(true);
    this.dhlService.getSlots(this.storeId).subscribe({
      next: (slots) => {
        this.slots.set(slots);
        this.loadingSlots.set(false);
      },
      error: (err) => {
        console.error('Failed to load slots:', err);
        this.loadingSlots.set(false);
      }
    });
  }

  private listenForHighlightEvents(): void {
    // Listen for custom events from Store/Pickup components
    window.addEventListener('dhl-highlight-slot', ((event: CustomEvent) => {
      const slotCode = event.detail?.slotCode;
      if (slotCode) {
        this.highlightSlot(slotCode);
      }
    }) as EventListener);
  }

  private highlightSlot(slotCode: string): void {
    this.highlightedSlotCode.set(slotCode);
    // Clear highlight after 5 seconds
    setTimeout(() => {
      if (this.highlightedSlotCode() === slotCode) {
        this.highlightedSlotCode.set(null);
      }
    }, 5000);
  }

  navigateBack(): void {
    this.router.navigate(['/stores', this.storeId, 'dhl']);
  }
}
