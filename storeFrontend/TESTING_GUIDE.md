# Testing Guide - E-Commerce System

Dieses Dokument zeigt, wie Sie das gesamte System (Warenkorb, Checkout, Rollen & Berechtigungen) testen können.

## 🚀 Schnellstart

### 1. Mock-Modus aktivieren

Stellen Sie sicher, dass in `src/environments/environment.ts` der Mock-Modus aktiviert ist:

```typescript
export const environment = {
  production: false,
  useMockData: true,  // ← Muss auf true sein!
  apiUrl: 'http://localhost:8080/api',
  publicApiUrl: 'http://localhost:8080/api/public'
};
```

### 2. Anwendung starten

```bash
cd storeFrontend
npm install
ng serve
```

Öffnen Sie: `http://localhost:4200`

## 📋 Test-Szenarien

### Szenario 1: Warenkorb-Funktionalität testen

#### Schritt 1: Zum Storefront navigieren
```
URL: http://localhost:4200/storefront/1
```

**Was Sie sehen sollten:**
- ✅ Produktliste mit Mock-Produkten
- ✅ Warenkorb-Badge zeigt "0" an
- ✅ "In den Warenkorb" Buttons

#### Schritt 2: Produkte zum Warenkorb hinzufügen
1. Klicken Sie auf "In den Warenkorb" bei einem Produkt
2. Alert erscheint: "✅ [Produktname] wurde zum Warenkorb hinzugefügt!"
3. Warenkorb-Badge aktualisiert sich (z.B. "1")

**Erwartetes Verhalten:**
- Badge zeigt korrekte Anzahl
- Button zeigt kurz "Wird hinzugefügt..."
- Nach Erfolg wieder "In den Warenkorb"

#### Schritt 3: Warenkorb öffnen
1. Klicken Sie auf das Warenkorb-Icon (🛒)
2. Sie werden zu `/cart` weitergeleitet

**Was Sie sehen sollten:**
- Liste aller Artikel im Warenkorb
- Produktbild, Name, Variante, Preis
- Mengen-Steuerung (+/-)
- "Entfernen" Button
- Zusammenfassung mit Zwischensumme, Versand, Gesamt

#### Schritt 4: Warenkorb-Funktionen testen
- **Menge erhöhen:** Klicken Sie auf "+" → Preis aktualisiert sich
- **Menge verringern:** Klicken Sie auf "-" → Preis aktualisiert sich
- **Artikel entfernen:** Klicken Sie auf "🗑️ Entfernen" → Bestätigen → Artikel wird entfernt
- **Warenkorb leeren:** Klicken Sie auf "Warenkorb leeren" → Bestätigen → Alle Artikel entfernt

### Szenario 2: Checkout-Prozess testen

#### Schritt 1: Artikel im Warenkorb haben
Stellen Sie sicher, dass mindestens 1 Artikel im Warenkorb ist.

#### Schritt 2: Zur Kasse gehen
Klicken Sie auf "Zur Kasse" Button

**Was Sie sehen sollten:**
```
URL: http://localhost:4200/checkout
```
- Formular mit mehreren Abschnitten
- Bestellübersicht rechts

#### Schritt 3: Formular ausfüllen

**Kontaktinformationen:**
```
E-Mail: test@example.com
```

**Lieferadresse:**
```
Vorname: Max
Nachname: Mustermann
Straße: Musterstraße 123
PLZ: 12345
Stadt: Berlin
Land: Deutschland
Telefon: 0123456789
```

**Rechnungsadresse:**
- ☑️ "Rechnungsadresse ist identisch mit Lieferadresse" anhaken
- ODER separate Adresse eingeben

**Anmerkungen (optional):**
```
Bitte an der Haustür klingeln
```

#### Schritt 4: Bestellung abschicken
Klicken Sie auf "Zahlungspflichtig bestellen"

**Erwartetes Verhalten:**
- Button zeigt "Bestellung wird aufgegeben..."
- Nach ~800ms Weiterleitung zur Bestellbestätigung

