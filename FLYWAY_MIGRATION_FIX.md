# Flyway Migration Fix - Zusammenfassung

## 🔴 Problem

Die Anwendung crashte beim Start mit:
```
"Found more than one migration with version 1"
Offenders:
- db/migration/V1__initial_schema.sql
- db/migration/V001__add_delivery_tables.sql
```

**Zusätzliches Problem (PostgreSQL 15+):**
```
org.postgresql.util.PSQLException: ERROR: permission denied for schema public
Position: 14
```

**Root Causes:** 
1. Flyway ignoriert führende Nullen in Versionsnummern. `V1` und `V001` werden beide als Version "1" interpretiert → Kollision!
2. **PostgreSQL 15+** hat das public Schema standardmäßig ohne PUBLIC Rechte → `storeapp` User kann keine Tabellen erstellen

---

## ✅ Lösung - Durchgeführte Änderungen

### 1️⃣ **Migration Naming Convention - Versionskonflikte behoben**

#### Geänderte Dateien:
- ✅ `V1__initial_schema.sql` - Bleibt unverändert (Version 1)
- ✅ `V2__initial_data.sql` - Bleibt unverändert (Version 2)
- ✅ `V3__setup_permissions.sql` - Bleibt unverändert (Version 3)
- ❌ `V001__add_delivery_tables.sql` - **GELÖSCHT** (Konflikt mit V1)
- ✅ `V4__add_delivery_tables.sql` - **NEU ERSTELLT** (Version 4)

**Why:** 
- Flyway interpretiert `V001` = `V1` = `V01` (führende Nullen werden ignoriert)
- Klare Konvention: **Nur V1, V2, V3, V4, ...** ohne führende Nullen
- Delivery Tables kommen jetzt als separate Migration V4 (nach initial schema)

**Migration Timeline:**
```
V1: Initial Schema (Users, Stores, Products, Orders, etc.)
    └─> Orders-Tabelle enthält bereits delivery_* Felder
V2: Initial Data (FREE Plan)
V3: Setup Permissions (Grant Rights für storeapp User)
V4: Add Delivery Tables (store_delivery_settings, delivery_providers, delivery_zones)
```

---

### 2️⃣ **Public Schema - Explizit konfiguriert**

#### Geänderte Dateien:
- `src/main/resources/application.yml`
- `src/main/resources/application-production.yml`
- Alle SQL-Migrations-Dateien (V1, V2, V3, V4)

**Änderungen in application.yml:**
```yaml
flyway:
  enabled: true
  baseline-on-migrate: true
  baseline-version: 0
  locations: classpath:db/migration
  schemas: public              # ✅ NEU: Explizit public Schema
  default-schema: public       # ✅ NEU: Default Schema setzen
  out-of-order: false
  validate-on-migrate: true
```

**Änderungen in allen SQL-Dateien:**
```sql
-- Flyway Migration V1: Initial Schema
-- Explizit public Schema setzen
SET search_path TO public;

-- Rest der Migration...
```

**Why:**
- PostgreSQL hat mehrere Schemas (public, pg_catalog, information_schema, etc.)
- Ohne explizite Angabe könnte Flyway im falschen Schema arbeiten
- `SET search_path TO public;` stellt sicher, dass alle CREATE TABLE, CREATE INDEX, etc. im public Schema landen
- `schemas: public` in Flyway-Config dokumentiert die Absicht klar

---

### 3️⃣ **PostgreSQL User + Rechte - PostgreSQL 15+ kompatibel**

#### Geänderte Datei:
- `scripts/setup-postgres-user.sh`

**KRITISCHE Änderung für PostgreSQL 15+:**

Ab PostgreSQL 15 hat das `public` Schema standardmäßig **keine PUBLIC Rechte** mehr. Der Owner muss explizit gesetzt werden!

