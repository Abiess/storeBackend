import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from "@app/core/pipes/translate.pipe";
import { VideoPlayerComponent } from "@app/features/landing/video-player.component";
import {
  LucideAngularModule
} from 'lucide-angular';
// Icons global registriert via LUCIDE_ICONS in app.config.ts

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, TranslatePipe, VideoPlayerComponent, LucideAngularModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent {
  showComparison = false;

  stats = [
    { value: '10K+', label: 'landing.stats.activeShops' },
    { value: '50M+', label: 'landing.stats.transactions' },
    { value: '99.9%', label: 'landing.stats.uptime' },
    { value: '24/7', label: 'landing.stats.support' }
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
      videoUrl: 'assets/videos/platform-demo.webm',
      duration: 'landing.tutorialItems.createAccount.duration'
    },
    {
      icon: 'package',
      title: 'landing.tutorialItems.createFirstProduct.title',
      description: 'landing.tutorialItems.createFirstProduct.description',
      videoUrl: 'assets/videos/platform-demo.webm',
      duration: 'landing.tutorialItems.createFirstProduct.duration'
    },
    {
      icon: 'palette',
      title: 'landing.tutorialItems.customizeStore.title',
      description: 'landing.tutorialItems.customizeStore.description',
      videoUrl: 'assets/videos/platform-demo.webm',
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
  constructor(private router: Router) {}

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  toggleComparison(): void { /* nicht mehr verwendet */ }

  navigateToRegister(storeType?: 'own-store' | 'reseller'): void {
    if (storeType) {
      // Store the choice in localStorage for later use
      localStorage.setItem('preferredStoreType', storeType);
    }
    this.router.navigate(['/register']);
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  /** Schnellstart-Flow: Store ohne E-Mail via WhatsApp/Telegram */
  navigateToQuickStart(): void {
    this.router.navigate(['/quick-start']);
  }
}