### Szenario 3: Bestellbestätigung testen

**Was Sie sehen sollten:**
```
URL: http://localhost:4200/order-confirmation?orderNumber=ORD-2025-01000&email=test@example.com
```

**Inhalt:**
- ✅ Bestellnummer (z.B. ORD-2025-01000)
- ✅ Status-Badge (PENDING)
- ✅ Kundendaten
- ✅ Lieferadresse
- ✅ Rechnungsadresse
- ✅ Bestellte Artikel mit Preisen
- ✅ Zwischensumme, Versand, Gesamtpreis
- ✅ Bestelldatum
- ✅ "Bestellung drucken" Button
- ✅ "Zurück zum Shop" Button

**Funktionen testen:**
- Klicken Sie auf "Bestellung drucken" → Druckvorschau öffnet sich
- Klicken Sie auf "Zurück zum Shop" → Zurück zum Storefront

### Szenario 4: Rollen & Berechtigungen testen

#### Option A: Rollenverwaltungs-UI verwenden

**Route hinzufügen:**
In `app.routes.ts` fügen Sie hinzu:
```typescript
{
  path: 'role-management',
  loadComponent: () => import('./features/settings/role-management.component').then(m => m.RoleManagementComponent)
}
```

**Navigieren zu:**
```
http://localhost:4200/role-management
```

**Was Sie sehen sollten:**
- Liste der Store-Rollen (User 1-4)
- Liste der Domain-Zugriffe
- Formulare zum Zuweisen/Entziehen
- Rollen-Übersicht mit Beschreibungen

**Aktionen testen:**
1. **Neue Rolle zuweisen:**
   - User ID: 5
   - Rolle: STORE_STAFF
   - Klick auf "Zuweisen"
   - Neue Rolle erscheint in der Liste

2. **Rolle entfernen:**
   - Klick auf "Entfernen" bei einer Rolle
   - Bestätigen
   - Rolle verschwindet

3. **Domain-Zugriff gewähren:**
   - User ID: 6
   - Rolle: STORE_MANAGER
   - ☑️ Verwalten
   - Klick auf "Zugriff gewähren"

#### Option B: Berechtigungen im Code testen

**Test-Komponente erstellen:**

```typescript
// test-permissions.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoleService } from '@app/core/services/role.service';
import { Permission, UserRole } from '@app/core/models';

@Component({
  selector: 'app-test-permissions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="test-container">
      <h1>Berechtigungs-Tests</h1>
      
      <div class="test-section">
        <h2>Test 1: Einzelne Berechtigung prüfen</h2>
        <button (click)="testSinglePermission()">Testen</button>
        <p>{{ test1Result }}</p>
      </div>

      <div class="test-section">
        <h2>Test 2: Mehrere Berechtigungen prüfen</h2>
        <button (click)="testMultiplePermissions()">Testen</button>
        <p>{{ test2Result }}</p>
      </div>

      <div class="test-section">
        <h2>Test 3: Rolle zuweisen</h2>
        <button (click)="testAssignRole()">Testen</button>
        <p>{{ test3Result }}</p>
      </div>

      <div class="test-section">
        <h2>Test 4: Domain-Zugriff prüfen</h2>
        <button (click)="testDomainAccess()">Testen</button>
        <p>{{ test4Result }}</p>
      </div>
    </div>
  `,
  styles: [`
    .test-container { padding: 20px; }
    .test-section { 
      margin: 20px 0; 
      padding: 15px; 
      border: 1px solid #ccc; 
      border-radius: 8px;
    }
    button { 
      padding: 10px 20px; 
      background: #667eea; 
      color: white; 
      border: none; 
      border-radius: 4px; 
      cursor: pointer;
    }
    p { margin-top: 10px; color: #333; }
  `]
})
export class TestPermissionsComponent implements OnInit {
  test1Result = '';
  test2Result = '';
  test3Result = '';
  test4Result = '';

