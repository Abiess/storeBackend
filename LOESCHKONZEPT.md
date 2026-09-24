# Löschkonzept für markt.ma

**Erstellt:** 25.06.2026  
**Status:** Technischer Plan für DSGVO-konforme Datenlöschung

---

## 📋 Ist-Stand: Vorhandene Löschfunktionen

### ✅ Bereits implementiert

| Feature | Backend | Frontend | MinIO | Typ | Status |
|---------|---------|----------|-------|-----|--------|
| **Store löschen** | ✅ `DELETE /api/stores/{id}` | ✅ Button in Settings | ❌ Nur Media-Referenzen | Hard Delete | **FUNKTIONIERT** |
| **Produkte löschen** | ✅ `DELETE /api/stores/{storeId}/products/{productId}` | ✅ Product-Liste | ✅ MinIO-Cleanup | Hard Delete | **FUNKTIONIERT** |
| **Bilder löschen** | ✅ `DELETE /api/media/{mediaId}` | ✅ Media-Gallery | ✅ MinIO-Cleanup | Hard Delete | **FUNKTIONIERT** |
| **Kategorien löschen** | ✅ `DELETE /api/stores/{storeId}/categories/{categoryId}` | ✅ Category-Management | - | Hard Delete | **FUNKTIONIERT** |
| **Reviews löschen** | ✅ `DELETE /api/stores/{storeId}/reviews/{reviewId}` | ✅ Review-Management | - | Hard Delete | **FUNKTIONIERT** |
| **Warenkorb leeren** | ✅ `DELETE /api/carts/clear` | ✅ Warenkorb | - | Hard Delete | **FUNKTIONIERT** |
| **Teammitglied entfernen** | ✅ `DELETE /api/stores/{storeId}/roles/{userId}` | ✅ Role-Management | - | Relation Delete | **FUNKTIONIERT** |

### ❌ FEHLT (DSGVO-kritisch!)

| Feature | Status | DSGVO-Artikel | Priorität |
|---------|--------|---------------|-----------|
| **Account löschen (User)** | ❌ Nicht implementiert | Art. 17 Abs. 1 | 🔴 KRITISCH |
| **Bestellungen löschen/anonymisieren** | ❌ Nicht implementiert | Art. 17 Abs. 3 lit. b (Aufbewahrungspflicht!) | 🟠 WICHTIG |
| **Kundendaten löschen (CustomerProfile)** | ❌ Nicht implementiert | Art. 17 Abs. 1 | 🟠 WICHTIG |
| **Server-Logs anonymisieren** | ❌ Nicht implementiert | Art. 5 Abs. 1 lit. c (Datenminimierung) | 🟡 EMPFOHLEN |

---

## 🗑️ Store-Löschung: Analyse der Implementierung

### Backend: `StoreService.deleteStore()`

**Datei:** `src/main/java/storebackend/service/StoreService.java` (Zeilen 307-480)

**Methode:** Hard Delete (vollständige physische Löschung aus DB)

**Gelöschte Daten (in dieser Reihenfolge):**
1. ✅ ChatMessages, ChatSessions, ChatbotIntents, CannedResponses
2. ✅ FaqItems, FaqCategories
3. ✅ ReviewVotes, ProductReviews
4. ✅ InventoryLogs (Bestandshistorie)
5. ✅ ProductMedia (Produktbilder)
6. ✅ ProductOptionValues, ProductOptions (native SQL)
7. ✅ ProductVariants (Varianten wie Größe/Farbe)
8. ✅ SavedCartItems, SavedCarts
9. ✅ Products (alle Produkte)
10. ✅ Commissions (Provisionen)
11. ✅ OrderStatusHistory, OrderItems, Orders (KOMPLETT!)
12. ✅ PhoneVerifications (COD-Codes)
13. ✅ WishlistItems, Wishlists
14. ✅ CartItems, Carts
15. ✅ CouponRedemptions, Coupons
16. ✅ StoreProducts (Import-Produkte)
17. ✅ HomepageSections
18. ✅ RedirectRules (SEO-Redirects)
19. ✅ SupplierConnections (Dropshipping)
20. ✅ DeliveryZones, DeliveryProviders
21. ✅ SeoSettings, SeoAssets, SitemapConfigs, StructuredDataTemplates
22. ✅ CustomDomains (eigene Domains)
23. ✅ Themes (Custom-Themes)
24. ✅ DeliverySettings
25. ✅ Store-Medien (`Media` mit `store_id`)
26. ✅ Store-Rollen (`UserStoreRole`)
27. ✅ Store selbst

