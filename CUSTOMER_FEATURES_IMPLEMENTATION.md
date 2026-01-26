# Customer Features Implementation Guide

## 📋 Übersicht

Diese Dokumentation beschreibt die Implementierung von vier wichtigen Customer-Features für die E-Commerce-Plattform:

1. **Bestellhistorie** - Vollständige Übersicht über alle Kundenbestellungen
2. **Adressbuch** - Verwaltung von Liefer- und Rechnungsadressen
3. **Wishlist/Favoriten** - Speichern von gewünschten Produkten
4. **Saved Carts** - Speichern von Warenkörben für späteren Kauf

## 🎯 Implementierte Komponenten

### 1. Models (`src/app/core/models.ts`)

Neue Interfaces wurden hinzugefügt:

#### Adressbuch
- `CustomerAddress` - Kundenadresse mit Typ (Versand/Rechnung)
- `CreateAddressRequest` - Request für neue Adressen

#### Wishlist
- `Wishlist` - Wunschliste mit Items
- `WishlistItem` - Einzelnes Produkt in der Wishlist
- `CreateWishlistRequest` - Neue Wishlist erstellen
- `AddToWishlistRequest` - Produkt zur Wishlist hinzufügen

#### Saved Carts
- `SavedCart` - Gespeicherter Warenkorb
- `SavedCartItem` - Item im gespeicherten Warenkorb
- `CreateSavedCartRequest` - Warenkorb speichern
- `SavedCartToCartRequest` - Warenkorb wiederherstellen

#### Order History
- `OrderHistoryFilter` - Filter für Bestellhistorie
- `OrderHistoryResponse` - Response mit Pagination
- `OrderDetail` - Erweiterte Bestelldetails

### 2. Services

#### AddressBookService (`src/app/core/services/address-book.service.ts`)
```typescript
// Alle Adressen abrufen
getAddresses(customerId: number): Observable<CustomerAddress[]>

// Adresse erstellen
createAddress(customerId: number, request: CreateAddressRequest): Observable<CustomerAddress>

// Adresse aktualisieren
updateAddress(customerId: number, addressId: number, request: Partial<CreateAddressRequest>)

// Adresse löschen
deleteAddress(customerId: number, addressId: number): Observable<void>

// Als Standard setzen
setDefaultAddress(customerId: number, addressId: number): Observable<CustomerAddress>
```

#### WishlistService (`src/app/core/services/wishlist.service.ts`)
```typescript
// Wishlists abrufen
getWishlists(storeId: number): Observable<Wishlist[]>

// Standard-Wishlist abrufen
getDefaultWishlist(storeId: number): Observable<Wishlist>

// Produkt hinzufügen
addToWishlist(storeId: number, request: AddToWishlistRequest): Observable<WishlistItem>

// Produkt entfernen
removeFromWishlist(storeId: number, wishlistId: number, itemId: number): Observable<void>

// Alle Items in Warenkorb verschieben
moveWishlistToCart(storeId: number, wishlistId: number): Observable<void>
```

#### SavedCartService (`src/app/core/services/saved-cart.service.ts`)
```typescript
// Gespeicherte Warenkörbe abrufen
getSavedCarts(storeId: number): Observable<SavedCart[]>

// Aktuellen Warenkorb speichern
saveCurrentCart(request: CreateSavedCartRequest): Observable<SavedCart>

// Warenkorb wiederherstellen
restoreSavedCart(storeId: number, request: SavedCartToCartRequest): Observable<void>

// Gespeicherten Warenkorb löschen
deleteSavedCart(storeId: number, savedCartId: number): Observable<void>
```

#### OrderHistoryService (`src/app/core/services/order-history.service.ts`)
```typescript
// Bestellhistorie mit Filter
getOrderHistory(filter: OrderHistoryFilter): Observable<OrderHistoryResponse>

// Bestelldetails abrufen
getOrderDetail(storeId: number, orderId: number): Observable<OrderDetail>

// Bestellung stornieren
cancelOrder(storeId: number, orderId: number, reason?: string): Observable<Order>

// Bestellung erneut aufgeben
reorderOrder(storeId: number, orderId: number): Observable<void>

// Rechnung herunterladen
downloadInvoice(storeId: number, orderId: number): Observable<Blob>

// Kundenstatistiken
getCustomerStats(storeId: number, customerId: number): Observable<Stats>
```

### 3. Komponenten

#### Customer Dashboard (`src/app/features/customer/customer-dashboard.component.ts`)
- Übersichtsseite mit allen Customer-Features
- Statistiken: Anzahl Bestellungen, Gesamtausgaben, etc.
- Schnellzugriff auf alle Features

