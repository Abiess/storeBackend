import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslatePipe } from "@app/core/pipes/translate.pipe";
import { VideoPlayerComponent } from "@app/features/landing/video-player.component";
import { LucideAngularModule } from 'lucide-angular';
import { ClarityService } from '@app/core/services/clarity.service';

type BusinessType = 'SHOP' | 'RESTAURANT' | 'RIAD';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, TranslatePipe, VideoPlayerComponent, LucideAngularModule, RouterModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit, OnDestroy {
  // State
  showVideo = false;
  hasInteracted = false;
  private visibilityListener?: () => void;
  private intersectionObserver?: IntersectionObserver;
  private timeoutId?: number;
  private errorTrackingAttempted = false;

  // Trust Signals (keine Fake-Stats!)
  trustSignals = [
    { icon: 'circle-check', label: 'landing.trust.freeStart' },
    { icon: 'circle-check', label: 'landing.trust.twoMinutes' },
    { icon: 'circle-check', label: 'landing.trust.cancelAnytime' }
  ];

  // BusinessType Cards
  businessTypes = [
    { id: 'SHOP' as BusinessType, icon: '🏪', label: 'landing.businessTypes.shop' },
    { id: 'RESTAURANT' as BusinessType, icon: '🍽️', label: 'landing.businessTypes.restaurant' },
    { id: 'RIAD' as BusinessType, icon: '🏨', label: 'landing.businessTypes.riad' }
  ];

  features = [
    {
      icon: 'palette',
      title: 'landing.featureItems.customDesign.title',
      description: 'landing.featureItems.customDesign.description'
    },
    {
      icon: 'credit-card',
      title: 'landing.featureItems.securePayments.title',
      description: 'landing.featureItems.securePayments.description'
    },
    {
      icon: 'chart-column',
      title: 'landing.featureItems.analytics.title',
      description: 'landing.featureItems.analytics.description'
    },
    {
      icon: 'send',
      title: 'landing.featureItems.telegramImport.title',
      description: 'landing.featureItems.telegramImport.description'
    },
    {
      icon: 'smartphone',
      title: 'landing.featureItems.mobileFirst.title',
      description: 'landing.featureItems.mobileFirst.description'
    },
    {
      icon: 'shield-check',
      title: 'landing.featureItems.security.title',
      description: 'landing.featureItems.security.description'
    }
  ];

  tutorials = [
    {
      icon: 'user',
      title: 'landing.tutorialItems.createAccount.title',
      description: 'landing.tutorialItems.createAccount.description',
      duration: 'landing.tutorialItems.createAccount.duration'
    },
    {
      icon: 'package',
      title: 'landing.tutorialItems.createFirstProduct.title',
      description: 'landing.tutorialItems.createFirstProduct.description',
      duration: 'landing.tutorialItems.createFirstProduct.duration'
    },
    {
      icon: 'palette',
      title: 'landing.tutorialItems.customizeStore.title',
      description: 'landing.tutorialItems.customizeStore.description',
      duration: 'landing.tutorialItems.customizeStore.duration'
    }
  ];


  plans = [
    {
      name: 'landing.planItems.starter.name',
      description: 'landing.planItems.starter.description',
      price: '0',
      period: 'landing.planItems.periodMonthly',
      cta: 'landing.planItems.starter.cta',
      features: [
        'landing.planItems.starter.features.0',
        'landing.planItems.starter.features.1',
        'landing.planItems.starter.features.2',
        'landing.planItems.starter.features.3',
        'landing.planItems.starter.features.4'
      ],
      highlighted: false
    },
    {
      name: 'landing.planItems.professional.name',
      description: 'landing.planItems.professional.description',
      price: '29',
      period: 'landing.planItems.periodMonthly',
      badge: 'landing.planItems.professional.badge',
      cta: 'landing.planItems.professional.cta',
      features: [
        'landing.planItems.professional.features.0',
        'landing.planItems.professional.features.1',
        'landing.planItems.professional.features.2',
        'landing.planItems.professional.features.3',
        'landing.planItems.professional.features.4',
        'landing.planItems.professional.features.5',
        'landing.planItems.professional.features.6'
      ],
      highlighted: true
    },
    {
      name: 'landing.planItems.enterprise.name',
      description: 'landing.planItems.enterprise.description',
      price: '99',
      period: 'landing.planItems.periodMonthly',
      cta: 'landing.planItems.enterprise.cta',
      features: [
        'landing.planItems.enterprise.features.0',
        'landing.planItems.enterprise.features.1',
        'landing.planItems.enterprise.features.2',
        'landing.planItems.enterprise.features.3',
        'landing.planItems.enterprise.features.4',
        'landing.planItems.enterprise.features.5',
        'landing.planItems.enterprise.features.6'
      ],
      highlighted: false
    }
  ];
  
  constructor(private router: Router, private clarity: ClarityService) {}

  ngOnInit(): void {
    this.trackEvent('landing_page_loaded');
    this.setupVisibilityTracking();
    this.setupVideoLazyLoading();
  }

  ngOnDestroy(): void {
    // Cleanup all listeners
    if (this.visibilityListener) {
      document.removeEventListener('visibilitychange', this.visibilityListener);
    }
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  private setupVisibilityTracking(): void {
    this.visibilityListener = () => {
      if (document.hidden && !this.hasInteracted) {
        this.trackEvent('landing_page_hidden_before_interaction');
      }
    };
    document.addEventListener('visibilitychange', this.visibilityListener);
  }

  private setupVideoLazyLoading(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.showVideo) {
            this.showVideo = true;
            this.trackEvent('landing_demo_section_viewed');
          }
        });
      },
      { threshold: 0.1 }
    );

    // Observer mit cleanup-fähigem timeout
    this.timeoutId = window.setTimeout(() => {
      const demoElement = document.getElementById('demo');
      if (demoElement && this.intersectionObserver) {
        this.intersectionObserver.observe(demoElement);
      }
      this.timeoutId = undefined;
    }, 500);
  }

  scrollToSection(sectionId: string): void {
    this.trackFirstInteraction();
    this.trackEvent(`landing_scroll_to_${sectionId}`);
    
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  navigateToRegister(): void {
    this.trackFirstInteraction();
    this.trackEvent('landing_register_click');
    this.router.navigate(['/register']);
  }

  navigateToLogin(): void {
    this.trackFirstInteraction();
    this.trackEvent('landing_login_click');
    this.router.navigate(['/login']);
  }

  navigateToCreateStore(source: string = 'hero'): void {
    this.trackFirstInteraction();
    this.trackEvent(`landing_${source}_cta_click`);
    this.clarity.setTag('flow', 'create-store');
    this.clarity.setTag('source', source);
    this.router.navigate(['/create-store']);
  }

  onBusinessTypeClick(businessType: BusinessType): void {
    this.trackFirstInteraction();
    this.trackEvent(`landing_segment_${businessType.toLowerCase()}_click`);
    this.clarity.setTag('businessType', businessType);
    
    // Store in localStorage für create-store-public
    localStorage.setItem('preferredBusinessType', businessType);
    
    this.router.navigate(['/create-store']);
  }

  onDemoClick(): void {
    this.trackFirstInteraction();
    this.trackEvent('landing_demo_click');
    this.scrollToSection('demo');
  }

  onMobileStickyCtaClick(): void {
    this.trackFirstInteraction();
    this.trackEvent('landing_mobile_sticky_cta_click');
    this.navigateToCreateStore('mobile_sticky');
  }

  private trackFirstInteraction(): void {
    if (!this.hasInteracted) {
      this.hasInteracted = true;
      this.trackEvent('landing_first_interaction');
    }
  }

  private trackEvent(eventName: string): void {
    try {
      this.clarity.event(eventName);
    } catch (error) {
      console.warn('[Landing] Clarity event failed:', eventName, error);
      
      // Error-Event nur EINMAL tracken, aber normale Events weiter erlauben
      if (eventName !== 'landing_js_error' && !this.errorTrackingAttempted) {
        this.errorTrackingAttempted = true;
        try {
          this.clarity.event('landing_js_error');
        } catch (e) {
          // Silent fail - Clarity ist komplett kaputt
        }
      }
    }
  }
}
