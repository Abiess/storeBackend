# 🚀 Product Reviews - Quick Start Guide

## ⚡ In 5 Minuten einsatzbereit!

### Schritt 1: Backend starten

```bash
cd storeBackend
./mvnw spring-boot:run
```

Die Migration `V10__add_product_reviews.sql` wird automatisch ausgeführt.

---

### Schritt 2: Frontend starten

```bash
cd storeFrontend
npm install  # falls noch nicht gemacht
ng serve
```

Frontend läuft auf: http://localhost:4200

---

### Schritt 3: Review-Widget in Produktseite einbinden

Öffne deine Produkt-Detail-Component:

```typescript
// product-detail.component.ts
import { ProductReviewsComponent } from '../../shared/components/product-reviews.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    ProductReviewsComponent  // ✅ Importieren
  ],
  template: `
    <div class="product-detail">
      <!-- Deine bestehende Produkt-Info -->
      <h1>{{ product.title }}</h1>
      <p>{{ product.description }}</p>
      
      <!-- ✅ NEU: Review-Widget hinzufügen -->
      <app-product-reviews [productId]="product.id"></app-product-reviews>
    </div>
  `
})
export class ProductDetailComponent {
  product: any;
  
  ngOnInit() {
    // Load product...
  }
}
```

**Das war's!** 🎉

---

### Schritt 4: Review-Manager im Dashboard verlinken

Füge in deiner Store-Navigation einen Link hinzu:

```typescript
// store-detail.component.html
<nav>
  <a routerLink="/stores/{{storeId}}/products">Produkte</a>
  <a routerLink="/stores/{{storeId}}/orders">Bestellungen</a>
  
  <!-- ✅ NEU: Reviews-Link -->
  <a routerLink="/stores/{{storeId}}/reviews">
    Bewertungen
    <span class="badge" *ngIf="pendingReviews > 0">{{pendingReviews}}</span>
  </a>
</nav>
```

---

## 🧪 Testen

### 1. Als Kunde eine Review schreiben:

1. Öffne: http://localhost:4200
2. Gehe zu einem Store (z.B. http://demo.localhost:4200)
3. Öffne ein Produkt
4. Scrolle zu "Reviews"
5. Klicke "Bewertung schreiben"
6. **Login falls nötig**
7. Wähle Sterne (1-5)
8. Schreibe Kommentar (min. 10 Zeichen)
9. Klicke "Absenden"
10. Sieh Success-Message: "Wartet auf Freigabe"

### 2. Als Store Owner genehmigen:

1. Öffne: http://localhost:4200/stores/1/reviews
2. Sieh Statistiken:
   - Total: 1
   - Pending: 1
   - Approved: 0
3. Klicke Filter: **"Pending"**
4. Sieh die neue Review
5. Klicke **"Approve"**
6. Statistiken aktualisieren sich:
   - Approved: 1
   - Pending: 0

### 3. Review ist jetzt öffentlich sichtbar:

1. Zurück zur Produktseite
2. Review erscheint in der Liste
3. Andere User können **Helpful-Vote** geben

---

## 📊 API-Beispiele (curl)

### Review erstellen:
```bash
curl -X POST http://localhost:8080/api/products/1/reviews \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "title": "Excellent!",
    "comment": "Best product ever. Highly recommended!"
  }'
```

### Reviews abrufen:
```bash
curl http://localhost:8080/api/products/1/reviews
```

### Statistiken abrufen:
```bash
curl http://localhost:8080/api/products/1/reviews/stats
```

---

## 🎨 Anpassungen

### Farben ändern:

```typescript
// product-reviews.component.ts
styles: [`
  .star.filled {
    color: #ff6b6b;  /* ✅ Rot statt Orange */
  }
  
  .btn-primary {
    background: #4caf50;  /* ✅ Grün statt Blau */
  }
`]
```

### Rating-Widget anpassen:

```typescript
// Zeige nur genehmigte Reviews mit 4+ Sternen
this.reviews = this.reviews.filter(r => r.rating >= 4);
```

### Automatische Genehmigung aktivieren:

```java
// ProductReviewService.java
review.setIsApproved(true);  // ✅ Statt false
```

⚠️ **Nicht empfohlen** - öffnet Tür für Spam!

---

## 🐛 Troubleshooting

### Problem: "Review not found"
**Lösung:** Stelle sicher dass Flyway die Migration ausgeführt hat:
```sql
SELECT * FROM flyway_schema_history WHERE version = '10';
```

### Problem: "Unauthorized"
**Lösung:** User muss eingeloggt sein. Prüfe JWT-Token:
```typescript
this.authService.isLoggedIn()  // → muss true sein
```

### Problem: Reviews werden nicht angezeigt
**Lösung:** Reviews müssen genehmigt sein:
```sql
UPDATE product_reviews SET is_approved = true WHERE id = 1;
```

### Problem: Component nicht gefunden
**Lösung:** Prüfe Import-Pfad:
```typescript
import { ProductReviewsComponent } from '../../shared/components/product-reviews.component';
```

---

## ✅ Checkliste

- [ ] Backend läuft (Port 8080)
- [ ] Frontend läuft (Port 4200)
- [ ] Migration ausgeführt
- [ ] Review-Widget in Produktseite eingebaut
- [ ] Review-Manager-Link im Dashboard
- [ ] Test-Review erstellt
- [ ] Test-Review genehmigt
- [ ] Review öffentlich sichtbar

---

## 🎯 Nächste Schritte

1. **Design anpassen** an dein Branding
2. **Benachrichtigungen** implementieren (Email bei neuer Review)
3. **Foto-Upload** für Reviews aktivieren
4. **Analytics** einbauen (Review-Trends über Zeit)

---

**Fertig!** 🎉 Dein Review-System ist einsatzbereit!

Bei Fragen: Siehe `PRODUCT_REVIEWS_FEATURE.md` für Details.

