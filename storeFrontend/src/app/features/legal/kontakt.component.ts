import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-kontakt',
  standalone: true,
  imports: [CommonModule, TranslatePipe, FormsModule],
  template: `
    <div class="legal-page">
      <div class="legal-container">
        <h1 class="legal-title">{{ 'legal.contact.title' | translate }}</h1>
        
        <section class="legal-section">
          <h2>{{ 'legal.contact.getInTouchTitle' | translate }}</h2>
          <div class="legal-content">
            <p>{{ 'legal.contact.getInTouchContent' | translate }}</p>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.contact.contactInfoTitle' | translate }}</h2>
          <div class="legal-content">
            <div class="contact-cards">
              <div class="contact-card">
                <div class="contact-icon">📧</div>
                <h3>{{ 'legal.contact.emailTitle' | translate }}</h3>
                <p class="contact-value">info&#64;markt.ma</p>
                <p class="contact-desc">{{ 'legal.contact.emailDesc' | translate }}</p>
              </div>

              <div class="contact-card">
                <div class="contact-icon">📞</div>
                <h3>{{ 'legal.contact.phoneTitle' | translate }}</h3>
                <p class="contact-value">+212675522961</p>
                <p class="contact-desc">{{ 'legal.contact.phoneDesc' | translate }}</p>
              </div>

              <div class="contact-card">
                <div class="contact-icon">💬</div>
                <h3>{{ 'legal.contact.whatsappTitle' | translate }}</h3>
                <p class="contact-value">{{ 'legal.contact.whatsappValue' | translate }}</p>
                <p class="contact-desc">{{ 'legal.contact.whatsappDesc' | translate }}</p>
              </div>
            </div>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.contact.formTitle' | translate }}</h2>
          <div class="legal-content">
            <div class="legal-alert">
              <span class="alert-icon">⚠️</span>
              <p>{{ 'legal.contact.formTodo' | translate }}</p>
            </div>
            
            <form class="contact-form" (ngSubmit)="onSubmit()">
              <div class="form-group">
                <label>{{ 'legal.contact.formName' | translate }}</label>
                <input type="text" [(ngModel)]="formData.name" name="name" [placeholder]="'legal.contact.formNamePlaceholder' | translate" required disabled>
              </div>

              <div class="form-group">
                <label>{{ 'legal.contact.formEmail' | translate }}</label>
                <input type="email" [(ngModel)]="formData.email" name="email" [placeholder]="'legal.contact.formEmailPlaceholder' | translate" required disabled>
              </div>

              <div class="form-group">
                <label>{{ 'legal.contact.formSubject' | translate }}</label>
                <input type="text" [(ngModel)]="formData.subject" name="subject" [placeholder]="'legal.contact.formSubjectPlaceholder' | translate" required disabled>
              </div>

              <div class="form-group">
                <label>{{ 'legal.contact.formMessage' | translate }}</label>
                <textarea [(ngModel)]="formData.message" name="message" rows="6" [placeholder]="'legal.contact.formMessagePlaceholder' | translate" required disabled></textarea>
              </div>

              <button type="submit" class="submit-btn" disabled>
                {{ 'legal.contact.formSubmit' | translate }}
              </button>
            </form>
          </div>
        </section>

        <section class="legal-section">
          <h2>{{ 'legal.contact.businessHoursTitle' | translate }}</h2>
          <div class="legal-content">
            <div class="business-hours">
              <p><strong>{{ 'legal.contact.mondayFriday' | translate }}:</strong> 09:00 - 18:00 Uhr</p>
              <p><strong>{{ 'legal.contact.saturday' | translate }}:</strong> 10:00 - 14:00 Uhr</p>
              <p><strong>{{ 'legal.contact.sunday' | translate }}:</strong> Geschlossen</p>
            </div>
          </div>
        </section>

        <div class="legal-footer">
          <p class="legal-updated">{{ 'legal.common.lastUpdated' | translate }}: 26. Juni 2026</p>
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
      margin-bottom: 1.5rem;
      border-radius: 4px;
      font-weight: 500;
    }

    .legal-alert {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      background: #fff3cd;
      border: 2px solid #ffc107;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
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

    .contact-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
    }

    .contact-card {
      background: #f7fafc;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
      transition: all 0.3s ease;
    }

    .contact-card:hover {
      border-color: #667eea;
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.15);
    }

    .contact-icon {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }

    .contact-card h3 {
      font-size: 1.1rem;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 0.5rem;
    }

    .contact-value {
      font-size: 1rem;
      font-weight: 600;
      color: #667eea;
      margin-bottom: 0.5rem;
    }

    .contact-desc {
      font-size: 0.875rem;
      color: #718096;
    }

    .contact-form {
      margin-top: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 0.5rem;
    }

    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
      background: #f7fafc;
    }

    .form-group input:disabled,
    .form-group textarea:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #667eea;
    }

    .form-group textarea {
      resize: vertical;
      min-height: 120px;
    }

    .submit-btn {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 1rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: not-allowed;
      transition: all 0.3s ease;
      opacity: 0.6;
    }

    .business-hours {
      background: #f7fafc;
      border-radius: 8px;
      padding: 1.5rem;
      margin-top: 1rem;
    }

    .business-hours p {
      margin: 0.75rem 0;
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
    [dir="rtl"] .legal-todo,
    [dir="rtl"] .legal-alert {
      border-left: none;
      border-right: 4px solid #ffc107;
    }

    [dir="rtl"] .legal-title,
    [dir="rtl"] .legal-section h2 {
      text-align: right;
    }

    [dir="rtl"] .contact-card {
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

      .contact-cards {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class KontaktComponent {
  formData = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  onSubmit() {
    // TODO: Implement form submission
    console.log('Form submission not yet implemented:', this.formData);
  }
}
