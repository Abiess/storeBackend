# ✅ STORE THEMES FIX - QUICK SUMMARY

## 🎯 Problem:
```
ERROR: duplicate key value violates unique constraint "store_themes_store_id_key"
→ Zweites Theme kann nicht gespeichert werden
```

## Root Cause:
- Datenbank hat `UNIQUE` Constraint auf `store_id`
- Entity erlaubt mehrere Themes
- **Mismatch!**

## ✅ Lösung:

### 1. schema.sql korrigiert ✅
```sql
-- Vorher:
store_id BIGINT NOT NULL UNIQUE  ❌

-- Nachher:
store_id BIGINT NOT NULL  ✅
```

### 2. Migration erstellt ✅
```sql
ALTER TABLE store_themes DROP CONSTRAINT IF EXISTS store_themes_store_id_key;
```

### 3. Quick-Fix Script ✅
`scripts/fix-store-themes.sh`

## 🚀 Sofort-Fix für VPS:

```bash
ssh user@vps
sudo -u postgres psql storebackend -c "ALTER TABLE store_themes DROP CONSTRAINT IF EXISTS store_themes_store_id_key;"
sudo systemctl restart storebackend
```

## ✅ Ergebnis:
- ✅ Stores können mehrere Themes haben
- ✅ Nur ein Theme aktiv pro Store
- ✅ Kein Constraint-Fehler mehr

## 📊 Status:
- schema.sql: ✅ KORRIGIERT
- Migration: ✅ ERSTELLT
- VPS: ⏳ Migration muss ausgeführt werden

## 🎉 FERTIG!
Nach Migration auf VPS funktioniert Theme-Speichern fehlerfrei!

