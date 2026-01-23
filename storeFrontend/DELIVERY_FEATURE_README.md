# Liefereinstellungen Feature - Angular

Vollständige Implementierung des Liefereinstellungen-Features mit allen technischen Anforderungen.

## 📦 Erstellte Dateien

### Models
- `src/app/core/models/delivery.model.ts` - TypeScript Interfaces für alle Lieferentitäten

### Services (mit RxJS State Management)
- `src/app/core/services/delivery-settings.service.ts` - Verwaltung der allgemeinen Liefereinstellungen
- `src/app/core/services/delivery-providers.service.ts` - Verwaltung der Lieferanbieter
- `src/app/core/services/delivery-zones.service.ts` - Verwaltung der Versandzonen
- `src/app/core/services/toast.service.ts` - Toast-Benachrichtigungen

### Components
- `src/app/features/delivery/delivery-management.component.ts` - Hauptkomponente mit Listen-Ansicht
- `src/app/shared/components/toast-container.component.ts` - Toast-Benachrichtigungen UI

### Dialoge (mit Reactive Forms)
- `src/app/features/delivery/dialogs/delivery-settings-dialog.component.ts`
- `src/app/features/delivery/dialogs/delivery-provider-dialog.component.ts`
- `src/app/features/delivery/dialogs/delivery-zone-dialog.component.ts`

### Routing
- `src/app/features/delivery/delivery.routes.ts`

## ✅ Erfüllte Anforderungen

### Angular Services
- ✅ **DeliverySettingsService** - CRUD Operationen für Liefereinstellungen
- ✅ **DeliveryProvidersService** - Verwaltung von Lieferanbietern (DHL, UPS, etc.)
- ✅ **DeliveryZonesService** - Versandzonen mit Ländern und Tarifen
- ✅ Alle Services nutzen BehaviorSubject für State Management
- ✅ Observable-basierte API mit RxJS operators (tap, takeUntil)

### Reactive Forms + Validators
- ✅ FormBuilder und FormGroup in allen Dialogen
- ✅ Built-in Validators: required, min, maxLength, pattern
- ✅ Custom Validators: deliveryTimeValidator (Max > Min)
- ✅ Real-time Form Validation mit mat-error Messages
- ✅ Disabled Submit-Button bei ungültigem Formular

### UI Komponenten
- ✅ **Listen-Ansicht** mit Settings, Providers und Zones
- ✅ **Dialoge** für Create/Edit Operationen
- ✅ **Confirm Delete** mit nativen Dialogen
- ✅ Badges für Status-Anzeige (Aktiv/Inaktiv)
- ✅ Responsive Design mit Grid/Flexbox

### Loading & Error States
- ✅ Loading-Spinner während Datenladung
- ✅ Error-Container mit Retry-Funktion
- ✅ Empty States für leere Listen
- ✅ Toast-Benachrichtigungen für Erfolg/Fehler

### State Management
- ✅ Subject/BehaviorSubject Pattern in Services
- ✅ takeUntil für Subscription Management
- ✅ Automatic Cleanup in ngOnDestroy
- ✅ Optimistic UI Updates

### Material Design Integration
- ✅ MatDialog für modale Dialoge
- ✅ MatFormField, MatInput für Formulare
- ✅ MatCheckbox für Boolean-Werte
- ✅ MatChips für Länder-Tags
- ✅ MatButton für Aktionen

## 🎯 Features

### Allgemeine Einstellungen
- Lieferung aktivieren/deaktivieren
- Standard-Lieferanbieter festlegen
- Geschätzte Lieferzeit (Min/Max Tage)
- Kostenloser Versand ab Betrag
- Währung konfigurieren

### Lieferanbieter
- Name und eindeutiger Code
- API-Credentials (Key/Secret)
- Tracking-URL Template mit Platzhaltern
- Aktivierung/Deaktivierung
- Prioritäts-Verwaltung

### Versandzonen
- Name der Zone
- Mehrere Länder (ISO-2 Codes)
- Versandkosten pro Zone
- Kostenloser Versand Schwellenwert
- Lieferzeit-Schätzung
- Prioritäts-Verwaltung

## 🔧 Integration

### 1. Routing einbinden

Füge in `app.routes.ts` hinzu:

