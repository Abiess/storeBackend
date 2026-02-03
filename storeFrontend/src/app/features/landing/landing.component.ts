import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VideoPlaceholderComponent } from './video-placeholder.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, VideoPlaceholderComponent],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent {
  showComparison = false;

  stats = [
    { value: '10K+', label: 'Aktive Shops' },
    { value: '50M+', label: 'Transaktionen' },
    { value: '99.9%', label: 'Verfügbarkeit' },
    { value: '24/7', label: 'Support' }
  ];

  features = [
    {
      icon: '🎨',
      title: 'Anpassbares Design',
      description: 'Erstellen Sie Ihren einzigartigen Shop mit unseren professionellen Vorlagen und Anpassungsoptionen.'
    },
    {
      icon: '💳',
      title: 'Sichere Zahlungen',
      description: 'Integrierte Zahlungsabwicklung mit den wichtigsten Zahlungsmethoden und höchster Sicherheit.'
    },
    {
      icon: '📊',
      title: 'Analytics & Reporting',
      description: 'Verfolgen Sie Ihre Verkäufe, Kunden und Performance mit detaillierten Analysen in Echtzeit.'
    },
    {
      icon: '🚚',
      title: 'Versandintegration',
      description: 'Automatische Integration mit führenden Versanddienstleistern für optimierte Logistik.'
    },
    {
      icon: '📱',
      title: 'Mobile-First',
      description: 'Perfekt optimiert für mobile Geräte - Ihre Kunden kaufen überall und jederzeit ein.'
    },
    {
      icon: '🔒',
      title: 'SSL & Sicherheit',
      description: 'Höchste Sicherheitsstandards mit SSL-Verschlüsselung und automatischen Backups.'
    }
  ];

  tutorials = [
    {
      icon: '👤',
      title: 'Account erstellen',
      description: 'Lernen Sie, wie Sie in 2 Minuten Ihren eigenen Shop-Account anlegen',
      videoUrl: 'assets/videos/02-how-to-register.cy.ts.mp4',
      duration: '2:00 min'
    },
    {
      icon: '📦',
      title: 'Erstes Produkt anlegen',
      description: 'Schritt-für-Schritt Anleitung zum Hinzufügen Ihres ersten Produkts',
      videoUrl: 'assets/videos/03-how-to-create-product.cy.ts.mp4',
      duration: '2:30 min'
    },
    {
      icon: '🎨',
      title: 'Shop anpassen',
      description: 'Personalisieren Sie das Design und die Einstellungen Ihres Shops',
      videoUrl: 'assets/videos/04-how-to-customize-store.cy.ts.mp4',
      duration: '3:00 min'
    }
  ];

  plans = [
    {
      name: 'Starter',
      description: 'Perfekt für neue Unternehmen',
      price: '0',
      period: '/Monat',
      cta: 'Kostenlos starten',
      features: [
        'Bis zu 10 Produkte',
        'Eigene Domain',
        'SSL-Zertifikat',
        'E-Mail-Support',
        '99.9% Verfügbarkeit'
      ],
      highlighted: false
    },
    {
      name: 'Professional',
      description: 'Für wachsende Unternehmen',
      price: '29',
      period: '/Monat',
      badge: 'Beliebt',
      cta: 'Jetzt starten',
      features: [
        'Unbegrenzte Produkte',
        'Eigene Domain',
        'SSL-Zertifikat',
        'Prioritäts-Support',
        'Analytics & Reports',
        'Marketing-Tools',
        'API-Zugang'
      ],
      highlighted: true
    },
    {
      name: 'Enterprise',
      description: 'Für große Unternehmen',
      price: '99',
      period: '/Monat',
      cta: 'Kontakt aufnehmen',
      features: [
        'Alles aus Professional',
        'Dedizierter Account Manager',
        '24/7 Premium Support',
        'Custom Integration',
        'White-Label Option',
        'SLA Garantie',
        'Schulungen & Onboarding'
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
