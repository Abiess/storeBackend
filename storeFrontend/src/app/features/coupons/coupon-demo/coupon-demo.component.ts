import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { CouponService, ValidateCouponsRequest } from '../../../core/services/coupon.service';

@Component({
  selector: 'app-coupon-demo',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  template: `
    <div class="demo-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>science</mat-icon>
            Gutschein-Simulator (Mock-Modus)
          </mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <div class="info-box">
            <mat-icon>info</mat-icon>
            <div>
              <h3>🎭 Mock-Modus ist aktiv!</h3>
              <p>Sie verwenden simulierte Test-Gutscheine. Keine Backend-Verbindung erforderlich.</p>
            </div>
          </div>

          <h3>Verfügbare Test-Gutscheine:</h3>
          <div class="coupon-cards">
            <mat-card class="coupon-card" *ngFor="let coupon of testCoupons">
              <div class="coupon-header">
                <mat-chip [color]="coupon.color" selected>{{ coupon.code }}</mat-chip>
                <mat-chip *ngIf="coupon.autoApply" color="accent" selected>
                  <mat-icon>bolt</mat-icon> Auto-Apply
                </mat-chip>
              </div>
              <h4>{{ coupon.description }}</h4>
              <div class="coupon-details">
                <div class="detail">
                  <mat-icon>local_offer</mat-icon>
                  <span>{{ coupon.discount }}</span>
                </div>
                <div class="detail">
                  <mat-icon>shopping_cart</mat-icon>
                  <span>{{ coupon.minOrder }}</span>
                </div>
                <div class="detail">
                  <mat-icon>person</mat-icon>
                  <span>{{ coupon.usage }}</span>
                </div>
              </div>
              <button mat-raised-button color="primary" (click)="testCoupon(coupon.code)">
                <mat-icon>play_arrow</mat-icon>
                Testen
              </button>
            </mat-card>
          </div>

          <div class="test-section" *ngIf="testResult">
            <h3>Test-Ergebnis:</h3>
            <mat-card class="result-card" [class.success]="testResult.success" [class.error]="!testResult.success">
              <mat-icon>{{ testResult.success ? 'check_circle' : 'error' }}</mat-icon>
              <div>
                <h4>{{ testResult.code }}</h4>
                <p>{{ testResult.message }}</p>
                <div *ngIf="testResult.discount" class="discount-info">
                  <strong>Rabatt:</strong> {{ testResult.discount }}
                </div>
              </div>
            </mat-card>
          </div>

          <div class="actions">
            <button mat-raised-button color="accent" (click)="goToCouponList()">
              <mat-icon>list</mat-icon>
              Zur Gutschein-Verwaltung
            </button>
            <button mat-stroked-button (click)="createCustomCoupon()">
              <mat-icon>add</mat-icon>
              Eigenen Gutschein erstellen
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .demo-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;

      mat-card {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border-radius: 12px;
      }

      mat-card-header {
        margin-bottom: 24px;

        mat-card-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 28px;
          font-weight: 600;
          color: #1a237e;

          mat-icon {
            font-size: 32px;
            width: 32px;
            height: 32px;
            color: #7c4dff;
          }
        }
      }

      .info-box {
        display: flex;
        gap: 16px;
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px;
        margin-bottom: 32px;

        mat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
        }

        h3 {
          margin: 0 0 8px;
          font-size: 20px;
        }

        p {
          margin: 0;
          opacity: 0.9;
        }
      }

      h3 {
        font-size: 20px;
        font-weight: 600;
        color: #424242;
        margin: 32px 0 16px;
      }

      .coupon-cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
        margin-bottom: 32px;

        .coupon-card {
          padding: 20px;
          border: 2px solid #e0e0e0;
          transition: all 0.3s;

          &:hover {
            border-color: #3f51b5;
            transform: translateY(-4px);
            box-shadow: 0 8px 16px rgba(63, 81, 181, 0.2);
          }

          .coupon-header {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
            flex-wrap: wrap;

            mat-chip {
              font-weight: 600;

              mat-icon {
                font-size: 16px;
                width: 16px;
                height: 16px;
                margin-right: 4px;
              }
            }
          }

          h4 {
            margin: 0 0 16px;
            color: #424242;
            font-size: 16px;
          }

          .coupon-details {
            margin-bottom: 16px;

            .detail {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 8px;
              font-size: 14px;
              color: #757575;

              mat-icon {
                font-size: 18px;
                width: 18px;
                height: 18px;
                color: #9e9e9e;
              }
            }
          }

          button {
            width: 100%;
            font-weight: 500;
          }
        }
      }

      .test-section {
        margin: 32px 0;

        .result-card {
          display: flex;
          gap: 16px;
          padding: 20px;
          margin-top: 16px;

          &.success {
            border-left: 4px solid #4caf50;
            background: #e8f5e9;
          }

          &.error {
            border-left: 4px solid #f44336;
            background: #ffebee;
          }

          mat-icon {
            font-size: 32px;
            width: 32px;
            height: 32px;
          }

          .success mat-icon {
            color: #4caf50;
          }

          .error mat-icon {
            color: #f44336;
          }

          h4 {
            margin: 0 0 8px;
            font-size: 18px;
            font-weight: 600;
          }

          p {
            margin: 0 0 12px;
            color: #616161;
          }

          .discount-info {
            padding: 8px 12px;
            background: white;
            border-radius: 6px;
            font-size: 16px;

            strong {
              color: #4caf50;
            }
          }
        }
      }

      .actions {
        display: flex;
        gap: 16px;
        margin-top: 32px;
        padding-top: 24px;
        border-top: 1px solid #e0e0e0;

        button {
          font-weight: 500;
        }
      }
    }

    @media (max-width: 768px) {
      .demo-container {
        padding: 16px;

        .coupon-cards {
          grid-template-columns: 1fr;
        }

        .actions {
          flex-direction: column;

          button {
            width: 100%;
          }
        }
      }
    }
  `]
})
export class CouponDemoComponent implements OnInit {
  testCoupons = [
    {
      code: 'SAVE20',
      description: '20% Rabatt auf alles',
      discount: '20% Rabatt',
      minOrder: 'Min. 50€',
      usage: 'Max. 3x pro Kunde',
      color: 'primary' as const,
      autoApply: false
    },
    {
      code: 'WELCOME10',
      description: '10€ Willkommensrabatt',
      discount: '10€ Festbetrag',
      minOrder: 'Min. 30€',
      usage: 'Auto-Apply',
      color: 'accent' as const,
      autoApply: true
    },
    {
      code: 'FREESHIP',
      description: 'Kostenloser Versand',
      discount: 'Gratis Versand',
      minOrder: 'Min. 20€',
      usage: 'Unbegrenzt',
      color: 'warn' as const,
      autoApply: false
    }
  ];