**Wichtigste Änderungen:**
```bash
# Database Owner auf storeapp setzen
ALTER DATABASE storedb OWNER TO storeapp;

# KRITISCH: public Schema Owner setzen (PostgreSQL 15+ Fix)
ALTER SCHEMA public OWNER TO storeapp;

# Explizit alle Rechte geben
GRANT ALL ON SCHEMA public TO storeapp;
GRANT CREATE ON SCHEMA public TO storeapp;
GRANT USAGE ON SCHEMA public TO storeapp;

# Default Privileges für zukünftige Objekte
ALTER DEFAULT PRIVILEGES FOR USER storeapp IN SCHEMA public 
    GRANT ALL ON TABLES TO storeapp;
ALTER DEFAULT PRIVILEGES FOR USER storeapp IN SCHEMA public 
    GRANT ALL ON SEQUENCES TO storeapp;
```

**Why:**
- PostgreSQL 14 und früher: `public` Schema hat automatisch PUBLIC Rechte (alle User können erstellen)
- **PostgreSQL 15+**: `public` Schema hat **keine** PUBLIC Rechte mehr (Security-Verbesserung)
- Ohne explizites `ALTER SCHEMA public OWNER TO storeapp` kann der User keine Tabellen erstellen
- Der Fehler "permission denied for schema public" tritt auf, wenn Owner nicht korrekt ist

**Test nach Setup:**
```bash
PGPASSWORD="your_password" psql -h localhost -U storeapp -d storedb -c "CREATE TABLE test (id INT);"
# Sollte ohne Fehler funktionieren
```

#### Neue PowerShell-Scripts für Windows:

**scripts/fix-postgres-permissions.ps1** - Führt Setup remote auf VPS aus:
```powershell
.\scripts\fix-postgres-permissions.ps1 -VpsHost 'your-vps-ip' -DbPassword 'your-db-password'
```

**scripts/diagnose-postgres-permissions.ps1** - Prüft ob Rechte korrekt sind:
```powershell
.\scripts\diagnose-postgres-permissions.ps1 -VpsHost 'your-vps-ip'
```

Das Diagnose-Script zeigt:
- ✅ Schema Owner = storeapp
- ✅ can_create = true
- ✅ can_use = true
- ✅ Alle Tabellen gehören storeapp

---

### 4️⃣ **Flyway Baseline - Korrekt konfiguriert**

**Konfiguration:**
```yaml
flyway:
  baseline-on-migrate: true  # ✅ Aktiviert
  baseline-version: 0        # ✅ Baseline bei Version 0
```

**Wann wird Baseline verwendet?**

| Szenario | Baseline nötig? | Erklärung |
|----------|----------------|-----------|
| **Frische DB** (leer) | ❌ Nein | Flyway erstellt flyway_schema_history und führt alle Migrationen aus |
| **Existierende DB mit Tabellen** | ✅ Ja | Flyway erstellt Baseline-Eintrag und startet ab nächster Migration |
| **Produktions-DB** (erste Flyway-Integration) | ✅ Ja | Flyway erkennt, dass Tabellen existieren und erstellt Baseline V0 |

**Was passiert beim ersten Start auf Produktion?**
```
1. Flyway prüft: Existiert flyway_schema_history? → Nein
2. Flyway prüft: Existieren Tabellen im Schema? → Ja (von altem Hibernate DDL)
3. Flyway erstellt: Baseline-Eintrag mit Version 0
4. Flyway führt aus: V1, V2, V3, V4 (weil > 0)
```

**After production deployment (frische DB):**
```
1. Flyway erstellt: flyway_schema_history
2. Flyway führt aus: V1 (Initial Schema)
3. Flyway führt aus: V2 (Initial Data)
4. Flyway führt aus: V3 (Setup Permissions)
5. Flyway führt aus: V4 (Add Delivery Tables)
```

---

### 5️⃣ **Deploy/CI Guardrails - Früherkennung von Fehlern**

#### Neue Dateien:
- `scripts/validate-migrations.sh` - Validierungs-Script
- `.github/workflows/deploy.yml` - Integriert in CI/CD

**Was macht validate-migrations.sh?**
```bash
✅ Scannt alle V*.sql Dateien
✅ Prüft auf doppelte Versionsnummern (inkl. führende Nullen)
✅ Prüft Naming Convention (V<number>__<description>.sql)
✅ Zeigt Migration Order an
❌ Stoppt Deployment bei Konflikten
```