**⚠️ PROBLEM: MinIO-Cleanup fehlt!**

Die Store-Löschung entfernt nur die DB-Referenzen (`Media`-Einträge), **NICHT** die tatsächlichen Dateien in MinIO.

**Betroffen:**
- Store-Logo (`logo_url`)
- Store-Banner (`banner_image_url`)
- Slider-Bilder (`slider_images` JSON-Array)
- Alle Produktbilder des Stores

**Lösung:**  
Vor dem Löschen der `Media`-Einträge müssen die `minio_object_name` extrahiert und per `minioService.deleteFile()` gelöscht werden.

### Frontend: Store-Settings

**Datei:** `storeFrontend/src/app/features/stores/store-settings.component.ts` (Zeile 1268)

**UI-Element:**
- Tab "Erweitert" (ID: `advanced`)
- Button: "Shop dauerhaft löschen" (Translations: `storeSettings.advanced.deleteStoreButton`)
- Warnung: ⚠️ "Diese Aktion kann nicht rückgängig gemacht werden!"

**Bestätigungsdialog:**
- Zweistufige Bestätigung vorhanden (User muss Shop-Namen eintippen)
- Nach Löschung → Redirect zu `/my-stores`

**Status:** ✅ Funktioniert, MinIO-Cleanup fehlt nur im Backend

---

## 🔴 KRITISCH: Account-Löschung (User)

### Status
**❌ Nicht implementiert!**

### DSGVO-Anforderung
**Art. 17 Abs. 1 DSGVO** – Recht auf Löschung ("Recht auf Vergessenwerden")

### Technische Herausforderung

**User hat viele Abhängigkeiten:**
```
User
├── Stores (owner_id)                     → Lösen: Store-Ownership übertragen oder Stores löschen
├── UserStoreRole (user_id)               → Lösen: Rollen entfernen
├── Orders (customer_id, NULLABLE)        → Lösen: Anonymisieren statt löschen!
├── CustomerProfile (user_id)             → Lösen: Hard Delete
├── CustomerAddresses (customer_id FK)    → Lösen: Hard Delete
├── ProductReviews (customer_id)          → Lösen: Anonymisieren (Bewertung bleibt, User-Link weg)
├── ChatMessages (sender_id)              → Lösen: Anonymisieren ("Gelöschter Nutzer")
├── Wishlists (customer_id FK)            → Lösen: Hard Delete
├── PhoneVerifications (user_id FK)       → Lösen: Hard Delete
└── Media (uploaded_by, NULLABLE)         → Lösen: uploaded_by = NULL, MinIO-Files behalten
```

### Empfohlene Strategie: **Hybrid (Soft-Anonymize + Hard Delete)**

#### ✅ Hard Delete (vollständig entfernen)
- `UserStoreRole` (Teammitgliedschaften)
- `CustomerProfile` (Profildaten)
- `CustomerAddresses` (Lieferadressen)
- `PhoneVerifications` (Verifizierungs-Codes)
- `Wishlists` (Merkzettel)
- `User`-Eintrag selbst

#### 📝 Anonymisieren (Daten behalten, Personenbezug entfernen)
- **Orders:** `customer_email = 'anonymized_' + orderId + '@deleted.local'`, `customer_id = NULL`
- **ProductReviews:** `customer_id = NULL`, Bewertung bleibt sichtbar
- **ChatMessages:** `sender_name = 'Gelöschter Nutzer'`, `sender_id = NULL`
- **Media:** `uploaded_by = NULL`, Dateien bleiben (gehören jetzt dem Store)

#### ⚠️ Stores: User-Entscheidung nötig!
**Vor Account-Löschung fragen:**
- "Sie sind Owner von X Stores. Was soll damit passieren?"
  - Option 1: **Alle Stores löschen** (inkl. aller Produkte, Bestellungen, Kunden)
  - Option 2: **Ownership übertragen** (an ein anderes Teammitglied)
  - Option 3: **Abbrechen** (User muss erst Stores manuell löschen/übertragen)