#### Order History (`src/app/features/customer/order-history.component.ts`)
- Vollständige Bestellhistorie mit Pagination
- Filter nach Status, Datum, Suchbegriff
- Bestelldetails anzeigen
- Bestellung stornieren (falls möglich)
- Bestellung erneut aufgeben (Reorder)
- Rechnung herunterladen

#### Wishlist (`src/app/features/customer/wishlist.component.ts`)
- Mehrere Wishlists möglich
- Produkte mit Priorität (Low/Medium/High)
- Notizen zu Produkten
- Alle Items in Warenkorb verschieben
- Einzelne Items in Warenkorb legen

#### Saved Carts (`src/app/features/customer/saved-carts.component.ts`)
- Warenkörbe speichern mit Name und Beschreibung
- Warenkörbe wiederherstellen
- Mit aktuellem Warenkorb zusammenführen
- Ablaufdatum-Warnung für abgelaufene Warenkörbe

#### Address Book (`src/app/features/customer/address-book.component.ts`)
- Liefer- und Rechnungsadressen verwalten
- Standard-Adressen festlegen
- Adressen bearbeiten und löschen
- Formular mit Validierung

## 🛣️ Routing

Die folgenden Routen wurden hinzugefügt (`src/app/app.routes.ts`):

```typescript
// Customer Account Routes (alle mit authGuard geschützt)
/customer                    -> Customer Dashboard
/customer/orders            -> Bestellhistorie
/customer/wishlist          -> Wunschliste
/customer/saved-carts       -> Gespeicherte Warenkörbe
/customer/addresses         -> Adressbuch
```

## 🎨 Styling

Alle Komponenten haben eigene SCSS-Dateien mit:
- Responsive Design (Mobile-First)
- Moderne Card-basierte Layouts
- Hover-Effekte und Animationen
- Loading States und Empty States
- Farbcodierte Status-Badges

### Design-Highlights

#### Customer Dashboard
- Gradient-Statistik-Karten
- Farbcodierte Quick-Action-Buttons
- Spending Summary mit Chart-Icon

#### Order History
- Status-Badges mit Farben (Pending, Shipped, Delivered, etc.)
- Pagination
- Filter-Funktionalität
- Action-Buttons für Reorder, Download Invoice, Cancel

#### Wishlist
- Prioritäts-Badges (High, Medium, Low)
- Produkt-Bilder mit Hover-Effekt
- Notiz-Anzeige
- Alle-in-Warenkorb-Button

#### Saved Carts
- Warenkorb-Vorschau mit ersten 3 Items
- Ablauf-Warnung für abgelaufene Warenkörbe
- Modal-Dialog zum Speichern
- Merge/Replace-Optionen

#### Address Book
- Grid-Layout für Adressen
- Adresstyp-Badges (Versand, Rechnung, Beide)
- Standard-Adresse-Badge
- Inline-Formular zum Bearbeiten

## 📡 Backend API Endpoints

Die Komponenten erwarten folgende Backend-Endpoints:

### Address Book
```
GET    /customers/{customerId}/addresses
GET    /customers/{customerId}/addresses/{addressId}
GET    /customers/{customerId}/addresses/default/shipping
GET    /customers/{customerId}/addresses/default/billing
POST   /customers/{customerId}/addresses
PUT    /customers/{customerId}/addresses/{addressId}
DELETE /customers/{customerId}/addresses/{addressId}
PUT    /customers/{customerId}/addresses/{addressId}/set-default
```

### Wishlist
```
GET    /stores/{storeId}/wishlists
GET    /stores/{storeId}/wishlists/default
GET    /stores/{storeId}/wishlists/{wishlistId}
POST   /stores/{storeId}/wishlists
PUT    /stores/{storeId}/wishlists/{wishlistId}
DELETE /stores/{storeId}/wishlists/{wishlistId}
POST   /stores/{storeId}/wishlists/{wishlistId}/items
DELETE /stores/{storeId}/wishlists/{wishlistId}/items/{itemId}
PUT    /stores/{storeId}/wishlists/{wishlistId}/items/{itemId}
GET    /stores/{storeId}/wishlists/check/{productId}
GET    /stores/{storeId}/wishlists/count
POST   /stores/{storeId}/wishlists/{wishlistId}/move-to-cart
```

