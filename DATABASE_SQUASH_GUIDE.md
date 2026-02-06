# Database Squash & Reset - Anleitung

## 📋 Übersicht

Die Flyway-Migrationen wurden in **eine einzige Basis-Migration** zusammengefasst (Squash):
- **Alle alten Migrations-Dateien** (V1 bis V15) wurden entfernt
- **Neue Basis-Migration**: `V1__initial_schema.sql` enthält jetzt das komplette aktuelle Schema
- **Flyway-History** muss zurückgesetzt werden, um von vorne zu starten

## 🔧 Was wurde angepasst?

### 1. **Scripts erstellt/angepasst**:
- ✅ `scripts/reset-database-fresh.sh` - Kompletter DB-Reset (Linux/VPS)
- ✅ `scripts/reset-database-fresh.bat` - Kompletter DB-Reset (Windows lokal)
- ✅ `scripts/deploy.sh` - Unterstützt jetzt `RESET_DATABASE=true` Flag

### 2. **Konfigurationen angepasst**:
- ✅ `application.yml` - Flyway baseline-on-migrate aktiviert
- ✅ `application-production.yml` - Flyway baseline-on-migrate aktiviert
- ✅ JPA ddl-auto auf `validate` gesetzt (Schema kommt von Flyway)

### 3. **Migration-Ordner**:
- ✅ Nur noch `V1__initial_schema.sql` vorhanden
- ⚠️ Alle alten V2-V16 Dateien müssen gelöscht sein!

---

## 🚀 Deployment-Optionen

### Option A: Lokales Testing (Windows)

1. **Datenbank zurücksetzen**:
```cmd
cd C:\Users\t13016a\Downloads\Team2\storeBackend\scripts
reset-database-fresh.bat
```
- Eingabe: `DELETE-ALL` zur Bestätigung
- Löscht komplette `storedb` und erstellt sie neu

2. **Application starten**:
```cmd
cd C:\Users\t13016a\Downloads\Team2\storeBackend
mvn clean package -DskipTests
mvn spring-boot:run
```
- Flyway führt automatisch `V1__initial_schema.sql` aus
- Alle Tabellen inkl. `media` mit `content_type` werden neu erstellt

---

### Option B: Production VPS Reset

#### Manueller Reset auf VPS:

1. **SSH zum VPS verbinden**

2. **Reset-Script ausführen**:
```bash
cd /opt/storebackend/scripts
chmod +x reset-database-fresh.sh
sudo -u postgres bash reset-database-fresh.sh
```
- Eingabe: `DELETE-ALL` zur Bestätigung

3. **Application neu deployen**:
```bash
# Normales Deployment
bash deploy.sh
```

#### Automatischer Reset beim Deployment:

```bash
# Mit Database-Reset Flag
RESET_DATABASE=true bash deploy.sh
```
⚠️ **ACHTUNG**: Löscht alle Daten! Nur für Fresh Start verwenden!

---

### Option C: GitHub Actions CI/CD

Füge in deinem Workflow ein Environment-Variable hinzu:

```yaml
- name: Deploy with Database Reset
  env:
    RESET_DATABASE: "true"  # Nur beim ersten Deployment nach Squash
  run: |
    bash scripts/deploy.sh
```

Nach dem ersten erfolgreichen Deployment: `RESET_DATABASE` entfernen!

---

## ✅ Validierung nach Reset

### 1. Prüfe Flyway-History:
```bash
sudo -u postgres psql -d storedb -c "SELECT * FROM flyway_schema_history ORDER BY installed_rank;"
```
**Erwartetes Ergebnis**:
```
installed_rank | version |      description       | success
---------------+---------+-----------------------+---------
      1        |    1    | initial schema        |   t
```

### 2. Prüfe Tabellen:
```bash
sudo -u postgres psql -d storedb -c "\dt"
```
**Erwartete Tabellen**: users, stores, products, categories, orders, media, domains, etc.