**Empfehlung:** Option 3 erzwingen → "Sie müssen erst alle Stores löschen oder übertragen"

---

## 📦 Bestellungen: Löschung vs. Anonymisierung

### Problem: Gesetzliche Aufbewahrungspflichten

**§ 257 HGB (Handelsgesetzbuch):**
- Buchungsbelege: **10 Jahre**
- Geschäftsbriefe: **6 Jahre**

**§ 147 AO (Abgabenordnung):**
- Rechnungen, Lieferscheine: **10 Jahre**

**→ Bestellungen dürfen NICHT einfach gelöscht werden!**

### Lösung: Anonymisierung statt Löschung

**Pseudonymisierung nach DSGVO Art. 4 Nr. 5:**

```sql
-- Beispiel: Order anonymisieren
UPDATE orders SET
  customer_email = CONCAT('anonymized_', id, '@deleted.local'),
  customer_id = NULL,
  shipping_first_name = 'Anonymisiert',
  shipping_last_name = 'Gelöscht',
  shipping_phone = NULL,
  billing_first_name = 'Anonymisiert',
  billing_last_name = 'Gelöscht',
  billing_phone = NULL
WHERE customer_id = ?;
```

**Was bleibt erhalten:**
- Bestellnummer, Datum, Gesamtbetrag (für Buchhaltung)
- Produkte, Mengen, Preise (für Statistiken)
- Adresse (nur Stadt/PLZ, NICHT Straße+Hausnummer)

**Was wird entfernt:**
- Name (→ "Anonymisiert Gelöscht")
- E-Mail (→ `anonymized_<id>@deleted.local`)
- Telefon (→ NULL)
- Vollständige Adresse (nur PLZ+Stadt behalten für Versandstatistiken)

### Zeitplan
Nach Ablauf der Aufbewahrungsfrist (10 Jahre) → Hard Delete der anonymisierten Orders

---

## 🔧 Implementierungsplan

### Phase 1: MinIO-Cleanup für Store-Löschung (JETZT!)

**Priorität:** 🟠 HOCH (Store-Löschung lässt Datenmüll in MinIO zurück)

**Aufgabe:**
1. In `StoreService.deleteStore()` VOR dem Löschen der `Media`-Einträge:
   ```java
   // Store-Logo löschen
   if (store.getLogoUrl() != null) {
       String objectName = extractObjectNameFromUrl(store.getLogoUrl());
       minioService.deleteFile(objectName);
   }
   
   // Store-Banner löschen
   if (store.getBannerImageUrl() != null) {
       String objectName = extractObjectNameFromUrl(store.getBannerImageUrl());
       minioService.deleteFile(objectName);
   }
   
   // Slider-Bilder löschen
   if (store.getSliderImages() != null) {
       for (String url : store.getSliderImages()) {
           String objectName = extractObjectNameFromUrl(url);
           minioService.deleteFile(objectName);
       }
   }
   
   // Alle Media-Einträge des Stores löschen
   List<Media> mediaList = mediaRepository.findByStoreId(storeId);
   for (Media media : mediaList) {
       minioService.deleteFile(media.getMinioObjectName());
   }
   mediaRepository.deleteAll(mediaList);
   ```

2. Hilfsmethode erstellen:
   ```java
   private String extractObjectNameFromUrl(String url) {
       // https://minio.markt.ma/markt-ma/stores/39/logo.png
       // → stores/39/logo.png
       return url.substring(url.lastIndexOf("/markt-ma/") + 10);
   }
   ```

**Testfall:**
1. Store mit Logo, Banner, 3 Slider-Bildern, 10 Produkten (je 2 Bilder) erstellen
2. Store löschen
3. MinIO prüfen: Alle 20 Dateien müssen weg sein

---

### Phase 2: Account-Löschung (KRITISCH!)

**Priorität:** 🔴 KRITISCH (DSGVO Art. 17 Pflicht!)

#### Backend

**1. Neuer Endpunkt:** `DELETE /api/users/me`

**Datei:** `src/main/java/storebackend/controller/UserController.java`

```java
@DeleteMapping("/me")
public ResponseEntity<Void> deleteAccount(@AuthenticationPrincipal User user) {
    userService.deleteUserAccount(user.getId());
    return ResponseEntity.ok().build();
}
```

