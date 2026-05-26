import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OnboardingService, ChecklistItem, OnboardingProgress } from '@app/core/services/onboarding.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { LucideAngularModule } from 'lucide-angular';

/**
 * Onboarding-Checklist Komponente.
 *
 * Wird im Store-Dashboard oben angezeigt, solange der Onboarding-Fortschritt < 100% ist.
 * Zeigt den Fortschritt als Balken + Liste der Schritte mit direkten Aktionslinks.
 *
 * UX-Prinzip: "Progressive Disclosure" – nur relevant bis alle Schritte erledigt sind,
 * dann verschwindet das Widget automatisch.
 *
 * Usage:
 *   <app-onboarding-checklist [storeId]="storeId"></app-onboarding-checklist>
 */
@Component({
  selector: 'app-onboarding-checklist',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LucideAngularModule],
  template: `
    @if (show && progress) {
      <div class="oc-card">
        <!-- Header mit Progress-Balken -->
        <div class="oc-header">
          <div class="oc-header__text">
            <h3 class="oc-title">
              @if (progress.completionPercentage < 100) {
                {{ 'onboarding.title' | translate }}
              } @else {
                {{ 'onboarding.titleDone' | translate }}
              }
            </h3>
            <p class="oc-subtitle">
              @if (progress.completionPercentage < 100) {
                {{ 'onboarding.subtitle' | translate : { completed: completedCount, total: checklist.length } }}
              } @else {
                {{ 'onboarding.subtitleDone' | translate }}
              }
            </p>
          </div>
          <div class="oc-header__right">
            <span class="oc-percent">{{ progress.completionPercentage }}%</span>
            <button class="oc-dismiss" (click)="dismiss()" [title]="'onboarding.dismiss' | translate">×</button>
          </div>
        </div>

        <!-- Fortschrittsbalken -->
        <div class="oc-progress-bar">
          <div class="oc-progress-fill"
               [style.width.%]="progress.completionPercentage"
               [class.oc-progress-fill--done]="progress.completionPercentage >= 100">
          </div>
        </div>

        <!-- Schritt-Liste -->
        <div class="oc-steps">
          @for (step of checklist; track step.id) {
            <div class="oc-step" [class.oc-step--done]="step.completed"
                 (click)="!step.completed && navigate(step)">
              <div class="oc-step__icon">
                @if (step.completed) {
                  <lucide-icon name="check" [size]="18" class="oc-check"></lucide-icon>
                } @else {
                  <lucide-icon [name]="step.icon" [size]="18"></lucide-icon>
                }
              </div>
              <div class="oc-step__body">
                <span class="oc-step__title">{{ (step.titleKey ? (step.titleKey | translate) : step.title) }}</span>
                <span class="oc-step__desc">{{ (step.descKey ? (step.descKey | translate) : step.description) }}</span>
              </div>
              @if (!step.completed) {
                <button class="oc-step__cta" (click)="$event.stopPropagation(); navigate(step)">
                  {{ 'onboarding.cta' | translate }}
                </button>
              } @else {
                <span class="oc-step__done-badge">{{ 'onboarding.doneBadge' | translate }}</span>
              }
            </div>
          }
        </div>

        <!-- Store-Vorschau Link -->
        <div class="oc-footer">
          <a [href]="'https://' + storeSlug + '.markt.ma'"
             target="_blank" rel="noopener"
             class="oc-preview-btn">
            <lucide-icon name="external-link" [size]="14"></lucide-icon>
            {{ 'onboarding.openPreview' | translate }}
          </a>
        </div>
      </div>
    }
  `,
  styles: [`
    .oc-card {
      background: #fff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 24px rgba(102,126,234,.10);
      overflow: hidden;
      margin-bottom: 2rem;
    }
    .oc-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 1.25rem 1.5rem .75rem;
      gap: 1rem;
    }
    .oc-header__right {
      display: flex;
      align-items: center;
      gap: .75rem;
      flex-shrink: 0;
    }
    .oc-title {
      margin: 0 0 .25rem;
      font-size: 1rem;
      font-weight: 700;
      color: #1e293b;
    }
    .oc-subtitle {
      margin: 0;
      font-size: .8rem;
      color: #64748b;
    }
    .oc-percent {
      font-size: 1.1rem;
      font-weight: 800;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .oc-dismiss {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1.25rem;
      cursor: pointer;
      line-height: 1;
      padding: 0 .25rem;
    }
    .oc-dismiss:hover { color: #475569; }

    /* Fortschrittsbalken */
    .oc-progress-bar {
      height: 6px;
      background: #f1f5f9;
      margin: 0 1.5rem .75rem;
      border-radius: 99px;
      overflow: hidden;
    }
    .oc-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      border-radius: 99px;
      transition: width .6s cubic-bezier(.4,0,.2,1);
    }
    .oc-progress-fill--done {
      background: linear-gradient(90deg, #22c55e, #16a34a);
    }

    /* Schritt-Liste */
    .oc-steps {
      display: flex;
      flex-direction: column;
      gap: 0;
      border-top: 1px solid #f1f5f9;
    }
    .oc-step {
      display: flex;
      align-items: center;
      gap: .875rem;
      padding: .875rem 1.5rem;
      cursor: pointer;
      transition: background .15s;
      border-bottom: 1px solid #f8fafc;
    }
    .oc-step:last-child { border-bottom: none; }
    .oc-step:hover:not(.oc-step--done) { background: #f8fafc; }
    .oc-step--done { opacity: .65; cursor: default; }

    .oc-step__icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: #f1f5f9;
      color: #6b7280;
    }
    .oc-step--done .oc-step__icon {
      background: #dcfce7;
    }
    .oc-check {
      color: #16a34a;
    }

    .oc-step__body {
      flex: 1;
      min-width: 0;
    }
    .oc-step__title {
      display: block;
      font-size: .875rem;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: .1rem;
    }
    .oc-step--done .oc-step__title {
      text-decoration: line-through;
      color: #94a3b8;
    }
    .oc-step__desc {
      display: block;
      font-size: .75rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .oc-step__cta {
      flex-shrink: 0;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: .4rem .875rem;
      font-size: .78rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: opacity .15s;
    }
    .oc-step__cta:hover { opacity: .85; }

    .oc-step__done-badge {
      flex-shrink: 0;
      font-size: .75rem;
      color: #16a34a;
      font-weight: 600;
    }

    /* Footer */
    .oc-footer {
      padding: .875rem 1.5rem;
      border-top: 1px solid #f1f5f9;
      background: #fafafa;
    }
    .oc-preview-btn {
      display: inline-flex;
      align-items: center;
      gap: .4rem;
      font-size: .82rem;
      font-weight: 600;
      color: #667eea;
      text-decoration: none;
    }
    .oc-preview-btn:hover { text-decoration: underline; }

    @media (max-width: 600px) {
      .oc-step__desc { display: none; }
      .oc-step { padding: .75rem 1rem; }
    }
  `]
})
export class OnboardingChecklistComponent implements OnInit, OnChanges {
  @Input() storeId!: number;
  @Input() storeSlug: string = '';