### Saved Carts
```
GET    /stores/{storeId}/saved-carts
GET    /stores/{storeId}/saved-carts/{savedCartId}
POST   /stores/{storeId}/saved-carts
PUT    /stores/{storeId}/saved-carts/{savedCartId}
DELETE /stores/{storeId}/saved-carts/{savedCartId}
POST   /stores/{storeId}/saved-carts/{savedCartId}/restore
DELETE /stores/{storeId}/saved-carts/cleanup
```

### Order History
```
GET    /stores/{storeId}/customers/{customerId}/order-history
GET    /stores/{storeId}/orders/{orderId}/detail
POST   /stores/{storeId}/orders/{orderId}/cancel
POST   /stores/{storeId}/orders/{orderId}/reorder
POST   /stores/{storeId}/orders/{orderId}/return
GET    /stores/{storeId}/orders/{orderId}/invoice
GET    /stores/{storeId}/orders/{orderId}/tracking
GET    /stores/{storeId}/customers/{customerId}/stats
```

## 🔐 Authentifizierung

Alle Customer-Routen sind mit dem `authGuard` geschützt. Nicht authentifizierte Benutzer werden zur Login-Seite weitergeleitet.

## 📱 Responsive Design

Alle Komponenten sind vollständig responsive:
- **Desktop**: Multi-Column Grid Layouts
- **Tablet**: 2-Column Layouts
- **Mobile**: Single-Column Stacked Layouts

## 🚀 Verwendung

### Customer Dashboard aufrufen
```typescript
// In einer Komponente
this.router.navigate(['/customer']);
```

### Zur Wishlist hinzufügen
```typescript
// In einer Produkt-Komponente
this.wishlistService.addToWishlist(storeId, {
  wishlistId: defaultWishlistId,
  productId: product.id,
  priority: 'HIGH',
  note: 'Für Weihnachten'
}).subscribe();
```

### Warenkorb speichern
```typescript
this.savedCartService.saveCurrentCart({
  storeId: this.storeId,
  name: 'Weihnachtseinkauf 2024',
  description: 'Geschenke für Familie'
}).subscribe();
```

### Adresse hinzufügen
```typescript
this.addressBookService.createAddress(customerId, {
  firstName: 'Max',
  lastName: 'Mustermann',
  address1: 'Musterstraße 1',
  city: 'Berlin',
  postalCode: '10115',
  country: 'Deutschland',
  addressType: 'BOTH',
  isDefault: true
}).subscribe();
```

## ✅ Testing

Um die Features zu testen:

1. **Einloggen** als Kunde
2. **Navigiere zu** `/customer` für das Dashboard
3. **Teste** jede Funktion individuell
4. **Prüfe** die Responsive-Ansichten

## 🔄 Nächste Schritte

### Backend-Implementierung erforderlich
Die Backend-Endpoints müssen noch implementiert werden:

1. **Datenbank-Tabellen** erstellen:
   - `customer_addresses`
   - `wishlists`
   - `wishlist_items`
   - `saved_carts`
   - `saved_cart_items`

2. **Controller** implementieren:
   - AddressBookController
   - WishlistController
   - SavedCartController
   - Erweiterte OrderController-Endpoints

3. **Services** implementieren:
   - AddressBookService (Backend)
   - WishlistService (Backend)
   - SavedCartService (Backend)

### Mögliche Erweiterungen

- **E-Mail-Benachrichtigungen** bei Bestellstatus-Änderungen
- **Wishlist teilen** - Öffentliche Wishlists mit Share-Link
- **Automatische Saved Cart Bereinigung** (Cron-Job)
- **Adress-Validierung** mit externer API
- **Tracking-Integration** mit Versanddienstleistern
- **Retouren-Management** mit Workflow
- **Bewertungen** für Bestellungen und Produkte
- **Loyalty-Programm** basierend auf Bestellhistorie

## 📝 Hinweise

- Alle Komponenten sind **Standalone Components** (Angular 15+)
- Services verwenden **RxJS Observables**
- Formulare nutzen **Reactive Forms**
- Styling verwendet **SCSS mit BEM-Konventionen**
- Alle Texte sind auf **Deutsch**
- Loading States und Error Handling sind implementiert
- Empty States mit Call-to-Action Buttons

## 🎉 Zusammenfassung

Die Implementierung umfasst:
- ✅ 4 neue Services
- ✅ 5 neue Komponenten (inkl. Dashboard)
- ✅ 5 neue Routen
- ✅ Erweiterte Models
- ✅ Vollständiges UI/UX Design
- ✅ Responsive Design
- ✅ TypeScript Typsicherheit
- ✅ Dokumentation

Das Frontend ist **vollständig implementiert** und bereit für die Backend-Integration!