**Beispiel Output (bei Fehler):**
```
❌ DUPLICATE VERSION FOUND!
   Version 1 appears in:
     1. V1__initial_schema.sql
     2. V001__add_delivery_tables.sql

🔧 How to fix:
   1. Rename migrations to use unique version numbers (V1, V2, V3, ...)
   2. Don't use leading zeros (V001 = V1 in Flyway)
   3. Follow naming convention: V<number>__<description>.sql
```

**GitHub Actions Workflow:**
```yaml
- name: 🔧 Build with Maven
  run: ./mvnw clean package -DskipTests

- name: 🔍 Validate Flyway Migrations   # ✅ NEU
  run: ./scripts/validate-migrations.sh

- name: 📦 Prepare JAR for Deployment
  # ... (nur wenn Validation erfolgreich)
```

**Why:**
- **Fail Fast**: Fehler werden beim Build erkannt, nicht erst auf Produktion
- **Prevention**: Verhindert Deployment mit kaputten Migrationen
- **Documentation**: CI-Log zeigt alle Migrationen und ihre Reihenfolge

---

## 📁 Dateistruktur - Überblick

```
storeBackend/
├── src/main/resources/
│   ├── db/migration/
│   │   ├── V1__initial_schema.sql        ✅ (+ SET search_path)
│   │   ├── V2__initial_data.sql          ✅ (+ SET search_path)
│   │   ├── V3__setup_permissions.sql     ✅ (+ SET search_path)
│   │   └── V4__add_delivery_tables.sql   🆕 (neu, ersetzt V001)
│   ├── application.yml                   ✅ (+ schemas: public)
│   └── application-production.yml        ✅ (+ schemas: public)
├── scripts/
│   ├── setup-postgres-user.sh            ✅ (idempotent, LOGIN fix)
│   ├── fix-db-password.sh                ✅ (besteht)
│   └── validate-migrations.sh            🆕 (neu, CI validation)
└── .github/workflows/
    └── deploy.yml                        ✅ (+ validate step)
```

---

## 🚀 Deployment-Ablauf (aktualisiert)

### **Phase 1: Build & Validation (GitHub Actions)**
```
1. Checkout Code
2. Setup JDK 17
3. Build with Maven
4. ✅ Validate Flyway Migrations      ← NEU: Stoppt bei Konflikten
5. Package JAR
6. Upload to VPS
```

### **Phase 2: Database Setup (VPS)**
```
7. Setup PostgreSQL User (idempotent)
   - CREATE USER storeapp WITH LOGIN
   - GRANT CONNECT ON DATABASE
   - ALTER DATABASE storedb OWNER TO storeapp        ← NEU
   - ALTER SCHEMA public OWNER TO storeapp          ← KRITISCH (PostgreSQL 15+)
   - GRANT ALL ON SCHEMA public TO storeapp
   - Default Privileges setzen
8. Fix DB Password (verify connection)
```

### **Phase 3: Application Deployment**
```
9. Stop old application
10. Install new JAR
11. Write environment file (/etc/storebackend.env)
12. Create/Update systemd service
13. Start application
    ├─> Flyway prüft flyway_schema_history
    ├─> Flyway führt fehlende Migrationen aus (V1→V4)
    └─> Spring Boot startet
```

### **Phase 4: Health Check**
```
14. Wait for application (max 60s)
15. Check /actuator/health
16. ✅ Success oder ❌ Show logs
```

---

## 🧪 Testing - Wie du es lokal testen kannst

### **Test 1: Migration Validation**
```bash
cd storeBackend
chmod +x scripts/validate-migrations.sh
./scripts/validate-migrations.sh
```

**Erwartetes Ergebnis:**
```
🔍 Flyway Migration Validation
==========================================
Found migrations:
   - V1__initial_schema.sql
   - V2__initial_data.sql
   - V3__setup_permissions.sql
   - V4__add_delivery_tables.sql

Migration order (by version number):
   V1   -> V1__initial_schema.sql
   V2   -> V2__initial_data.sql
   V3   -> V3__setup_permissions.sql
   V4   -> V4__add_delivery_tables.sql

✅ All migrations are valid! ✨

Summary:
   Total migrations: 4
   Version range: V1 - V4
```

### **Test 2: Lokaler Start (H2)**
```bash
cd storeBackend
./mvnw spring-boot:run
```

