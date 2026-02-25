# ✅ STORE THEMES FIX - UNIQUE CONSTRAINT PROBLEM

## 🎯 Problem:
```
ERROR: duplicate key value violates unique constraint "store_themes_store_id_key"
Detail: Key (store_id)=(1) already exists
```

### Ursache:
- **Datenbank** hat `UNIQUE` Constraint auf `store_themes.store_id`
- **Entity** (StoreTheme.java) hat **keinen** UNIQUE Constraint
- **Business Logic:** Ein Store **soll** mehrere Themes haben können (nur eins aktiv)
- **Problem:** Beim zweiten Theme-Speichern → Constraint-Verletzung

---

## ✅ Lösung implementiert:

### 1. schema.sql korrigiert ✅

**Vorher:**
```sql
CREATE TABLE store_themes (
    id BIGINT PRIMARY KEY,
    store_id BIGINT NOT NULL UNIQUE,  ❌ Erlaubt nur 1 Theme pro Store
    ...
);
```

**Nachher:**
```sql
CREATE TABLE store_themes (
    id BIGINT PRIMARY KEY,
    store_id BIGINT NOT NULL,  ✅ Erlaubt mehrere Themes pro Store
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    template VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    ...
);
```

**Wichtig:** Alte, überflüssige Spalten entfernt:
- ❌ `primary_color`, `secondary_color`, `accent_color` (jetzt in colors_json)
- ❌ `font_family` (jetzt in typography_json)
- ❌ `logo_url`, `favicon_url` (jetzt in layout_json)
- ❌ `custom_js`, `header_html`, `footer_html` (nicht mehr verwendet)
- ✅ Neue Struktur: `colors_json`, `typography_json`, `layout_json`, `custom_css`

---

### 2. Migration Script erstellt ✅

**Datei:** `src/main/resources/db/migration/fix_store_themes_unique_constraint.sql`

```sql
-- Entferne UNIQUE Constraint von store_id
ALTER TABLE store_themes DROP CONSTRAINT IF EXISTS store_themes_store_id_key;
```

---

## 🚀 Deployment:

### Option A: Automatisch (bei nächstem Deploy)
```bash
# Die korrigierte schema.sql wird beim nächsten Start angewendet
mvn clean package -DskipTests
git push origin main
```

### Option B: Manuell auf VPS (sofort)
```bash
# 1. SSH auf VPS
ssh user@vps

# 2. Führe Migration aus
sudo -u postgres psql storebackend -c "ALTER TABLE store_themes DROP CONSTRAINT IF EXISTS store_themes_store_id_key;"

# 3. Restart Backend
sudo systemctl restart storebackend

# 4. Verify
sudo systemctl status storebackend
```

---

## ✅ Business Logic (unverändert):

Die Business Logic in `ThemeService.java` ist **korrekt** und musste **nicht** geändert werden:

```java
@Transactional
public StoreThemeDTO createTheme(CreateThemeRequest request) {
    // 1. Deaktiviere alle anderen Themes
    themeRepository.findByStoreIdAndIsActive(request.getStoreId(), true)
        .ifPresent(activeTheme -> {
            activeTheme.setIsActive(false);  ✅
            themeRepository.save(activeTheme);
        });

    // 2. Erstelle neues Theme (aktiv)
    StoreTheme theme = new StoreTheme();
    theme.setStore(store);
    theme.setIsActive(true);  ✅
    
    return convertToDTO(themeRepository.save(theme));
}
```

**So funktioniert es:**
1. User erstellt Theme #1 → wird aktiv
2. User erstellt Theme #2 → Theme #1 wird deaktiviert, Theme #2 wird aktiv
3. User kann zwischen Themes wechseln mit `activateTheme()`
4. Nur **ein** Theme pro Store ist aktiv (`is_active = true`)

---

## 📊 Tabellen-Vergleich:

| Feature | Alt (mit UNIQUE) | Neu (ohne UNIQUE) |
|---------|------------------|-------------------|
| Themes pro Store | ❌ Nur 1 | ✅ Mehrere |
| Aktives Theme | ❌ Implizit (das eine) | ✅ Explizit (is_active) |
| Theme wechseln | ❌ Nicht möglich | ✅ activateTheme() |
| Theme erstellen | ❌ Fehler beim 2. Mal | ✅ Immer möglich |

---

## 🧪 Testing:

### Nach Migration testen:
```bash
# 1. Theme erstellen (sollte funktionieren)
POST /api/themes
{
  "storeId": 1,
  "name": "Summer Theme",
  "type": "modern",
  "template": "default",
  ...
}
→ ✅ 200 OK

# 2. Zweites Theme erstellen (vorher: Fehler, jetzt: OK)
POST /api/themes
{
  "storeId": 1,
  "name": "Winter Theme",
  "type": "classic",
  "template": "default",
  ...
}
→ ✅ 200 OK (vorher: 500 Error)

# 3. Themes auflisten
GET /api/themes/store/1
→ ✅ Zeigt beide Themes, eins ist aktiv

# 4. Theme aktivieren
POST /api/themes/{themeId}/activate
→ ✅ Anderes Theme wird aktiv
```

---

## ⚠️ WICHTIG für Production:

**Auf der VPS existiert noch der alte Constraint!**

### Quick Fix (ohne Downtime):
```bash
ssh user@vps "sudo -u postgres psql storebackend -c \"ALTER TABLE store_themes DROP CONSTRAINT IF EXISTS store_themes_store_id_key;\""
```

### Verify:
```bash
ssh user@vps "sudo -u postgres psql storebackend -c \"\\d store_themes\""
```

**Sollte zeigen:**
- ✅ Keine `UNIQUE` Constraint auf `store_id`
- ✅ `FOREIGN KEY` auf `store_id` → `stores(id)`

---

## 📝 Zusammenfassung:

**Problem:** UNIQUE Constraint verhinderte mehrere Themes pro Store
**Lösung:** UNIQUE Constraint entfernt
**Status:** ✅ BEHOBEN

**Dateien geändert:**
1. ✅ `schema.sql` - UNIQUE entfernt, Spalten aktualisiert
2. ✅ `fix_store_themes_unique_constraint.sql` - Migration erstellt

**Nächste Schritte:**
1. Migration auf VPS ausführen (siehe Option B oben)
2. Backend neu deployen
3. Theme-Erstellung testen

**Ergebnis:**
- ✅ Stores können mehrere Themes haben
- ✅ Nur ein Theme pro Store ist aktiv
- ✅ Themes können gewechselt werden
- ✅ Kein Constraint-Fehler mehr

---

## 🎉 FERTIG!

Das Problem ist gelöst. Nach Ausführung der Migration können Stores beliebig viele Themes erstellen und zwischen ihnen wechseln! 🚀

