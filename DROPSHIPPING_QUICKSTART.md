# 🚀 DROPSHIPPING QUICK START GUIDE

## 🎯 Ziel
Dropshipping-Feature testen (Phase 1 MVP)

---

## 📋 VORAUSSETZUNGEN

1. ✅ Backend kompiliert (`mvn clean compile`)
2. ✅ User mit `ROLE_RESELLER` existiert
3. ✅ Store vorhanden
4. ✅ Product mit mindestens 1 Variant vorhanden

---

## 🧪 TEST-SZENARIO

### **Schritt 1: Backend starten**
```bash
cd storeBackend
mvn spring-boot:run
```

Warte bis du siehst:
```
✅ Tomcat started on port 8080
✅ Schema initialized (dropshipping_sources table created)
```

### **Schritt 2: Login als Reseller**
```bash
POST http://localhost:8080/api/auth/login
{
  "email": "reseller@example.com",
  "password": "password"
}
```

Speichere den `token` aus der Response.

### **Schritt 3: Erstelle Test-Product (falls nicht vorhanden)**
```bash
POST http://localhost:8080/api/stores/1/products
Authorization: Bearer {token}
{
  "title": "Test T-Shirt",
  "description": "Dropshipping Test",
  "basePrice": 19.99,
  "status": "ACTIVE",
  "categoryId": null
}
```

### **Schritt 4: Erstelle Variant**
```bash
POST http://localhost:8080/api/stores/1/products/{productId}/variants
Authorization: Bearer {token}
{
  "sku": "TSHIRT-RED-M",
  "price": 19.99,
  "stockQuantity": 100,
  "attributesJson": "{\"Farbe\":\"Rot\",\"Größe\":\"M\"}"
}
```

Speichere die `variantId`.

### **Schritt 5: Füge Supplier-Link hinzu**
```bash
POST http://localhost:8080/api/dropshipping/variants/{variantId}/source
Authorization: Bearer {token}
{
  "supplierUrl": "https://www.alibaba.com/product/test-tshirt",
  "supplierName": "Alibaba Fashion Co.",
  "purchasePrice": 6.50,
  "estimatedShippingDays": 12,
  "supplierSku": "ALI-TSHIRT-RED-M",
  "notes": "Mindestbestellmenge: 5 Stück"
}
```

**Erwartete Response:**
```json
{
  "id": 1,
  "variantId": 123,
  "supplierUrl": "https://www.alibaba.com/product/test-tshirt",
  "supplierName": "Alibaba Fashion Co.",
  "purchasePrice": 6.50,
  "estimatedShippingDays": 12,
  "supplierSku": "ALI-TSHIRT-RED-M",
  "notes": "Mindestbestellmenge: 5 Stück",
  "salePrice": 19.99,
  "marginPercentage": 0.6750,
  "profitAmount": 13.49
}
```

✅ **Marge: 67.5% - Profitabel!**

### **Schritt 6: Lade Supplier-Link**
```bash
GET http://localhost:8080/api/dropshipping/variants/{variantId}/source
Authorization: Bearer {token}
```

### **Schritt 7: Erstelle Test-Order**
```bash
POST http://localhost:8080/api/public/stores/1/orders
{
  "customerEmail": "test@example.com",
  "items": [
    {
      "variantId": 123,
      "quantity": 2
    }
  ],
  "deliveryType": "DELIVERY"
}
```

Speichere die `orderId`.

### **Schritt 8: Lade Order Items mit Dropshipping-Info**
```bash
GET http://localhost:8080/api/dropshipping/orders/{orderId}/items
Authorization: Bearer {token}
```

**Erwartete Response:**
```json
[
  {
    "id": 456,
    "name": "Test T-Shirt",
    "variantTitle": "Rot, M",
    "quantity": 2,
    "price": 19.99,
    "total": 39.98,
    "fulfillmentStatus": "PENDING",
    "dropshippingSource": {
      "id": 1,
      "variantId": 123,
      "supplierUrl": "https://www.alibaba.com/product/test-tshirt",
      "supplierName": "Alibaba Fashion Co.",
      "purchasePrice": 6.50,
      "marginPercentage": 0.6750,
      "profitAmount": 13.49
    }
  }
]
```

