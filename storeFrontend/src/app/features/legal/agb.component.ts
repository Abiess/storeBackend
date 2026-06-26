import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-agb',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="legal-page">
      <div class="legal-container">
        <h1 class="legal-title">{{ 'legal.terms.title' | translate }}</h1>
        
        <div class="legal-alert">
          <span class="alert-icon">⚠️</span>
          <p>{{ 'legal.terms.draftNotice' | translate }}</p>
        </div>

        <section class="legal-section">
          <h2>{{ 'legal.terms.section1Title' | translate }}</h2>
          <div class="legal-content">
            <p>{{ 'legal.terms.section1Content' | translate }}</p>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.terms.section2Title' | translate }}</h2>
          <div class="legal-content">
            <p>{{ 'legal.terms.section2Content' | translate }}</p>
            <ul class="legal-list">
              <li>{{ 'legal.terms.service1' | translate }}</li>
              <li>{{ 'legal.terms.service2' | translate }}</li>
              <li>{{ 'legal.terms.service3' | translate }}</li>
              <li>{{ 'legal.terms.service4' | translate }}</li>
            </ul>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.terms.section3Title' | translate }}</h2>
          <div class="legal-content">
            <p>{{ 'legal.terms.section3Content' | translate }}</p>
            <div class="legal-highlight">
              <p><strong>{{ 'legal.terms.registration' | translate }}:</strong> {{ 'legal.terms.registrationDesc' | translate }}</p>
            </div>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.terms.section4Title' | translate }}</h2>
          <div class="legal-content">
            <p>{{ 'legal.terms.section4Content' | translate }}</p>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.terms.section5Title' | translate }}</h2>
          <div class="legal-content">
            <p>{{ 'legal.terms.section5Content' | translate }}</p>
            <ul class="legal-list">
              <li>{{ 'legal.terms.obligation1' | translate }}</li>
              <li>{{ 'legal.terms.obligation2' | translate }}</li>
              <li>{{ 'legal.terms.obligation3' | translate }}</li>
              <li>{{ 'legal.terms.obligation4' | translate }}</li>
            </ul>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.terms.section6Title' | translate }}</h2>
          <div class="legal-content">
            <p>{{ 'legal.terms.section6Content' | translate }}</p>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.terms.section7Title' | translate }}</h2>
          <div class="legal-content">
            <p>{{ 'legal.terms.section7Content' | translate }}</p>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.terms.section8Title' | translate }}</h2>
          <div class="legal-content">
            <p>{{ 'legal.terms.section8Content' | translate }}</p>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.terms.section9Title' | translate }}</h2>
          <div class="legal-content">
            <p>{{ 'legal.terms.section9Content' | translate }}</p>
          </div>
        </section>

        <div class="legal-footer">
          <p class="legal-updated">{{ 'legal.common.lastUpdated' | translate }}: 26. Juni 2026</p>
          <p class="legal-status">{{ 'legal.terms.draftStatus' | translate }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .legal-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem 1rem;
    }

    .legal-container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 3rem 2rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .legal-title {
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 2rem;
    }

    .legal-alert {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      background: #fff3cd;
      border: 2px solid #ffc107;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 2rem;
    }

    .alert-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .legal-alert p {
      margin: 0;
      color: #856404;
      font-weight: 500;
    }

    .legal-section {
      margin-bottom: 2rem;
    }

    .legal-section h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 1rem;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 0.5rem;
    }

    .legal-content {
      color: #4a5568;
      line-height: 1.8;
    }

    .legal-content p {
      margin-bottom: 1rem;
    }

    .legal-todo {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 1rem;
      margin-bottom: 1rem;
      border-radius: 4px;
      font-weight: 500;
    }

    .legal-list {
      margin: 1rem 0;
      padding-left: 2rem;
    }

    .legal-list li {
      margin-bottom: 0.75rem;
    }

    .legal-highlight {
      background: #ebf8ff;
      border-left: 4px solid #4299e1;
      padding: 1.5rem;
      margin: 1.5rem 0;
      border-radius: 8px;
    }

    .legal-footer {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }

    .legal-updated {
      color: #718096;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }

    .legal-status {
      color: #e53e3e;
      font-weight: 600;
      font-size: 0.875rem;
    }

    /* RTL Support */
    [dir="rtl"] .legal-todo,
    [dir="rtl"] .legal-highlight {
      border-left: none;
      border-right: 4px solid #ffc107;
    }

    [dir="rtl"] .legal-highlight {
      border-right-color: #4299e1;
    }

    [dir="rtl"] .legal-list {
      padding-left: 0;
      padding-right: 2rem;
    }

    [dir="rtl"] .legal-title,
    [dir="rtl"] .legal-section h2 {
      text-align: right;
    }

    @media (max-width: 768px) {
      .legal-container {
        padding: 2rem 1.5rem;
      }

      .legal-title {
        font-size: 2rem;
      }

      .legal-section h2 {
        font-size: 1.25rem;
      }
    }
  `]
})
export class AgbComponent {}
