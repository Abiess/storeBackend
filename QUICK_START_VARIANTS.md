# 🚀 Quick Start - Produkt-Varianten testen

## Schritt 1: Backend starten

```bash
cd C:\Users\t13016a\Downloads\Team2\storeBackend
mvn spring-boot:run -DskipTests
```

✅ Warte bis du siehst: `Started StoreBackendApplication`

---

## Schritt 2: Frontend starten

```bash
cd C:\Users\t13016a\Downloads\Team2\storeBackend\storeFrontend
npm start
```

✅ Öffne Browser: `http://localhost:4200`

---

## Schritt 3: Produkt mit Varianten erstellen

1. **Login** im Frontend
2. **Navigiere zu:** Store → Produkte → "Neues Produkt"
3. **Fülle aus:**
   - Name: "Test T-Shirt"
   - Preis: 29.99
   - Kategorie: wählen

4. **Scroll zu "Produktvarianten":**
   - Klick: **"+ Neue Option hinzufügen"**
   - Name: **"Farbe"**
   - Werte: **"Rot"** (Enter), **"Blau"** (Enter), **"Schwarz"** (Enter)

5. **Zweite Option:**
   - Klick: **"+ Neue Option hinzufügen"**
   - Name: **"Größe"**
   - Werte: **"S"** (Enter), **"M"** (Enter), **"L"** (Enter)

6. **Vorschau prüfen:**
   - ✅ Sollte zeigen: **"9 Varianten werden erstellt"**
   - ✅ Liste: TESTTSHIRT-Rot-S, TESTTSHIRT-Rot-M, ...

7. **Speichern!**

---

## Schritt 4: Produkt bearbeiten & Varianten erweitern

1. **Öffne das erstellte Produkt**
2. **Oben rechts: Zwei Tabs sichtbar:**
   - 📋 **Optionen definieren**
   - 🎯 **Varianten verwalten**

3. **Tab "Optionen definieren":**
   - Bei **"Größe"**: Neuer Wert **"XL"** hinzufügen
   - Enter drücken
   - ✅ Auto-Save: "Option gespeichert"

4. **Klick: 🔄 "Varianten neu generieren"**
   - ⚠️ Warnung erscheint: "12 Varianten werden neu generiert..."
   - Klick: **"OK"**
   - ⏳ Spinner: "Generiere..."
   - ✅ Success: "12 Varianten wurden erfolgreich neu generiert!"

5. **Wechsel zu Tab "Varianten verwalten":**
   - ✅ Alle 12 Varianten sind da!
   - 3 Farben × 4 Größen = 12 Varianten

---

## Schritt 5: Varianten individuell anpassen

Im Tab **"Varianten verwalten"**:

1. **Finde Variante:** "TESTTSHIRT-Rot-XL"
2. **Bearbeite:**
   - Preis: 34.99 (statt 29.99)
   - Lagerbestand: 50
   - SKU anpassen falls gewünscht
3. **Speichern**

---

## 🧪 Test-Szenarien

### **Test 1: Neue Option hinzufügen**
```
Tab "Optionen definieren"
→ "+ Neue Option hinzufügen"
→ Name: "Material"
→ Werte: "Baumwolle", "Polyester"
→ "Varianten neu generieren"
→ Ergebnis: 3×4×2 = 24 Varianten!
```

### **Test 2: Option löschen**
```
Tab "Optionen definieren"
→ Bei "Material": Klick auf ✕
→ Bestätigung: "Option wirklich löschen?"
→ OK
→ "Varianten neu generieren"
→ Ergebnis: Zurück zu 12 Varianten
```

### **Test 3: Wert entfernen**
```
Tab "Optionen definieren"
→ Bei "Farbe": Klick ✕ auf "Schwarz"
→ Auto-Save
→ "Varianten neu generieren"
→ Ergebnis: 2×4 = 8 Varianten (ohne Schwarz)
```

---

## ✅ Erwartetes Verhalten

### **Create-Modus:**
- ✅ Optionen-Eingabe sichtbar
- ✅ Live-Vorschau der Varianten
- ✅ Nach Speichern: Varianten automatisch in DB

### **Edit-Modus:**
- ✅ Tab "Optionen definieren" zeigt bestehende Optionen
- ✅ Tab "Varianten verwalten" zeigt alle Varianten
- ✅ Änderungen werden sofort gespeichert (Auto-Save)
- ✅ Regenerieren erstellt neue Varianten

### **Backend:**
- ✅ GET /options lädt Optionen aus DB
- ✅ PUT /options speichert Änderungen
- ✅ POST /regenerate erstellt neue Varianten
- ✅ Alle Varianten in `product_variants` Tabelle

---

## 🐛 Troubleshooting

### **Problem: "Keine Optionen vorhanden"**
```
Lösung: Erst Optionen im Tab "Optionen definieren" erstellen,
        dann "Varianten neu generieren" klicken
```

### **Problem: Varianten werden nicht angezeigt**
```
Prüfe:
1. Backend läuft? (Port 8080)
2. Console Errors im Frontend?
3. Network Tab: API-Call erfolgreich?
```

### **Problem: "401 Unauthorized"**
```
Lösung: Neu einloggen, Session abgelaufen
```

### **Problem: Kompilierungsfehler Backend**
```bash
mvn clean compile -DskipTests
# Sollte "BUILD SUCCESS" zeigen
```

---

## 📊 Datenbank prüfen (H2 Console)

1. **Öffne:** `http://localhost:8080/h2-console`
2. **JDBC URL:** `jdbc:h2:mem:storedb`
3. **User:** `sa`
4. **Password:** *(leer)*

### **SQL Queries zum Testen:**
```sql
-- Alle Optionen für Produkt 1
SELECT * FROM product_options WHERE product_id = 1;

-- Alle Option-Werte
SELECT * FROM product_option_values WHERE option_id IN (
  SELECT id FROM product_options WHERE product_id = 1
);

-- Alle Varianten für Produkt 1
SELECT * FROM product_variants WHERE product_id = 1;

-- Varianten mit Attributen
SELECT id, sku, price, stock_quantity, attributes_json 
FROM product_variants 
WHERE product_id = 1;
```

---

## 🎉 Erfolg!

Wenn du alle Schritte durchgeführt hast:

✅ Produkte mit Varianten erstellen funktioniert  
✅ Optionen im Edit-Modus bearbeiten funktioniert  
✅ Varianten regenerieren funktioniert  
✅ Alle Daten werden persistiert  
✅ Frontend ↔ Backend Communication funktioniert  

**Das System ist PRODUCTION READY!** 🚀