  testResult: any = null;

  constructor(private couponService: CouponService) {}

  ngOnInit(): void {
    console.log('🎭 Coupon Demo geladen - Mock-Modus aktiv');
  }

  testCoupon(code: string): void {
    console.log('🧪 Teste Gutschein:', code);

    const testRequest: ValidateCouponsRequest = {
      domainHost: 'localhost',
      cart: {
        currency: 'EUR',
        subtotalCents: 10000, // 100€
        customerEmail: 'test@example.com',
        items: [
          {
            productId: 1,
            productName: 'Test Produkt',
            priceCents: 10000,
            quantity: 1,
            categoryIds: [],
            collectionIds: []
          }
        ]
      },
      appliedCodes: [code]
    };

    this.couponService.validateCoupons(1, testRequest).subscribe({
      next: (response) => {
        if (response.validCoupons.length > 0) {
          const validCoupon = response.validCoupons[0];
          this.testResult = {
            success: true,
            code: code,
            message: validCoupon.message,
            discount: `${(validCoupon.discountCents / 100).toFixed(2)} €`
          };
        } else if (response.invalidCoupons.length > 0) {
          const invalidCoupon = response.invalidCoupons[0];
          this.testResult = {
            success: false,
            code: code,
            message: invalidCoupon.reason
          };
        }
        console.log('✅ Test-Ergebnis:', this.testResult);
      },
      error: (err) => {
        console.error('❌ Test fehlgeschlagen:', err);
        this.testResult = {
          success: false,
          code: code,
          message: 'Fehler beim Testen des Gutscheins'
        };
      }
    });
  }

  goToCouponList(): void {
    window.location.href = '/dashboard/1/coupons';
  }

  createCustomCoupon(): void {
    window.location.href = '/dashboard/1/coupons/new';
  }
}