  constructor(private roleService: RoleService) {}

  ngOnInit(): void {}

  testSinglePermission(): void {
    const userId = 1;
    const storeId = 1;
    
    this.roleService.hasPermission(userId, storeId, Permission.PRODUCT_CREATE)
      .subscribe(hasPermission => {
        this.test1Result = hasPermission 
          ? '✅ User 1 kann Produkte erstellen'
          : '❌ User 1 kann KEINE Produkte erstellen';
      });
  }

  testMultiplePermissions(): void {
    const userId = 3; // STORE_MANAGER
    const storeId = 1;
    
    this.roleService.hasPermissions(userId, storeId, [
      Permission.PRODUCT_CREATE,
      Permission.STORE_DELETE
    ]).subscribe(hasAll => {
      this.test2Result = hasAll
        ? '✅ User 3 hat BEIDE Berechtigungen'
        : '❌ User 3 hat NICHT beide Berechtigungen (erwartet!)';
    });
  }

  testAssignRole(): void {
    const userId = 10;
    const storeId = 1;
    
    this.roleService.assignStoreRole(userId, storeId, UserRole.STORE_STAFF)
      .subscribe(role => {
        this.test3Result = `✅ Rolle zugewiesen: User ${role.userId} ist jetzt ${role.role}`;
      });
  }

  testDomainAccess(): void {
    const userId = 1;
    const domainId = 1;
    
    this.roleService.canManageDomain(userId, domainId)
      .subscribe(canManage => {
        this.test4Result = canManage
          ? '✅ User 1 kann Domain 1 verwalten'
          : '❌ User 1 kann Domain 1 NICHT verwalten';
      });
  }
}
```

**Route hinzufügen:**
```typescript
{
  path: 'test-permissions',
  loadComponent: () => import('./test-permissions.component')
}
```

**Navigieren zu:**
```
http://localhost:4200/test-permissions
```

## 🧪 Browser DevTools Testing

### Console Tests

Öffnen Sie die Browser Console (F12) und führen Sie aus:

```javascript
// 1. Session ID prüfen
localStorage.getItem('cart_session_id')
// Sollte etwas wie "session-abc123-1234567890" zurückgeben

// 2. Warenkorb im Local Storage
// (Der Mock-Service speichert nur im Memory, aber Sie können die Session ID sehen)