  progress: OnboardingProgress | null = null;
  checklist: ChecklistItem[] = [];
  show = true;

  get completedCount(): number {
    return this.checklist.filter(s => s.completed).length;
  }

  constructor(
    private onboardingService: OnboardingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProgress();
  }

  ngOnChanges(): void {
    if (this.storeId) this.loadProgress();
  }

  private loadProgress(): void {
    // Prüfe ob User diesen Store dismissed hat
    const dismissed = localStorage.getItem(`onboarding_dismissed_${this.storeId}`);
    if (dismissed) {
      this.show = false;
      return;
    }

    this.onboardingService.loadProgress(this.storeId).subscribe(progress => {
      this.progress = progress;
      this.checklist = this.onboardingService.getChecklist(this.storeId);
      // Ausblenden wenn 100% erreicht
      if (progress && progress.completionPercentage >= 100) {
        setTimeout(() => { this.show = false; }, 3000);
      }
    });

    this.onboardingService.progress$.subscribe(progress => {
      if (progress) {
        this.progress = progress;
        this.checklist = this.onboardingService.getChecklist(this.storeId);
      }
    });
  }

  navigate(step: ChecklistItem): void {
    this.router.navigate([step.route]);
  }

  dismiss(): void {
    localStorage.setItem(`onboarding_dismissed_${this.storeId}`, '1');
    this.show = false;
  }
}