**2. Neuer Service:** `UserService.deleteUserAccount()`

**Datei:** `src/main/java/storebackend/service/UserService.java`

**Pseudo-Code:**
```java
@Transactional
public void deleteUserAccount(Long userId) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new RuntimeException("User not found"));
    
    // SCHRITT 1: Prüfen, ob User Owner von Stores ist
    List<Store> ownedStores = storeRepository.findByOwnerId(userId);
    if (!ownedStores.isEmpty()) {
        throw new RuntimeException(
            "User owns " + ownedStores.size() + " store(s). " +
            "Please delete or transfer ownership first."
        );
    }
    
    // SCHRITT 2: Orders anonymisieren (NICHT löschen!)
    List<Order> orders = orderRepository.findByCustomerId(userId);
    for (Order order : orders) {
        order.setCustomerEmail("anonymized_" + order.getId() + "@deleted.local");
        order.setCustomerId(null);
        order.setShippingFirstName("Anonymisiert");
        order.setShippingLastName("Gelöscht");
        order.setShippingPhone(null);
        order.setBillingFirstName("Anonymisiert");
        order.setBillingLastName("Gelöscht");
        order.setBillingPhone(null);
        // Adresse teilweise behalten (nur Stadt/PLZ für Statistiken)
    }
    orderRepository.saveAll(orders);
    
    // SCHRITT 3: Reviews anonymisieren
    List<ProductReview> reviews = reviewRepository.findByCustomerId(userId);
    for (ProductReview review : reviews) {
        review.setCustomerId(null);
        // Bewertung bleibt sichtbar, aber ohne User-Link
    }
    reviewRepository.saveAll(reviews);
    
    // SCHRITT 4: Chat-Messages anonymisieren
    List<ChatMessage> messages = chatMessageRepository.findBySenderId(userId);
    for (ChatMessage msg : messages) {
        msg.setSenderName("Gelöschter Nutzer");
        msg.setSenderId(null);
    }
    chatMessageRepository.saveAll(messages);
    
    // SCHRITT 5: Media-Uploads: uploaded_by = NULL
    List<Media> media = mediaRepository.findByUploadedBy(userId);
    for (Media m : media) {
        m.setUploadedBy(null);
        // MinIO-Dateien BEHALTEN (gehören jetzt dem Store)
    }
    mediaRepository.saveAll(media);
    
    // SCHRITT 6: Hard Delete von abhängigen Daten
    userStoreRoleRepository.deleteByUserId(userId);
    customerProfileRepository.deleteByUserId(userId);
    customerAddressRepository.deleteByCustomerId(userId);
    phoneVerificationRepository.deleteByUserId(userId);
    wishlistRepository.deleteByCustomerId(userId);
    
    // SCHRITT 7: User selbst löschen
    userRepository.delete(user);
    
    log.info("✅ User account {} fully deleted/anonymized", userId);
}
```

#### Frontend

**1. Neuer Button in User-Settings**

**Datei:** `storeFrontend/src/app/features/settings/user-settings.component.ts` (neu erstellen)

**UI-Elemente:**
- Eigenes Tab "Account" in User-Settings
- Danger-Zone mit rotem "Account dauerhaft löschen"-Button
- Modal mit:
  - ⚠️ Warnung: "Diese Aktion kann nicht rückgängig gemacht werden!"
  - Info: "Ihre Bestellungen werden anonymisiert (aus gesetzlichen Gründen)"
  - Info: "Reviews bleiben sichtbar, aber ohne Ihren Namen"
  - Bestätigung: "Bitte geben Sie Ihre E-Mail-Adresse ein"
  - Wenn User Stores besitzt: ERROR "Sie müssen zuerst alle Stores löschen"

