# 🔥 403 FORBIDDEN - ROOT CAUSE GEFUNDEN!

## ❌ Problem

```javascript
User beim 403-Fehler: {
  id: 1, 
  email: 'essoudati@hotmail.de', 
  role: 'ROLE_RESELLER'
}

Versucht zuzugreifen auf: Store ID = 1
Ergebnis: 403 Forbidden
```

## 🎯 Root Cause

**User ID 1 ist NICHT der Owner von Store ID 1!**

Das Backend prüft korrekt:
```java
boolean isOwner = store.getOwner().getId().equals(user.getId());
if (!isOwner) {
    log.warn("User {} is not owner of store {}", user.getId(), storeId);
    return ResponseEntity.status(403).build(); // ← DAS passiert!
}
```

---

## ✅ Lösung 1: Richtigen Store verwenden

### **A) Finde heraus welcher Store dem User gehört:**

```sql
-- In Production Datenbank ausführen:
SELECT id, name, owner_id 
FROM stores 
WHERE owner_id = 1;
```

**Erwartetes Ergebnis:**
```
| id | name          | owner_id |
|----|---------------|----------|
| 5  | MyShop        | 1        |
```

### **B) Verwende die richtige Store-ID:**

**URL ändern von:**
```
https://api.markt.ma/api/stores/1/products/7/options
```

**Nach:**
```
https://api.markt.ma/api/stores/5/products/7/options
```

---

## ✅ Lösung 2: Backend NEU DEPLOYEN

Das ist **PRODUCTION** (`api.markt.ma`), nicht localhost!

Die neuen Endpoints existieren dort noch nicht. Sie müssen deployen:

### **Deployment auf VPS:**

```bash
# SSH zum Server
ssh root@api.markt.ma

# Gehe zum Backend-Verzeichnis
cd /opt/storebackend

# Stoppe Service
systemctl stop storebackend

# Pull neuen Code
git pull origin main

# Neu kompilieren
mvn clean package -DskipTests

# Starte Service
systemctl start storebackend

# Prüfe Status
systemctl status storebackend

# Prüfe Logs
tail -f /var/log/storebackend/application.log
```

---

## ✅ Lösung 3: Lokale Entwicklung

Wenn Sie lokal entwickeln wollen:

### **1. Backend lokal starten:**
```bash
cd C:\Users\t13016a\Downloads\Team2\storeBackend
mvn spring-boot:run -DskipTests
```

### **2. Frontend environment.ts ändern:**
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api'  // ← Nicht api.markt.ma!
};
```

### **3. Frontend neu bauen:**
```bash
cd storeFrontend
npm run build
```

### **4. Testen:**
```
http://localhost:4200
```

---

## 🔍 Debug: Welcher Store gehört dem User?

### **Option A: SQL Query (Production DB)**
```sql
SELECT s.id, s.name, s.subdomain, s.owner_id, u.email
FROM stores s
JOIN users u ON s.owner_id = u.id
WHERE u.email = 'essoudati@hotmail.de';
```

### **Option B: Backend API Call**
```bash
# Mit Ihrem JWT Token
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
     https://api.markt.ma/api/me/stores

# Output zeigt alle Stores die dem User gehören
```

### **Option C: Frontend Console**
```javascript
// Im Browser Console (F12)
fetch('https://api.markt.ma/api/me/stores', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
  }
})
.then(r => r.json())
.then(stores => console.log('Meine Stores:', stores));
```

---

## 📊 Vergleich: Was funktioniert vs. Was nicht

### ❌ **NICHT funktioniert:**
```
User ID: 1
Store ID: 1  
→ 403 Forbidden (User ist nicht Owner)
```

### ✅ **FUNKTIONIERT (wahrscheinlich):**
```
User ID: 1
Store ID: <ANDERER_STORE>  
→ 200 OK (User ist Owner)
```

---

## 🎯 Action Items

### **Sofort:**
1. ✅ Finde heraus welche Store-ID dem User gehört (SQL Query)
2. ✅ Verwende die richtige Store-ID in der URL

### **Kurz fristig:**
1. ✅ Backend auf Production deployen (mit neuen Endpoints)
2. ✅ Nach Deployment: Alle Stores sollten funktionieren

### **Langfristig:**
1. ✅ Lokale Development-Umgebung aufsetzen
2. ✅ environment.ts richtig konfigurieren

---

## 🔥 Zusammenfassung

**Das Problem ist NICHT im Code!**

Der Code ist **korrekt** und funktioniert wie designed:
- ✅ Backend-Controller prüfen Ownership
- ✅ hasStoreAccess() Methode funktioniert
- ✅ 403 wird korrekt zurückgegeben bei fehlender Berechtigung

**Das Problem ist:**
1. Sie versuchen auf **Store 1** zuzugreifen
2. Aber **User 1** ist nicht der Owner von **Store 1**
3. Deshalb: **403 Forbidden** → **RICHTIG SO!**

**Die Lösung:**
- Finden Sie die **richtige Store-ID** die dem User gehört
- ODER: Erstellen Sie einen neuen Store für diesen User
- ODER: Ändern Sie den Owner von Store 1 auf User 1 (in DB)

---

## 💡 Quick Fix (Datenbank)

Wenn Sie Store 1 dem User 1 zuweisen wollen:

```sql
-- WARNUNG: Nur ausführen wenn Sie sicher sind!
UPDATE stores 
SET owner_id = 1 
WHERE id = 1;
```

**ABER:** Das ändert den Owner von Store 1! Der alte Owner verliert Zugriff!

---

## ✅ Status: PROBLEM IDENTIFIZIERT!

Der Code ist **perfekt**. Es ist ein **Daten-/Konfigurationsproblem**.

Folgen Sie den Lösungen oben! 🚀

