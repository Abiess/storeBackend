import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-impressum',
  standalone: true,
  imports: [CommonModule, TranslatePipe, RouterModule],
  template: `
    <div class="legal-page">
      <div class="legal-hero">
        <div class="legal-hero-content">
          <h1 class="legal-hero-title">{{ 'legal.impressum.title' | translate }}</h1>
          <p class="legal-hero-subtitle">{{ 'legal.common.lastUpdated' | translate }}: 26. Juni 2026</p>
        </div>
      </div>

      <div class="legal-container">
        <div class="legal-notice">
          <div class="notice-icon">ℹ️</div>
          <div class="notice-content">
            <h2>{{ 'legal.platform.updating' | translate }}</h2>
            <p>{{ 'legal.platform.tempNotice' | translate }}</p>
          </div>
        </div>

        <section class="legal-section">
          <div class="section-icon">👤</div>
          <h2>{{ 'legal.impressum.responsibleHeader' | translate }}</h2>
          <div class="legal-content">
            <p>{{ 'legal.impressum.responsibleContent' | translate }}</p>
          </div>
        </section>

        <div class="legal-footer">
          <div class="footer-links">
            <a routerLink="/datenschutz" class="footer-link">{{ 'legal.privacy.title' | translate }}</a>
            <span class="footer-separator">•</span>
            <a routerLink="/agb" class="footer-link">{{ 'legal.terms.title' | translate }}</a>
            <span class="footer-separator">•</span>
            <a routerLink="/kontakt" class="footer-link">{{ 'legal.contact.title' | translate }}</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .legal-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .legal-hero {
      padding: 4rem 1rem 3rem;
      text-align: center;
      color: white;
    }

    .legal-hero-content {
      max-width: 900px;
      margin: 0 auto;
    }

    .legal-hero-title {
      font-size: 3rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }

    .legal-hero-subtitle {
      font-size: 1.1rem;
      opacity: 0.95;
      font-weight: 500;
    }

    .legal-container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 16px 16px 0 0;
      padding: 3rem 2rem;
      box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.15);
    }

    .legal-notice {
      background: #fef3c7;
      border: 2px solid #fcd34d;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }

    .notice-icon {
      font-size: 2rem;
      flex-shrink: 0;
    }

    .notice-content h2 {
      font-size: 1.125rem;
      font-weight: 600;
      color: #92400e;
      margin: 0 0 0.5rem 0;
    }

    .notice-content p {
      font-size: 0.9375rem;
      color: #92400e;
      margin: 0;
      line-height: 1.6;
    }

    .legal-section {
      margin-bottom: 3rem;
      position: relative;
      padding-left: 4rem;
    }

    .section-icon {
      position: absolute;
      left: 0;
      top: 0;
      font-size: 2rem;
      width: 3rem;
      height: 3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .legal-section h2 {
      font-size: 1.6rem;
      font-weight: 700;
      color: #2d3748;
      margin-bottom: 1.25rem;
      position: relative;
    }

    .legal-section h2::after {
      content: '';
      position: absolute;
      left: 0;
      bottom: -0.5rem;
      width: 60px;
      height: 3px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 2px;
    }

    .legal-content {
      color: #4a5568;
      line-height: 1.8;
      margin-top: 1.5rem;
    }

    .legal-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .legal-link:hover {
      color: #764ba2;
      text-decoration: underline;
    }

    .legal-info {
      padding: 1.5rem;
      background: linear-gradient(135deg, #f7fafc 0%, #ebf4ff 100%);
      border-radius: 12px;
      border-left: 4px solid #667eea;
    }

    .legal-info p {
      margin: 0.75rem 0;
      font-size: 1.05rem;
    }

    .legal-footer {
      margin-top: 4rem;
      padding: 2rem 0;
      border-top: 2px solid #e2e8f0;
      text-align: center;
    }

    .footer-links {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .footer-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
      transition: all 0.2s ease;
    }

    .footer-link:hover {
      color: #764ba2;
      text-decoration: underline;
    }

    .footer-separator {
      color: #cbd5e0;
      margin: 0 0.5rem;
    }

    .footer-copyright {
      color: #718096;
      font-size: 0.875rem;
      margin: 0;
    }

    /* RTL Support */
    [dir="rtl"] .legal-info {
      border-left: none;
      border-right: 4px solid #667eea;
    }

    [dir="rtl"] .legal-section {
      padding-left: 0;
      padding-right: 4rem;
    }

    [dir="rtl"] .section-icon {
      left: auto;
      right: 0;
    }

    [dir="rtl"] .legal-section h2::after {
      left: auto;
      right: 0;
    }

    @media (max-width: 768px) {
      .legal-hero {
        padding: 3rem 1rem 2rem;
      }

      .legal-hero-title {
        font-size: 2rem;
      }

      .legal-container {
        padding: 2rem 1.5rem;
      }

      .legal-section {
        padding-left: 0;
        margin-bottom: 2.5rem;
      }

      .section-icon {
        position: static;
        margin-bottom: 1rem;
      }

      .legal-section h2 {
        font-size: 1.35rem;
      }

      [dir="rtl"] .legal-section {
        padding-right: 0;
      }

      .footer-links {
        flex-direction: column;
        gap: 0.75rem;
      }

      .footer-separator {
        display: none;
      }
    }
  `]
})
export class ImpressumComponent {}