### 3. Prüfe Media-Tabelle (muss content_type haben):
```bash
sudo -u postgres psql -d storedb -c "\d media"
```
**Erwartete Spalten**: id, file_name, file_path, file_size, **content_type**, upload_date, etc.

### 4. Prüfe Application Logs:
```bash
sudo journalctl -u storebackend -f
```
**Erwartete Zeilen**:
```
INFO o.f.c.i.database.base.BaseDatabaseType - Database: jdbc:postgresql://localhost:5432/storedb
INFO o.f.core.internal.command.DbValidate   - Successfully validated 1 migration
INFO o.f.core.internal.command.DbMigrate    - Current version of schema "public": 1
INFO o.f.core.internal.command.DbMigrate    - Schema "public" is up to date. No migration necessary.
```

---

## 🔍 Troubleshooting

### Problem: "Flyway validation failed"
**Lösung**:
```bash
# Auf VPS
export FLYWAY_REPAIR_ON_MIGRATE=true
bash deploy.sh
# Nach erfolgreichem Start: Flag wieder entfernen!
```

### Problem: "Table already exists"
**Ursache**: Datenbank wurde nicht komplett zurückgesetzt
**Lösung**:
```bash
# Reset nochmal durchführen
bash scripts/reset-database-fresh.sh
```

### Problem: Alte Migrations-Dateien noch vorhanden
**Lösung**:
```bash
# Prüfe Migration-Ordner
ls -la src/main/resources/db/migration/

# Es sollte NUR existieren:
# V1__initial_schema.sql

# Falls alte Dateien (V2, V3, etc.) noch da sind:
rm src/main/resources/db/migration/V[2-9]*.sql
rm src/main/resources/db/migration/V1[0-6]*.sql
```

### Problem: "content_type column not found"
**Ursache**: Alte Schema-Version noch aktiv
**Lösung**:
```bash
# Kompletter Reset erforderlich
bash scripts/reset-database-fresh.sh
```

---

## 📌 Wichtige Hinweise

### ⚠️ Vor Production-Deployment:

1. **Backup erstellen**:
```bash
pg_dump -h localhost -U storeapp storedb > backup_before_squash.sql
```

2. **V1__initial_schema.sql validieren**:
   - Öffne die Datei und prüfe, ob ALLE Tabellen enthalten sind
   - Besonders: `media`-Tabelle muss `content_type VARCHAR(255)` haben
   - Alle Foreign Keys müssen korrekt sein

3. **Nach erfolgreichem Reset**:
   - `RESET_DATABASE=true` Flag entfernen
   - Keine Änderungen mehr an `V1__initial_schema.sql` (immutable!)
   - Neue Änderungen als `V2__*.sql`, `V3__*.sql`, etc.

### ✅ Nach erfolgreichem Squash:

- Flyway-History ist sauber (nur V1)
- Alle zukünftigen Migrations bauen auf V1 auf
- Keine Checksum-Konflikte mehr
- Saubere Baseline für neue Environments

---

## 🎯 Empfohlener Workflow

### Erste Deployment nach Squash:

```bash
# 1. Lokal testen
reset-database-fresh.bat  # Windows
mvn spring-boot:run

# 2. Validieren (alle Tests laufen?)
mvn test

# 3. VPS Deployment mit Reset
ssh your-vps
cd /opt/storebackend
export RESET_DATABASE=true
bash scripts/deploy.sh

# 4. Nach erfolgreichem Start: Flag entfernen
# (aus deploy.sh oder ENV entfernen)
```

### Normales Deployment (nach Squash):

```bash
# Kein Reset mehr nötig
bash scripts/deploy.sh
```

---

## 📞 Support

Bei Problemen:
1. Prüfe Logs: `sudo journalctl -u storebackend -n 100`
2. Prüfe Flyway-Status: `bash scripts/flyway-helper.sh`
3. Prüfe DB-Verbindung: `psql -h localhost -U storeapp -d storedb -c "\dt"`

---

**Erstellt**: 2026-02-06
**Status**: Ready for Deployment ✅