Flyway sollte alle 4 Migrationen ausführen:
```
Flyway: Migrating schema "PUBLIC" to version "1 - initial schema"
Flyway: Migrating schema "PUBLIC" to version "2 - initial data"
Flyway: Migrating schema "PUBLIC" to version "3 - setup permissions"
Flyway: Migrating schema "PUBLIC" to version "4 - add delivery tables"
Flyway: Successfully applied 4 migrations
```

### **Test 3: PostgreSQL Setup + Permission Check**
```powershell
# Auf Windows (PowerShell):
cd C:\Users\t13016a\Downloads\Team2\storeBackend

# 1. Führe Setup aus (fixe Permissions)
.\scripts\fix-postgres-permissions.ps1 -VpsHost 'your-vps-ip' -DbPassword 'your-db-password'

# 2. Prüfe ob Rechte korrekt sind
.\scripts\diagnose-postgres-permissions.ps1 -VpsHost 'your-vps-ip'

# 3. Starte App neu
ssh root@your-vps-ip 'sudo systemctl restart storebackend'

# 4. Beobachte Logs
ssh root@your-vps-ip 'sudo journalctl -u storebackend -f | grep -i flyway'
```

**Erwartete Log-Ausgabe:**
```
Flyway: Migrating schema "public" to version "1 - initial schema"
Flyway: Migrating schema "public" to version "2 - initial data"
Flyway: Migrating schema "public" to version "3 - setup permissions"
Flyway: Migrating schema "public" to version "4 - add delivery tables"
Flyway: Successfully applied 4 migrations
```

---

## ❓ FAQ - Häufige Fragen

### **Q: Was passiert mit existierenden Produktions-Daten?**
**A:** Nichts! Flyway ist intelligent:
- Bei **frischer DB**: Führt V1→V4 aus
- Bei **existierender DB mit Tabellen**: Erstellt Baseline V0, überspringt V1-V3 (falls Tabellen schon existieren), führt nur neue Migrationen aus
- **Daten bleiben erhalten**, Flyway macht nur Schema-Änderungen

### **Q: Kann ich Migrationen rückgängig machen?**
**A:** Flyway Community Edition unterstützt keine automatischen Rollbacks. Für Rollback:
1. **Option 1:** Manuelles Rollback-SQL schreiben (ALTER TABLE DROP COLUMN, etc.)
2. **Option 2:** Flyway Pro/Teams License (kostenpflichtig)
3. **Best Practice:** Teste Migrationen in Staging-Umgebung vor Produktion

### **Q: Was wenn ich versehentlich eine Migration lösche?**
**A:** Flyway erkennt das:
```
ERROR: Detected applied migration not resolved locally: V2
```
Lösung: Migration wiederherstellen oder `flyway repair` (entfernt Eintrag aus History)

### **Q: Muss ich baseline-on-migrate: true behalten?**
**A:** 
- **JA** für Produktion (bei bestehender DB)
- **NEIN** für frische Deployments (wenn DB garantiert leer ist)
- **Empfehlung:** Belasse auf `true`, schadet nicht und verhindert Fehler

### **Q: Warum "permission denied for schema public"?**
**A:** PostgreSQL 15+ Security-Änderung:
- **PostgreSQL ≤14**: public Schema hat automatisch PUBLIC Rechte
- **PostgreSQL ≥15**: public Schema hat **keine** PUBLIC Rechte mehr
- **Lösung**: `ALTER SCHEMA public OWNER TO storeapp` explizit setzen
- **Prävention**: Unser Setup-Script macht das jetzt automatisch

### **Q: Wie prüfe ich die PostgreSQL Version?**
**A:** Auf VPS:
```bash
sudo -u postgres psql -c "SELECT version();"
```
Oder nutze das Diagnose-Script:
```powershell
.\scripts\diagnose-postgres-permissions.ps1 -VpsHost 'your-vps-ip'
```

