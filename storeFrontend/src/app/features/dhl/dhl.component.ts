import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DhlService, DhlSlotStats, DhlSlot } from '@app/core/services/dhl.service';
import { DhlSlotGridComponent } from './dhl-slot-grid.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

@Component({
  selector: 'app-dhl',
  standalone: true,
  imports: [CommonModule, RouterModule, DhlSlotGridComponent, TranslatePipe],
  template: `
    <div class="dhl-container">
      <div class="dhl-header">
        <h1>📦 {{ 'dhl.main.title' | translate }}</h1>
        <p class="subtitle">{{ 'dhl.main.subtitle' | translate }}</p>
      </div>

      <!-- Action Buttons -->
      <div class="action-grid">
        <button class="action-card action-store" (click)="navigateToStore()">
          <div class="action-icon">📥</div>
          <h2>{{ 'dhl.main.store' | translate }}</h2>
          <p>{{ 'dhl.main.storeHint' | translate }}</p>
        </button>
        <button class="action-card action-pickup" (click)="navigateToPickup()">
          <div class="action-icon">📤</div>
          <h2>{{ 'dhl.main.pickup' | translate }}</h2>
          <p>{{ 'dhl.main.pickupHint' | translate }}</p>
        </button>
        <button class="action-card action-plan" (click)="navigateToPlan()">
          <div class="action-icon">📋</div>
          <h2>{{ 'dhl.plan.title' | translate }}</h2>
          <p>Lagerplatz-Ansicht und Konfiguration</p>
        </button>
      </div>

      <!-- Stats Section -->
      <div *ngIf="stats()" class="stats-section">
        <h3>{{ 'dhl.dashboard.title' | translate }}</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ stats()?.occupiedSlots || 0 }}</div>
            <div class="stat-label">{{ 'dhl.dashboard.storedParcels' | translate }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats()?.totalSlots || 0 }}</div>
            <div class="stat-label">{{ 'dhl.dashboard.totalSlots' | translate }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats()?.totalCapacity || 0 }}</div>
            <div class="stat-label">{{ 'dhl.dashboard.totalCapacity' | translate }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats()?.freeCapacity || 0 }}</div>
            <div class="stat-label">{{ 'dhl.dashboard.freeCapacity' | translate }}</div>
          </div>
        </div>
        <div class="occupancy-bar">
          <div class="occupancy-fill" [style.width.%]="stats()?.occupancyPercentage || 0"></div>
        </div>
        <p class="occupancy-text">
          {{ 'dhl.dashboard.occupancy' | translate }}: {{ stats()?.occupancyPercentage || 0 }}%
        </p>
      </div>

      <!-- Slot Grid -->
      <div *ngIf="slots().length > 0" class="grid-section">
        <div class="grid-header">
          <h3>{{ 'dhl.dashboard.slotOverview' | translate }}</h3>
          <button class="btn-refresh" (click)="loadData()">
            🔄 {{ 'common.refresh' | translate }}
          </button>
        </div>
        <app-dhl-slot-grid [slots]="slots()" [selectable]="false"></app-dhl-slot-grid>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loadingData() && slots().length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>{{ 'dhl.dashboard.noSlots' | translate }}</h3>
        <p>{{ 'dhl.dashboard.noSlotsHint' | translate }}</p>
        <button class="btn-init" (click)="initializeDefaultSlots()" [disabled]="initializing()">
          <span *ngIf="!initializing()">{{ 'dhl.dashboard.initSlots' | translate }}</span>
          <span *ngIf="initializing()">{{ 'common.loading' | translate }}...</span>
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="loadingData()" class="loading-state">
        <div class="loading-spinner"></div>
        <p>{{ 'common.loading' | translate }}...</p>
      </div>

      <div class="info-box">
        <p>ℹ️ {{ 'dhl.main.hint' | translate }}</p>
      </div>
    </div>
  `,
  styles: [`
    .dhl-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }

    .dhl-header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .dhl-header h1 {
      font-size: 2.5rem;
      margin: 0 0 0.5rem 0;
      color: #333;
    }

    .subtitle {
      font-size: 1.1rem;
      color: #666;
      margin: 0;
    }

    .action-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
      margin-bottom: 3rem;
    }

    .action-card {
      background: white;
      border: 3px solid #e0e0e0;
      border-radius: 16px;
      padding: 3rem 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
    }

    .action-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
    }

    .action-store {
      border-color: #667eea;
    }

    .action-store:hover {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
    }

    .action-pickup {
      border-color: #28a745;
    }

    .action-pickup:hover {
      background: linear-gradient(135deg, rgba(40, 167, 69, 0.05) 0%, rgba(34, 139, 58, 0.05) 100%);
    }

    .action-plan {
      border-color: #17a2b8;
    }

    .action-plan:hover {
      background: linear-gradient(135deg, rgba(23, 162, 184, 0.05) 0%, rgba(16, 135, 153, 0.05) 100%);
    }

    .action-icon {
      font-size: 5rem;
      margin-bottom: 0.5rem;
    }

    .action-card h2 {
      font-size: 1.75rem;
      color: #333;
      margin: 0 0 0.5rem 0;
    }

    .action-card p {
      font-size: 1rem;
      color: #666;
      margin: 0;
    }

    .stats-section {
      margin-bottom: 3rem;
    }

    .stats-section h3 {
      font-size: 1.5rem;
      color: #333;
      margin-bottom: 1rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .stat-card {
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 1.5rem 1rem;
      text-align: center;
    }

    .stat-value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      font-size: 0.9rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .occupancy-bar {
      width: 100%;
      height: 12px;
      background: #e0e0e0;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .occupancy-fill {
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s;
    }

    .occupancy-text {
      text-align: center;
      color: #666;
      font-size: 1rem;
      margin: 0;
    }

    .grid-section {
      margin-bottom: 2rem;
    }

    .grid-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .grid-header h3 {
      font-size: 1.5rem;
      color: #333;
      margin: 0;
    }

    .btn-refresh {
      padding: 0.5rem 1rem;
      background: white;
      border: 2px solid #667eea;
      color: #667eea;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-refresh:hover {
      background: #667eea;
      color: white;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      background: #f8f9fa;
      border-radius: 12px;
      margin-bottom: 2rem;
    }

    .empty-icon {
      font-size: 5rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .empty-state h3 {
      font-size: 1.5rem;
      color: #333;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: #666;
      margin-bottom: 2rem;
    }

    .btn-init {
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

    .btn-init:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
    }

    .btn-init:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
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

    .info-box {
      padding: 1.5rem;
      background: #e3f2fd;
      border: 2px solid #2196f3;
      border-radius: 12px;
      text-align: center;
    }

    .info-box p {
      margin: 0;
      color: #1565c0;
      font-size: 1rem;
    }

    @media (max-width: 768px) {
      .dhl-header h1 {
        font-size: 2rem;
      }
      
      .action-card {
        padding: 2rem 1rem;
      }
      
      .stat-value {
        font-size: 2rem;
      }
    }
  `]
})
export class DhlComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dhlService = inject(DhlService);
  
  storeId!: number;
  stats = signal<DhlSlotStats | null>(null);
  slots = signal<DhlSlot[]>([]);
  loadingData = signal(false);
  initializing = signal(false);

  ngOnInit(): void {
    this.extractStoreId();
    this.loadData();
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

  loadData(): void {
    this.loadingData.set(true);
    
    this.dhlService.getSlotStats(this.storeId).subscribe({
      next: (stats) => {
        this.stats.set(stats);
      },
      error: (err) => console.error('Failed to load stats:', err)
    });

    this.dhlService.getSlots(this.storeId).subscribe({
      next: (slots) => {
        this.slots.set(slots);
        this.loadingData.set(false);
      },
      error: (err) => {
        console.error('Failed to load slots:', err);
        this.loadingData.set(false);
      }
    });
  }

  initializeDefaultSlots(): void {
    this.initializing.set(true);
    
    this.dhlService.initializeDefaultSlots(this.storeId).subscribe({
      next: () => {
        console.log('✅ Default slots initialized');
        this.initializing.set(false);
        this.loadData();
      },
      error: (err) => {
        console.error('❌ Initialize slots failed:', err);
        this.initializing.set(false);
        alert('Fehler beim Initialisieren der Lagerplätze');
      }
    });
  }

  navigateToStore(): void {
    this.router.navigate(['/stores', this.storeId, 'dhl', 'store']);
  }

  navigateToPickup(): void {
    this.router.navigate(['/stores', this.storeId, 'dhl', 'pickup']);
  }

  navigateToPlan(): void {
    this.router.navigate(['/stores', this.storeId, 'dhl', 'plan']);
  }
}