// 3. Angular Component Inspector
// Öffnen Sie Angular DevTools (Chrome Extension)
// Inspizieren Sie die StorefrontComponent
// Schauen Sie sich cartItemCount, sessionId, products an
```

### Network Tab Tests

1. Öffnen Sie DevTools → Network Tab
2. Führen Sie Aktionen aus
3. **Im Mock-Modus:** Sie sehen KEINE HTTP-Requests
4. **Mit echtem Backend:** Sie würden XHR/Fetch Requests sehen

## 📊 Erwartete Mock-Daten

### Vordefinierte Store-Rollen

| User ID | Store ID | Rolle | Beschreibung |
|---------|----------|-------|--------------|
| 1 | 1 | STORE_OWNER | Kann alles im Store 1 |
| 2 | 1 | STORE_ADMIN | Fast alles im Store 1 |
| 3 | 1 | STORE_MANAGER | Produkte & Bestellungen |
| 4 | 2 | STORE_OWNER | Kann alles im Store 2 |

### Vordefinierte Domain-Zugriffe

| User ID | Domain ID | Rolle | Verwalten | Verifizieren |
|---------|-----------|-------|-----------|--------------|
| 1 | 1 | STORE_OWNER | ✅ | ✅ |
| 2 | 1 | STORE_ADMIN | ✅ | ✅ |
| 3 | 1 | STORE_MANAGER | ❌ | ❌ |

### Mock-Produkte

Die Mock-Produkte werden in `mock-data.ts` definiert:
- Produkt 1: T-Shirt (mehrere Varianten)
- Produkt 2: Jeans
- Produkt 3: Sneakers
- etc.

## 🔍 Debugging-Tipps

### Problem: Warenkorb-Badge zeigt nicht die richtige Anzahl

**Lösung:**
1. Überprüfen Sie die Console auf Fehler
2. Prüfen Sie ob `loadCartCount()` aufgerufen wird
3. Setzen Sie einen Breakpoint in `addToCart()` Methode
4. Überprüfen Sie `sessionId` in der Komponente

### Problem: Checkout schlägt fehl

**Lösung:**
1. Prüfen Sie ob Formular valide ist
2. Schauen Sie in Console nach Fehlern
3. Überprüfen Sie ob `sessionId` gesetzt ist
4. Debuggen Sie `MockCheckoutService.checkout()`

### Problem: Berechtigungen funktionieren nicht

**Lösung:**
1. Prüfen Sie `useMockData = true` in environment
2. Überprüfen Sie User ID (aktuell hardcoded als 1)
3. Schauen Sie in `ROLE_PERMISSIONS_MAP`
4. Testen Sie mit verschiedenen User IDs

## 📝 Test-Checkliste

### Warenkorb
- [ ] Produkt hinzufügen
- [ ] Badge aktualisiert sich
- [ ] Warenkorb öffnen
- [ ] Menge erhöhen
- [ ] Menge verringern
- [ ] Artikel entfernen
- [ ] Warenkorb leeren
- [ ] Zurück zum Shop

### Checkout
- [ ] Formular öffnet sich
- [ ] E-Mail validieren
- [ ] Pflichtfelder prüfen
- [ ] "Gleiche Rechnungsadresse" Toggle
- [ ] Bestellung absenden
- [ ] Weiterleitung zur Bestätigung

### Bestellbestätigung
- [ ] Bestellnummer angezeigt
- [ ] Kundendaten korrekt
- [ ] Artikel-Liste korrekt
- [ ] Preise korrekt
- [ ] Drucken funktioniert
- [ ] Zurück zum Shop

### Rollen & Berechtigungen
- [ ] Store-Rollen anzeigen
- [ ] Rolle zuweisen
- [ ] Rolle entfernen
- [ ] Domain-Zugriff gewähren
- [ ] Domain-Zugriff entziehen
- [ ] Berechtigungen prüfen
- [ ] Guards funktionieren
- [ ] Direktive versteckt Elemente

## 🎯 Erweiterte Tests

### Performance-Test

```typescript
// Messen Sie die Zeit für Warenkorb-Operationen
console.time('addToCart');
this.cartService.addItem({...}).subscribe(() => {
  console.timeEnd('addToCart');
  // Sollte < 500ms sein (mit delay)
});
```

### Stress-Test

```typescript
// Fügen Sie viele Produkte hinzu
for (let i = 0; i < 10; i++) {
  this.addToCart(product);
}
// Prüfen Sie ob Badge korrekt zählt
```

### Edge Cases

1. **Leerer Warenkorb zur Kasse:**
   - Sollte Fehlermeldung zeigen

2. **Ungültige E-Mail:**
   - Formular sollte nicht submitten

3. **Bestellung ohne Artikel:**
   - Sollte verhindert werden

4. **Nicht existierende Bestellnummer:**
   - Sollte Fehler zeigen

## 📞 Support

Bei Problemen:
1. Schauen Sie in die Console (F12)
2. Prüfen Sie `useMockData` in environment
3. Lesen Sie `ROLE_PERMISSIONS_GUIDE.md`
4. Überprüfen Sie die Mock-Services

## 🎉 Erfolgreicher Test

Wenn alle Punkte funktionieren:
- ✅ Warenkorb-System läuft
- ✅ Checkout funktioniert
- ✅ Bestellbestätigung wird angezeigt
- ✅ Rollen & Berechtigungen arbeiten korrekt

**Herzlichen Glückwunsch!** Das System ist vollständig funktionsfähig! 🚀