**Translations (alle 4 Sprachen):**
```json
{
  "userSettings": {
    "deleteAccount": "Account löschen",
    "deleteAccountWarning": "⚠️ Warnung: Diese Aktion kann nicht rückgängig gemacht werden!",
    "deleteAccountInfo1": "Ihre Bestellungen werden aus rechtlichen Gründen anonymisiert (nicht gelöscht).",
    "deleteAccountInfo2": "Produktbewertungen bleiben sichtbar, aber ohne Ihren Namen.",
    "deleteAccountButton": "Account dauerhaft löschen",
    "deleteAccountConfirm": "Bitte geben Sie Ihre E-Mail-Adresse ein, um zu bestätigen:",
    "deleteAccountErrorStores": "Sie sind Owner von {{count}} Store(s). Bitte löschen oder übertragen Sie diese zuerst.",
    "deleteAccountSuccess": "Ihr Account wurde erfolgreich gelöscht. Sie werden abgemeldet."
  }
}
```

**2. API-Service**

**Datei:** `storeFrontend/src/app/core/services/auth.service.ts`

```typescript
deleteAccount(): Observable<void> {
  return this.http.delete<void>(`${environment.apiUrl}/users/me`).pipe(
    tap(() => {
      // Nach Löschung automatisch ausloggen
      this.logout();
    })
  );
}
```

---

### Phase 3: Bestellungen anonymisieren (für Kunden)

**Priorität:** 🟡 MITTEL (Kunden können Bestellhistorie nicht selbst löschen)

**Problem:**
Kunden, die NICHT registriert sind (Gast-Checkout), können ihre Bestellungen nicht löschen.

**Lösung: "Daten aus dieser Bestellung löschen"-Button**

**Endpunkt:** `POST /api/orders/{orderId}/anonymize`

**Zugriff:**
- Nur für den Kunden selbst (E-Mail-Verifikation oder Login)
- Oder: Shop-Owner kann Bestellung anonymisieren

**Implementierung:**
- Gleiche Logik wie bei Account-Löschung
- Order wird anonymisiert (siehe oben)
- Order selbst bleibt erhalten (Aufbewahrungspflicht!)

---

### Phase 4: Server-Logs anonymisieren

**Priorität:** 🟡 NIEDRIG (technisch, nicht kritisch)

**Problem:**
Server-Logs enthalten IP-Adressen → personenbezogene Daten (DSGVO Art. 4 Nr. 1)

**Lösung:**
- Cron-Job auf IONOS-Server: Alle 7 Tage IPs in Logs anonymisieren
- Beispiel: `192.168.1.100` → `192.168.xxx.xxx`
- Oder: Logs nach 7 Tagen komplett löschen

**Umsetzung:**
```bash
# Cron-Job (täglich um 03:00 Uhr)
0 3 * * * find /var/log/nginx -name "*.log" -mtime +7 -exec sed -i 's/\([0-9]\{1,3\}\.\)\{3\}[0-9]\{1,3\}/xxx.xxx.xxx.xxx/g' {} \;
```

**Oder:** Log-Rotation mit automatischer Löschung nach 7 Tagen (logrotate)

---

## 📊 Zusammenfassung: Was funktioniert, was fehlt

| Feature | Status | MinIO | DSGVO-konform | Priorität |
|---------|--------|-------|---------------|-----------|
| ✅ Store löschen | Funktioniert | ❌ Cleanup fehlt | ⚠️ Teilweise | 🟠 MinIO-Fix nötig |
| ✅ Produkte löschen | Funktioniert | ✅ Cleanup vorhanden | ✅ Ja | ✅ OK |
| ✅ Bilder löschen | Funktioniert | ✅ Cleanup vorhanden | ✅ Ja | ✅ OK |
| ❌ Account löschen | FEHLT | - | ❌ NEIN | 🔴 KRITISCH |
| ❌ Bestellungen anonym. | FEHLT | - | ❌ NEIN | 🟠 WICHTIG |
| ❌ Kundendaten löschen | FEHLT | - | ❌ NEIN | 🟠 WICHTIG |
| ❌ Logs anonymisieren | FEHLT | - | ⚠️ Empfohlen | 🟡 NIEDRIG |

---

## 🔐 Soft-Delete vs. Hard-Delete

### Aktueller Stand: **Hard Delete überall**

**Vorteile:**
- ✅ Einfache Implementierung
- ✅ Keine "gelöschten" Daten in DB
- ✅ DSGVO-konform (Daten sind wirklich weg)

**Nachteile:**
- ❌ Keine Wiederherstellung möglich
- ❌ Keine Audit-Trails
- ❌ Cascading-Deletes können fehleranfällig sein

### Empfehlung: **Hybrid-Ansatz**

