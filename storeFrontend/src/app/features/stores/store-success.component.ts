import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OnboardingService, ChecklistItem } from '@app/core/services/onboarding.service';

@Component({
  selector: 'app-store-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="success-container">
      
      <!-- Success Animation -->
      <div class="success-animation">
        <div class="checkmark-circle">
          <svg class="checkmark" width="64" height="64" viewBox="0 0 64 64" fill="none">
            <path d="M16 32L28 44L48 20" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>

      <!-- Main Content -->
      <div class="content">
        
        <!-- Headline -->
        <div class="headline-section">
          <h1>Your store is live! 🎉</h1>
          <p class="subtitle">
            <strong>{{storeName()}}</strong> is ready at 
            <a [href]="'https://' + storeUrl()" target="_blank" class="store-link">
              {{storeUrl()}}
            </a>
          </p>
        </div>

        <!-- Progress Bar -->
        <div class="progress-section">
          <div class="progress-header">
            <span class="progress-label">Setup progress</span>
            <span class="progress-percentage">{{completionPercentage()}}% complete</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="completionPercentage()"></div>
          </div>
          <p class="progress-message">{{progressMessage()}}</p>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <a [routerLink]="['/stores', storeId(), 'onboarding']" class="btn-primary">
            🎨 Choose template &amp; sample data
          </a>
          <a [routerLink]="['/stores', storeId(), 'preview']" class="btn-secondary">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="currentColor" stroke-width="1.5"/>
              <path d="M2.04834 10C3.11001 6.61917 6.26917 4.16666 10 4.16666C13.7317 4.16666 16.89 6.61917 17.9517 10C16.89 13.3808 13.7317 15.8333 10 15.8333C6.26917 15.8333 3.11001 13.3808 2.04834 10Z" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            View your store
          </a>
          <button class="btn-secondary" (click)="skipOnboarding()">
            Skip to dashboard
          </button>
        </div>

        <!-- Smart Checklist -->
        <div class="checklist-section">
          <h2>Complete your setup</h2>
          <p class="checklist-intro">
            @if (nextAction()) {
              <strong>Next:</strong> {{ nextAction()?.title }}
            } @else {
              You're all set! 🚀
            }
          </p>

          <div class="checklist">
            @for (item of checklist(); track item.id) {
              <div 
                class="checklist-item"
                [class.completed]="item.completed"
                [class.next-action]="item.id === nextAction()?.id"
                (click)="goToAction(item)"
              >
                <div class="item-icon">
                  @if (item.completed) {
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#10b981"/>
                      <path d="M8 12L11 15L16 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  } @else {
                    <div class="icon-placeholder">
                      {{ item.icon }}
                    </div>
                  }
                </div>

                <div class="item-content">
                  <h3>{{ item.title }}</h3>
                  <p>{{ item.description }}</p>
                </div>

                <div class="item-action">
                  @if (!item.completed) {
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  } @else {
                    <span class="completed-badge">Done</span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Motivation -->
        <div class="motivation-section">
          <div class="motivation-card">
            <span class="emoji">💡</span>
            <div class="motivation-content">
              <h3>Pro tip</h3>
              <p>Adding your first product takes less than 2 minutes. Your store will look much more professional with even just one product.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    /* ==================== Container ==================== */
    .success-container {
      min-height: 100vh;
      background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%);
      padding: 3rem 1.5rem;
    }

    /* ==================== Success Animation ==================== */
    .success-animation {
      display: flex;
      justify-content: center;
      margin-bottom: 2rem;
      animation: slideDown 0.5s ease;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .checkmark-circle {
      width: 80px;
      height: 80px;
      background: #10b981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
      animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    @keyframes scaleIn {
      from {
        transform: scale(0);
      }
      to {
        transform: scale(1);
      }
    }

    .checkmark {
      animation: drawCheck 0.4s ease 0.2s forwards;
      stroke-dasharray: 100;
      stroke-dashoffset: 100;
    }

    @keyframes drawCheck {
      to {
        stroke-dashoffset: 0;
      }
    }

    /* ==================== Content ==================== */
    .content {
      max-width: 680px;
      margin: 0 auto;
    }

    /* ==================== Headline ==================== */
    .headline-section {
      text-align: center;
      margin-bottom: 3rem;
    }

    h1 {
      font-size: 2.25rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 1rem;
      letter-spacing: -0.03em;
    }

    .subtitle {
      font-size: 1.125rem;
      color: #6b7280;
      margin: 0;
      line-height: 1.6;
    }

    .store-link {
      color: #2563eb;
      text-decoration: none;
      font-weight: 600;
    }

    .store-link:hover {
      text-decoration: underline;
    }

    /* ==================== Progress Section ==================== */
    .progress-section {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .progress-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }

    .progress-percentage {
      font-size: 1.5rem;
      font-weight: 700;
      color: #2563eb;
    }

    .progress-bar {
      height: 12px;
      background: #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 0.75rem;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #2563eb 0%, #10b981 100%);
      border-radius: 6px;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      animation: fillProgress 1s ease;
    }

    @keyframes fillProgress {
      from {
        width: 0%;
      }
    }

    .progress-message {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
    }

    /* ==================== Quick Actions ==================== */
    .quick-actions {
      display: flex;
      gap: 1rem;
      margin-bottom: 3rem;
    }

    .btn-primary,
    .btn-secondary {
      flex: 1;
      padding: 1rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      text-decoration: none;
    }

    .btn-primary {
      background: #2563eb;
      color: white;
    }

    .btn-primary:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }

    .btn-secondary {
      background: white;
      color: #6b7280;
      border: 1.5px solid #d1d5db;
    }

    .btn-secondary:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }

    /* ==================== Checklist ==================== */
    .checklist-section {
      margin-bottom: 3rem;
    }

    .checklist-section h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 0.5rem;
    }

    .checklist-intro {
      font-size: 1rem;
      color: #6b7280;
      margin: 0 0 1.5rem;
    }

    .checklist {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .checklist-item {
      background: white;
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1.5px solid #e5e7eb;
    }

    .checklist-item:hover {
      border-color: #2563eb;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
      transform: translateX(4px);
    }

    .checklist-item.completed {
      background: #f0fdf4;
      border-color: #10b981;
    }

    .checklist-item.completed:hover {
      border-color: #059669;
      transform: none;
    }

    .checklist-item.next-action {
      border-color: #2563eb;
      background: #eff6ff;
    }

    .item-icon {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-placeholder {
      font-size: 1.5rem;
      width: 48px;
      height: 48px;
      background: #f3f4f6;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .item-content {
      flex: 1;
    }

    .item-content h3 {
      font-size: 1rem;
      font-weight: 600;
      color: #111827;
      margin: 0 0 0.25rem;
    }

    .item-content p {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
      line-height: 1.4;
    }

    .item-action {
      flex-shrink: 0;
      color: #9ca3af;
    }

    .completed-badge {
      font-size: 0.75rem;
      font-weight: 600;
      color: #10b981;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* ==================== Motivation ==================== */
    .motivation-section {
      margin-bottom: 2rem;
    }

    .motivation-card {
      background: #fef3c7;
      border: 1.5px solid #fbbf24;
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      gap: 1rem;
    }

    .emoji {
      font-size: 2rem;
      flex-shrink: 0;
    }

    .motivation-content h3 {
      font-size: 1rem;
      font-weight: 600;
      color: #78350f;
      margin: 0 0 0.5rem;
    }

    .motivation-content p {
      font-size: 0.875rem;
      color: #92400e;
      margin: 0;
      line-height: 1.5;
    }

    /* ==================== Responsive ==================== */
    @media (max-width: 640px) {
      h1 {
        font-size: 1.75rem;
      }

      .quick-actions {
        flex-direction: column;
      }

      .checklist-item {
        padding: 1rem;
      }

      .item-icon {
        width: 40px;
        height: 40px;
      }

      .icon-placeholder {
        width: 40px;
        height: 40px;
        font-size: 1.25rem;
      }
    }
  `]
})
export class StoreSuccessComponent implements OnInit {
  storeId = signal<number>(0);
  storeName = signal<string>('');
  storeUrl = signal<string>('');

  checklist = signal<ChecklistItem[]>([]);
  nextAction = signal<ChecklistItem | undefined>(undefined);
  completionPercentage = signal<number>(80);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private onboardingService: OnboardingService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const storeId = parseInt(params['storeId'] || '0');
      this.storeId.set(storeId);
      this.storeName.set(params['storeName'] || 'Your Store');
      this.storeUrl.set(params['storeUrl'] || 'yourstore.markt.ma');

      // Load checklist from service
      if (storeId > 0) {
        this.onboardingService.loadProgress(storeId).subscribe(progress => {
          const items = this.onboardingService.getChecklist(storeId);
          this.checklist.set(items);
          
          const next = this.onboardingService.getNextAction(storeId);
          this.nextAction.set(next || undefined);
          
          if (progress) {
            this.completionPercentage.set(progress.completionPercentage);
          }
        });
      }
    });
  }

  progressMessage(): string {
    const completed = this.checklist().filter(i => i.completed).length;
    const total = this.checklist().length;
    const remaining = total - completed;
    
    if (remaining === 0) {
      return "Your store is fully set up! 🎉";
    } else if (remaining === 1) {
      return "Just 1 more step to complete!";
    } else {
      return `${remaining} quick steps remaining`;
    }
  }

  goToAction(item: ChecklistItem): void {
    if (item.completed) return;
    this.router.navigate([item.route], {
      queryParams: { storeId: this.storeId() }
    });
  }

  skipOnboarding(): void {
    this.router.navigate(['/dashboard']);
  }
}

