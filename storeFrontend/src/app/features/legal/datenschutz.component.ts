import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-datenschutz',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="legal-page">
      <div class="legal-container">
        <h1 class="legal-title">{{ 'legal.privacy.title' | translate }}</h1>
        
        <div class="legal-alert">
          <span class="alert-icon">⚠️</span>
          <p>{{ 'legal.privacy.draftNotice' | translate }}</p>
        </div>

        <section class="legal-section">
          <h2>{{ 'legal.privacy.section1Title' | translate }}</h2>
          <div class="legal-content">
            <p class="legal-todo">{{ 'legal.privacy.section1Todo' | translate }}</p>
            <div class="legal-placeholder">
              <p><strong>{{ 'legal.privacy.companyName' | translate }}:</strong> [TODO]</p>
              <p><strong>{{ 'legal.privacy.address' | translate }}:</strong> [TODO]</p>
              <p><strong>{{ 'legal.privacy.email' | translate }}:</strong> [TODO]</p>
              <p><strong>{{ 'legal.privacy.phone' | translate }}:</strong> [TODO]</p>
            </div>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.privacy.section2Title' | translate }}</h2>
          <div class="legal-content">
            <p>{{ 'legal.privacy.section2Content' | translate }}</p>
            <ul class="legal-list">
              <li>{{ 'legal.privacy.dataType1' | translate }}</li>
              <li>{{ 'legal.privacy.dataType2' | translate }}</li>
              <li>{{ 'legal.privacy.dataType3' | translate }}</li>
              <li>{{ 'legal.privacy.dataType4' | translate }}</li>
              <li>{{ 'legal.privacy.dataType5' | translate }}</li>
            </ul>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.privacy.section3Title' | translate }}</h2>
          <div class="legal-content">
            <p>{{ 'legal.privacy.section3Content' | translate }}</p>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.privacy.section4Title' | translate }}</h2>
          <div class="legal-content">
            <p>{{ 'legal.privacy.section4Content' | translate }}</p>
            <div class="legal-highlight">
              <h3>{{ 'legal.privacy.hostingTitle' | translate }}</h3>
              <p>{{ 'legal.privacy.hostingContent' | translate }}</p>
            </div>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.privacy.section5Title' | translate }}</h2>
          <div class="legal-content">
            <p>{{ 'legal.privacy.section5Intro' | translate }}</p>
            <ul class="legal-list">
              <li><strong>{{ 'legal.privacy.right1' | translate }}:</strong> {{ 'legal.privacy.right1Desc' | translate }}</li>
              <li><strong>{{ 'legal.privacy.right2' | translate }}:</strong> {{ 'legal.privacy.right2Desc' | translate }}</li>
              <li><strong>{{ 'legal.privacy.right3' | translate }}:</strong> {{ 'legal.privacy.right3Desc' | translate }}</li>
              <li><strong>{{ 'legal.privacy.right4' | translate }}:</strong> {{ 'legal.privacy.right4Desc' | translate }}</li>
              <li><strong>{{ 'legal.privacy.right5' | translate }}:</strong> {{ 'legal.privacy.right5Desc' | translate }}</li>
            </ul>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.privacy.section6Title' | translate }}</h2>
          <div class="legal-content">
            <p>{{ 'legal.privacy.section6Content' | translate }}</p>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.privacy.section7Title' | translate }}</h2>
          <div class="legal-content">
            <p class="legal-todo">{{ 'legal.privacy.section7Todo' | translate }}</p>
          </div>
        </section>

        <div class="legal-footer">
          <p class="legal-updated">{{ 'legal.common.lastUpdated' | translate }}: {{ 'legal.common.date' | translate }}</p>
          <p class="legal-status">{{ 'legal.privacy.draftStatus' | translate }}</p>
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

    .legal-section h3 {
      font-size: 1.2rem;
      font-weight: 600;
      color: #4a5568;
      margin-top: 1rem;
      margin-bottom: 0.5rem;
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

    .legal-placeholder {
      padding: 1rem;
      background: #f7fafc;
      border-radius: 8px;
    }

    .legal-placeholder p {
      margin: 0.5rem 0;
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
export class DatenschutzComponent {}
