import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * DHL Main Component
 * 
 * Haupt-Screen mit zwei großen Aktionen:
 * - Paket einlagern
 * - Paket abholen
 */
@Component({
  selector: 'app-dhl',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="dhl-container">
      <div class="dhl-header">
        <h1>📦 DHL Paketservice</h1>
        <p class="subtitle">{{ 'dhl.main.subtitle' | translate }}</p>
      </div>

      <div class="action-grid">
        <!-- Paket einlagern -->
        <button class="action-card action-store" (click)="navigateToStore()">
          <div class="action-icon">📥</div>
          <h2>{{ 'dhl.main.storeParcel' | translate }}</h2>
          <p>{{ 'dhl.main.storeDescription' | translate }}</p>
        </button>

        <!-- Paket abholen -->
        <button class="action-card action-pickup" (click)="navigateToPickup()">
          <div class="action-icon">📤</div>
          <h2>{{ 'dhl.main.pickupParcel' | translate }}</h2>
          <p>{{ 'dhl.main.pickupDescription' | translate }}</p>
        </button>
      </div>

      <!-- Optional: Quick Stats -->
      <div class="info-box">
        <p>ℹ️ {{ 'dhl.main.hint' | translate }}</p>
      </div>
    </div>
  `,
  styles: [`
    .dhl-container {
      max-width: 800px;
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
      margin-bottom: 2rem;
    }

    .action-card {
      background: white;
      border: 3px solid #e0e0e0;
      border-radius: 16px;
      padding: 3rem 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
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
      border-color: #667eea;
    }

    .action-pickup {
      border-color: #28a745;
    }

    .action-pickup:hover {
      background: linear-gradient(135deg, rgba(40, 167, 69, 0.05) 0%, rgba(34, 139, 58, 0.05) 100%);
      border-color: #28a745;
    }

    .action-icon {
      font-size: 5rem;
      margin-bottom: 0.5rem;
    }

    .action-card h2 {
      font-size: 1.75rem;
      color: #333;
      margin: 0;
    }

    .action-card p {
      font-size: 1rem;
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

    @media (max-width: 640px) {
      .dhl-header h1 {
        font-size: 2rem;
      }

      .action-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }

      .action-card {
        padding: 2rem 1.5rem;
      }

      .action-icon {
        font-size: 4rem;
      }

      .action-card h2 {
        font-size: 1.5rem;
      }
    }
  `]
})
export class DhlComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  storeId!: number;

  ngOnInit(): void {
    this.extractStoreId();
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

  navigateToStore(): void {
    this.router.navigate(['/stores', this.storeId, 'dhl', 'store']);
  }

  navigateToPickup(): void {
    this.router.navigate(['/stores', this.storeId, 'dhl', 'pickup']);
  }
}
