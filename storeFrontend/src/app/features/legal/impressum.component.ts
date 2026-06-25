import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-impressum',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="legal-page">
      <div class="legal-container">
        <h1 class="legal-title">{{ 'legal.impressum.title' | translate }}</h1>
        
        <section class="legal-section">
          <h2>{{ 'legal.impressum.companyHeader' | translate }}</h2>
          <div class="legal-content">
            <p class="legal-todo">{{ 'legal.impressum.companyTodo' | translate }}</p>
            <div class="legal-placeholder">
              <p><strong>{{ 'legal.impressum.companyName' | translate }}:</strong> [TODO]</p>
              <p><strong>{{ 'legal.impressum.address' | translate }}:</strong> [TODO]</p>
              <p><strong>{{ 'legal.impressum.city' | translate }}:</strong> [TODO]</p>
              <p><strong>{{ 'legal.impressum.country' | translate }}:</strong> [TODO]</p>
            </div>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.impressum.contactHeader' | translate }}</h2>
          <div class="legal-content">
            <p class="legal-todo">{{ 'legal.impressum.contactTodo' | translate }}</p>
            <div class="legal-placeholder">
              <p><strong>{{ 'legal.impressum.email' | translate }}:</strong> [TODO]</p>
              <p><strong>{{ 'legal.impressum.phone' | translate }}:</strong> [TODO]</p>
              <p><strong>{{ 'legal.impressum.website' | translate }}:</strong> https://markt.ma</p>
            </div>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.impressum.representativeHeader' | translate }}</h2>
          <div class="legal-content">
            <p class="legal-todo">{{ 'legal.impressum.representativeTodo' | translate }}</p>
            <div class="legal-placeholder">
              <p><strong>{{ 'legal.impressum.representative' | translate }}:</strong> [TODO]</p>
            </div>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.impressum.registerHeader' | translate }}</h2>
          <div class="legal-content">
            <p class="legal-todo">{{ 'legal.impressum.registerTodo' | translate }}</p>
            <div class="legal-placeholder">
              <p><strong>{{ 'legal.impressum.registerCourt' | translate }}:</strong> [TODO]</p>
              <p><strong>{{ 'legal.impressum.registerNumber' | translate }}:</strong> [TODO]</p>
              <p><strong>{{ 'legal.impressum.vatId' | translate }}:</strong> [TODO]</p>
            </div>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.impressum.responsibleHeader' | translate }}</h2>
          <div class="legal-content">
            <p>{{ 'legal.impressum.responsibleContent' | translate }}</p>
          </div>
        </section>

        <div class="legal-footer">
          <p class="legal-updated">{{ 'legal.common.lastUpdated' | translate }}: {{ 'legal.common.date' | translate }}</p>
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

    .legal-footer {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }

    .legal-updated {
      color: #718096;
      font-size: 0.875rem;
    }

    /* RTL Support */
    [dir="rtl"] .legal-todo {
      border-left: none;
      border-right: 4px solid #ffc107;
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
export class ImpressumComponent {}