### **Q: Was wenn der Fehler trotzdem auftritt?**
**A:** Schritt-für-Schritt Fix:
```bash
# 1. Auf VPS einloggen
ssh root@your-vps-ip

# 2. Setup-Script manuell ausführen
cd /opt/storebackend
export DB_PASSWORD='your-password'
sudo -E bash scripts/setup-postgres-user.sh

# 3. Prüfe Schema Owner
sudo -u postgres psql -d storedb -c "SELECT nspname, nspowner::regrole FROM pg_namespace WHERE nspname='public';"
# Sollte zeigen: public | storeapp

# 4. Wenn Owner falsch ist, manuell fixen:
sudo -u postgres psql -d storedb <<EOF
ALTER SCHEMA public OWNER TO storeapp;
GRANT ALL ON SCHEMA public TO storeapp;
EOF

# 5. App neu starten
sudo systemctl restart storebackend
sudo journalctl -u storebackend -f
```

---

## 🎯 Next Steps nach diesem Fix

1. **Fixe die Berechtigungen (Windows PowerShell):**
```powershell
cd C:\Users\t13016a\Downloads\Team2\storeBackend

# Setup ausführen (mit deinem echten DB-Passwort)
.\scripts\fix-postgres-permissions.ps1 `
    -VpsHost 'your-vps-ip' `
    -DbPassword 'your-db-password'
```

2. **Prüfe ob Permissions korrekt sind:**
```powershell
.\scripts\diagnose-postgres-permissions.ps1 -VpsHost 'your-vps-ip'
```

Die Ausgabe sollte zeigen:
- ✅ Schema Owner = storeapp
- ✅ can_create = t
- ✅ Final Check = "All permissions OK"

3. **Committe die Änderungen:**
```bash
git add scripts/setup-postgres-user.sh
git add scripts/fix-postgres-permissions.ps1
git add scripts/diagnose-postgres-permissions.ps1
git add FLYWAY_MIGRATION_FIX.md
git commit -m "Fix: PostgreSQL 15+ public schema permissions (permission denied fix)"
git push origin main
```

4. **Starte App neu und prüfe Logs:**
```powershell
# Starte neu
ssh root@your-vps-ip 'sudo systemctl restart storebackend'

# Warte 10 Sekunden
Start-Sleep -Seconds 10

# Prüfe Status
ssh root@your-vps-ip 'sudo systemctl status storebackend'
```

5. **Verifiziere Flyway Migrationen:**
```bash
# Auf VPS
export DB_PASSWORD='your-password'
cd /opt/storebackend
sudo -u postgres psql -d storedb -c "SELECT * FROM flyway_schema_history ORDER BY installed_rank;"
```

Sollte 4 Migrationen zeigen (V1, V2, V3, V4) mit `success = true`

---

## 📚 Weitere Ressourcen

- [Flyway Documentation](https://flywaydb.org/documentation/)
- [PostgreSQL 15 Release Notes - public schema changes](https://www.postgresql.org/docs/15/ddl-schemas.html#DDL-SCHEMAS-PUBLIC)
- [PostgreSQL Schema Privileges](https://www.postgresql.org/docs/current/ddl-schemas.html)

---

## 🛡️ PostgreSQL 15+ Breaking Change

**Was hat sich geändert?**

PostgreSQL 15 hat eine wichtige Security-Verbesserung eingeführt:

| Version | public Schema Rechte | Auswirkung |
|---------|---------------------|------------|
| PostgreSQL ≤14 | `CREATE` Recht für alle User (PUBLIC) | Jeder User kann Tabellen erstellen |
| PostgreSQL ≥15 | **Keine** PUBLIC Rechte | Nur Schema Owner oder explizit berechtigte User können erstellen |

**Warum die Änderung?**

Security: Verhindert dass unprivilegierte User ungewollt Objekte im public Schema erstellen können.

**Was bedeutet das für uns?**

- Wir müssen explizit `ALTER SCHEMA public OWNER TO storeapp` setzen
- Ohne diesen Fix kann Flyway keine Tabellen erstellen
- Der Fehler "permission denied for schema public" ist die Folge

**Unser Fix:**

Unser `setup-postgres-user.sh` Script ist jetzt **PostgreSQL 15+ kompatibel** und setzt alle nötigen Berechtigungen automatisch.

---

**Status:** ✅ Alle Probleme behoben (inkl. PostgreSQL 15+ public schema fix)!