```typescript
{
  path: 'dashboard/stores/:storeId/delivery',
  loadChildren: () => import('./features/delivery/delivery.routes').then(m => m.deliveryRoutes),
  canActivate: [authGuard]
}
```

### 2. Toast Container hinzufügen

In `app.component.ts`:

```typescript
import { ToastContainerComponent } from './shared/components/toast-container.component';

@Component({
  // ...
  imports: [RouterOutlet, ToastContainerComponent],
  template: `
    <router-outlet></router-outlet>
    <app-toast-container></app-toast-container>
  `
})
```

### 3. Angular Material konfigurieren

Stelle sicher, dass folgende Module installiert sind:

```bash
npm install @angular/material @angular/cdk
```

### 4. Models exportieren

Die Datei `src/app/core/models/index.ts` wurde bereits erstellt und exportiert die Delivery-Models.

## 🎨 Styling

Die Components nutzen:
- Inline Styles für bessere Component-Isolation
- CSS Grid und Flexbox für Layouts
- Konsistente Farbpalette (Tailwind-inspiriert)
- Responsive Design
- Hover-States und Transitions

## 🔐 Sicherheit

- Alle API-Calls nutzen bestehende HTTP Interceptors
- Auth Guard kann für Routen verwendet werden
- Permission Guard für rollenbasierte Zugriffskontrolle
- Sensitive Daten (API Keys) als password-Input

## 📝 Verwendung

```typescript
// Service in Component injizieren
constructor(
  private deliverySettingsService: DeliverySettingsService,
  private deliveryProvidersService: DeliveryProvidersService,
  private deliveryZonesService: DeliveryZonesService,
  private toastService: ToastService
) {}

// Einstellungen laden
this.deliverySettingsService.getDeliverySettings(storeId)
  .subscribe(settings => {
    console.log('Settings:', settings);
  });

// Provider erstellen
this.deliveryProvidersService.createProvider(storeId, {
  name: 'DHL Express',
  code: 'dhl-express',
  enabled: true,
  priority: 1
}).subscribe(() => {
  this.toastService.success('Provider erstellt');
});
```

## 🧪 Testing

Die Services sind testbar durch:
- Dependency Injection
- Observable-basierte API
- Keine direkten DOM-Manipulationen
- Mockable HttpClient

## 📚 Weitere Schritte

1. Backend-Endpoints implementieren
2. Unit Tests schreiben
3. E2E Tests mit Cypress
4. Internationalisierung (i18n)
5. Permission Guards hinzufügen
6. Mock Services für Entwicklung
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div *ngFor="let toast of toasts; trackBy: trackByIndex" 
           class="toast" 
           [class.toast-success]="toast.type === 'success'"
           [class.toast-error]="toast.type === 'error'"
           [class.toast-warning]="toast.type === 'warning'"
           [class.toast-info]="toast.type === 'info'"
           [@slideIn]>
        <div class="toast-icon">
          <span *ngIf="toast.type === 'success'">✓</span>
          <span *ngIf="toast.type === 'error'">✕</span>
          <span *ngIf="toast.type === 'warning'">⚠</span>
          <span *ngIf="toast.type === 'info'">ℹ</span>
        </div>
        <div class="toast-message">{{ toast.message }}</div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      background: white;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .toast-icon {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-weight: bold;
      font-size: 16px;
    }

    .toast-success {
      border-left: 4px solid #10b981;
    }

    .toast-success .toast-icon {
      background: #d1fae5;
      color: #065f46;
    }

    .toast-error {
      border-left: 4px solid #ef4444;
    }

    .toast-error .toast-icon {
      background: #fee2e2;
      color: #991b1b;
    }

    .toast-warning {
      border-left: 4px solid #f59e0b;
    }

    .toast-warning .toast-icon {
      background: #fef3c7;
      color: #92400e;
    }

    .toast-info {
      border-left: 4px solid #3b82f6;
    }

    .toast-info .toast-icon {
      background: #dbeafe;
      color: #1e40af;
    }

    .toast-message {
      flex: 1;
      font-size: 14px;
      color: #374151;
    }
  `]
})
export class ToastContainerComponent implements OnInit {
  toasts: Toast[] = [];

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.toastService.toast$.subscribe(toast => {
      this.toasts.push(toast);
      
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t !== toast);
      }, toast.duration || 3000);
    });
  }

  trackByIndex(index: number): number {
    return index;
  }
}

