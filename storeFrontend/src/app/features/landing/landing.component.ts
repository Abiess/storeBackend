import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VideoPlaceholderComponent } from './video-placeholder.component';
import {TranslatePipe} from "@app/core/pipes/translate.pipe";

@Component({
  selector: 'app-landing',
  standalone: true,
    imports: [CommonModule, VideoPlaceholderComponent, TranslatePipe],
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
      icon: '🎨',
      title: 'landing.featureItems.customDesign.title',
      description: 'landing.featureItems.customDesign.description'
    },
    {
      icon: '💳',
      title: 'landing.featureItems.securePayments.title',
      description: 'landing.featureItems.securePayments.description'
    },
    {
      icon: '📊',
      title: 'landing.featureItems.analytics.title',
      description: 'landing.featureItems.analytics.description'
    },
    {
      icon: '🚚',
      title: 'landing.featureItems.shipping.title',
      description: 'landing.featureItems.shipping.description'
    },
    {
      icon: '📱',
      title: 'landing.featureItems.mobileFirst.title',
      description: 'landing.featureItems.mobileFirst.description'
    },
    {
      icon: '🔒',
      title: 'landing.featureItems.security.title',
      description: 'landing.featureItems.security.description'
    }
  ];

  tutorials = [
    {
      icon: '👤',
      title: 'landing.tutorialItems.createAccount.title',
      description: 'landing.tutorialItems.createAccount.description',
      videoUrl: 'assets/videos/02-how-to-register.cy.ts.mp4',
      duration: 'landing.tutorialItems.createAccount.duration'
    },
    {
      icon: '📦',
      title: 'landing.tutorialItems.createFirstProduct.title',
      description: 'landing.tutorialItems.createFirstProduct.description',
      videoUrl: 'assets/videos/03-how-to-create-product.cy.ts.mp4',
      duration: 'landing.tutorialItems.createFirstProduct.duration'
    },
    {
      icon: '🎨',
      title: 'landing.tutorialItems.customizeStore.title',
      description: 'landing.tutorialItems.customizeStore.description',
      videoUrl: 'assets/videos/04-how-to-customize-store.cy.ts.mp4',
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

  toggleComparison(): void {
    this.showComparison = !this.showComparison;
  }

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
}