| Datentyp | Strategie | Begründung |
|----------|-----------|------------|
| User-Account | Hard Delete + Anonymisierung | DSGVO Art. 17 (Löschpflicht) |
| Store | Hard Delete | Geschäftslogik (Store weg = alles weg) |
| Produkte | Hard Delete | Geschäftslogik (nicht mehr verkauft) |
| Bestellungen | **Anonymisierung** | Aufbewahrungspflicht (10 Jahre HGB) |
| Reviews | **Anonymisierung** | Bewertungen behalten, User-Link entfernen |
| Chat-Messages | **Anonymisierung** | Support-Historie behalten |
| Media | Hard Delete | Speicherplatz sparen |

---

## ⚠️ Rechtliche Hinweise

**Aufbewahrungspflichten beachten:**
- § 257 HGB: Buchungsbelege 10 Jahre
- § 147 AO: Rechnungen 10 Jahre
- § 14b UStG: Rechnungen 10 Jahre

**Ausnahmen vom Löschrecht (DSGVO Art. 17 Abs. 3):**
- lit. b) Erfüllung einer rechtlichen Verpflichtung (z.B. Steuerrecht)
- lit. e) Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen

**→ Bestellungen NICHT löschen, sondern anonymisieren!**

---

## 🧪 Test-Checkliste

### Store-Löschung
- [ ] Store mit Logo, Banner, Slider-Bildern erstellen
- [ ] 10 Produkte mit je 2 Bildern erstellen
- [ ] 5 Bestellungen erstellen
- [ ] Store löschen
- [ ] Prüfen: Alle DB-Einträge weg
- [ ] Prüfen: Alle MinIO-Dateien weg
- [ ] Prüfen: Bestellungen bleiben (gehören zum User, nicht zum Store!)

### Account-Löschung
- [ ] User mit 3 Bestellungen erstellen
- [ ] User mit 5 Reviews erstellen
- [ ] User mit 2 Chat-Sessions erstellen
- [ ] Account löschen
- [ ] Prüfen: User-Eintrag weg
- [ ] Prüfen: Bestellungen anonymisiert (E-Mail = `anonymized_X@deleted.local`)
- [ ] Prüfen: Reviews ohne `customer_id`, aber noch sichtbar
- [ ] Prüfen: Chat-Messages: `sender_name = "Gelöschter Nutzer"`
- [ ] Prüfen: JWT-Token ungültig (Logout erfolgreich)

### Bestellungen anonymisieren
- [ ] Gast-Bestellung erstellen (ohne Account)
- [ ] Bestellung anonymisieren
- [ ] Prüfen: `customer_email = anonymized_X@deleted.local`
- [ ] Prüfen: `customer_id = NULL`
- [ ] Prüfen: `shipping_first_name = "Anonymisiert"`
- [ ] Prüfen: Bestellnummer, Produkte, Preise unverändert

---

## 📝 TODO-Liste (Priorisiert)

### 🔴 KRITISCH (JETZT!)
- [ ] MinIO-Cleanup in `StoreService.deleteStore()` einbauen
- [ ] Account-Löschung Backend: `DELETE /api/users/me`
- [ ] Account-Löschung Frontend: User-Settings mit "Account löschen"-Button
- [ ] Translations für Account-Löschung (de/en/ar/fr)
- [ ] Tests für Store-Löschung + MinIO-Cleanup
- [ ] Tests für Account-Löschung + Anonymisierung

### 🟠 WICHTIG (nächste Woche)
- [ ] Bestellungen-Anonymisierung: `POST /api/orders/{id}/anonymize`
- [ ] Kundendaten-Löschung: `DELETE /api/customer-profiles/{id}`
- [ ] DATENSCHUTZERKLAERUNG.md aktualisieren (Löschfristen dokumentieren)
- [ ] TECH_DATENVERARBEITUNG.md aktualisieren (Löschkonzept dokumentieren)

### 🟡 NIEDRIG (später)
- [ ] Server-Logs anonymisieren (Cron-Job auf IONOS)
- [ ] Backup-Retention-Policy festlegen und dokumentieren
- [ ] Automatische Bestellungs-Löschung nach 10 Jahren (Cron-Job)

---

**Ende des Löschkonzepts**