### **Schritt 9: Aktualisiere Fulfillment**
```bash
PUT http://localhost:8080/api/dropshipping/order-items/456/fulfillment
Authorization: Bearer {token}
{
  "status": "ORDERED",
  "supplierOrderId": "ALI-2024-12345",
  "notes": "Bestellt via Alibaba Chat"
}
```

✅ **Response: 200 OK**

### **Schritt 10: Update zu SHIPPED**
```bash
PUT http://localhost:8080/api/dropshipping/order-items/456/fulfillment
Authorization: Bearer {token}
{
  "status": "SHIPPED",
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "DHL"
}
```

### **Schritt 11: Berechne Store-Margin**
```bash
GET http://localhost:8080/api/dropshipping/stores/1/margin
Authorization: Bearer {token}
```

**Response:**
```json
{
  "marginPercentage": 0.6750
}
```

---

## 🎨 UI TESTING

### **Frontend starten:**
```bash
cd storeFrontend
npm install  # Falls neue Dependencies
npm start
```

### **Navigation:**
1. Login als Reseller: `http://localhost:4200/login`
2. Gehe zu Products: `/admin/products`
3. Bearbeite Product
4. Im Variants Manager:
   - Klicke "🔗 Link hinzufügen" bei einer Variant
   - Fülle Dialog aus
   - Speichere
   - Prüfe: Badge zeigt "✓ Link bearbeiten" + Marge

5. Gehe zu Orders: `/admin/orders`
6. Öffne eine Order
7. Prüfe: "📦 Dropshipping Fulfillment" Section zeigt:
   - Supplier-Link (klickbar)
   - Margin-Info
   - Status-Dropdown
   - Tracking-Felder

---

## 🐛 TROUBLESHOOTING

### **Backend startet nicht:**
```
Error: Column fulfillment_status not found
```
**Fix:** H2 Schema nicht aktualisiert
```bash
# Lösche H2 DB
rm ~/storedb.mv.db

# Starte neu
mvn spring-boot:run
```

### **403 Forbidden auf Dropshipping-Endpoints:**
```
User has no ROLE_RESELLER
```
**Fix:** Füge Rolle hinzu:
```sql
INSERT INTO user_roles (user_id, role) VALUES (1, 'ROLE_RESELLER');
```

### **Frontend zeigt Supplier-Link nicht:**
```
Button fehlt in Variants Manager
```
**Fix:** Prüfe ob User `ROLE_RESELLER` hat im LocalStorage/Token

### **Margin zeigt 0%:**
```
purchasePrice oder salePrice ist NULL
```
**Fix:** Stelle sicher beide Felder sind gesetzt

---

## 📊 VALIDIERUNG

### **Backend Checks:**
```bash
# 1. Schema vorhanden?
curl http://localhost:8080/actuator/health

# 2. Dropshipping Endpoints erreichbar?
curl -H "Authorization: Bearer {token}" \
  http://localhost:8080/api/dropshipping/stores/1/sources

# 3. Swagger UI prüfen:
open http://localhost:8080/swagger-ui.html
# Suche: "Dropshipping" Tag
```

### **Database Checks:**
```sql
-- Tabelle existiert?
SELECT * FROM dropshipping_sources LIMIT 1;

-- Spalten in order_items?
SELECT fulfillment_status, supplier_order_id 
FROM order_items LIMIT 1;

-- Index vorhanden?
SELECT indexname FROM pg_indexes 
WHERE tablename = 'dropshipping_sources';
```

---

## 🎉 SUCCESS CRITERIA

✅ Backend startet ohne Fehler  
✅ Migration V10 erfolgreich  
✅ Supplier-Link kann gespeichert werden  
✅ Margin wird korrekt berechnet  
✅ Fulfillment kann aktualisiert werden  
✅ UI zeigt Supplier-Link Button  
✅ Fulfillment-Tracker zeigt Dropshipping-Items  
✅ Nur ROLE_RESELLER hat Zugriff

---

**🚀 READY TO TEST!**

