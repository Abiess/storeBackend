import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LegalBaseComponent } from './legal-base.component';

@Component({
  selector: 'app-versand-store',
  standalone: true,
  imports: [CommonModule, TranslatePipe, RouterModule],
  template: `
    <div class="legal-page">
      <div class="legal-container">
        <h1 class="legal-title">{{ 'legal.shipping.title' | translate }}</h1>
        
        <div *ngIf="loading" class="loading-state">
          <div class="spinner"></div>
          <p>{{ 'common.loading' | translate }}</p>
        </div>

        <div *ngIf="!loading && hasContent" class="legal-content">
          <pre>{{ getContentField() }}</pre>
          <div class="platform-notice">
            <p>{{ 'legal.platformNotice' | translate }}</p>
          </div>
        </div>

        <div *ngIf="!loading && !hasContent" class="empty-state">
          <div class="empty-state-icon">📄</div>
          <h2 class="empty-state-title">{{ 'legal.shipping.notConfigured' | translate }}</h2>
          <p class="empty-state-message">{{ 'legal.shipping.notConfiguredDesc' | translate }}</p>
          
          <div *ngIf="isOwner" class="owner-hint">
            <p class="owner-hint-text">{{ 'legal.owner.setupHint' | translate }}</p>
            <button class="owner-hint-button" (click)="navigateToSettings()">
              {{ 'legal.owner.setupButton' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .legal-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 80px 20px 60px;
    }

    .legal-container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 48px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }

    .legal-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: #2d3748;
      margin-bottom: 32px;
      text-align: center;
    }

    .loading-state {
      text-align: center;
      padding: 60px 20px;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #f3f4f6;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .legal-content pre {
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: inherit;
      font-size: 1rem;
      line-height: 1.8;
      color: #4a5568;
      margin-bottom: 32px;
    }

    .platform-notice {
      background: #f7fafc;
      border-left: 4px solid #667eea;
      padding: 16px;
      margin-top: 40px;
      font-size: 0.875rem;
      color: #718096;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }

    .empty-state-icon {
      font-size: 4rem;
      margin-bottom: 24px;
    }

    .empty-state-title {
      font-size: 1.75rem;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 12px;
    }

    .empty-state-message {
      font-size: 1.125rem;
      color: #718096;
      margin-bottom: 32px;
    }

    .owner-hint {
      background: #edf2f7;
      border-radius: 12px;
      padding: 24px;
      margin-top: 32px;
    }

    .owner-hint-text {
      font-size: 1rem;
      color: #4a5568;
      margin-bottom: 16px;
    }

    .owner-hint-button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 32px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .owner-hint-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }

    @media (max-width: 768px) {
      .legal-container {
        padding: 32px 24px;
      }

      .legal-title {
        font-size: 2rem;
      }
    }
  `]
})
export class VersandStoreComponent extends LegalBaseComponent {
  protected getContentField(): string | null | undefined {
    return this.store?.shippingPolicyText;
  }

  protected getEmptyTitleKey(): string {
    return 'legal.shipping.notConfigured';
  }

  protected getEmptyTextKey(): string {
    return 'legal.shipping.notConfiguredDesc';
  }
}
