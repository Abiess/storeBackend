# Flyway Datenbank-Migrations-Guide

## 🎯 Übersicht

Das Store Backend verwendet jetzt **Flyway** für versioniertes Datenbank-Management statt manueller SQL-Scripts. Dies macht Deployments einfacher, sicherer und reproduzierbarer.

## ✅ Vorteile gegenüber dem alten System

### Vorher (manuelle SQL-Scripts)
- ❌ Manuelle Ausführung von `init-schema.sql` als postgres User erforderlich
- ❌ Keine Versionierung - welches Schema ist aktuell?
- ❌ Berechtigungsprobleme zwischen postgres und storeapp User
- ❌ Schwierig, Schema-Änderungen nachzuvollziehen
- ❌ Kein Rollback möglich
- ❌ DROP TABLE statements bei jedem Deployment (Datenverlust!)

### Jetzt (Flyway)
- ✅ **Automatisch** beim Application-Start
- ✅ Versionierte Migrationen (V1, V2, V3...)
- ✅ Flyway verwaltet, was bereits ausgeführt wurde (`flyway_schema_history`)
- ✅ Sicher: keine DROP statements - nur CREATE IF NOT EXISTS
- ✅ Rollback und Repair möglich
- ✅ Gleicher User (storeapp) für Migrations und Application
- ✅ CI/CD ready

## 📁 Struktur

```
src/main/resources/db/migration/
├── V1__initial_schema.sql      # Erstellt alle Tabellen + Indizes
└── V2__initial_data.sql        # Fügt FREE Plan hinzu
```

### Namenskonvention

```
V<VERSION>__<DESCRIPTION>.sql

V = Versioned Migration
<VERSION> = Numerische Version (1, 2, 3, 1.1, 2.5 etc.)
__ = Zwei Unterstriche
<DESCRIPTION> = Beschreibung (snake_case oder CamelCase)
```

Beispiele:
- `V1__initial_schema.sql` ✅
- `V2__initial_data.sql` ✅
- `V3__add_subscription_features.sql` ✅
- `V4__add_payment_methods.sql` ✅

## 🚀 Wie es funktioniert

### 1. Beim ersten Start (neue Datenbank)

```bash
# Application startet
→ Flyway prüft: flyway_schema_history Tabelle existiert nicht
→ Flyway erstellt flyway_schema_history
→ Flyway führt V1__initial_schema.sql aus
→ Flyway führt V2__initial_data.sql aus
→ Hibernate validiert Schema (ddl-auto: validate)
✅ Application läuft
```

### 2. Bei existierender Datenbank (Production)

```bash
# Application startet mit baseline-on-migrate: true
→ Flyway prüft: Tabellen existieren bereits
→ Flyway erstellt Baseline mit Version 0
→ Flyway markiert V1 und V2 als bereits ausgeführt
→ Hibernate validiert Schema
✅ Application läuft
```

### 3. Nach Schema-Änderungen

```bash
# Neue Migration hinzugefügt: V3__add_new_feature.sql
→ Flyway prüft: V1, V2 bereits ausgeführt
→ Flyway führt nur V3 aus
→ Hibernate validiert neues Schema
✅ Application läuft mit neuem Feature
```

## 🔧 Konfiguration

### Development (application.yml)

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate  # Nur validieren, nicht erstellen!
  
  flyway:
    enabled: true
    baseline-on-migrate: true
    baseline-version: 0
    locations: classpath:db/migration
    validate-on-migrate: true
```

### Production (application-production.yml)

```yaml
spring:
  flyway:
    enabled: true
    baseline-on-migrate: true  # Wichtig für existierende DB!
    user: ${FLYWAY_USER:storeapp}
    password: ${FLYWAY_PASSWORD:${SPRING_DATASOURCE_PASSWORD}}
```

### Tests (application-test.yml)

```yaml
spring:
  flyway:
    enabled: true
    baseline-on-migrate: true
    clean-disabled: false  # Erlaubt clean() in Tests
```

## 📝 Neue Migration erstellen

### Beispiel: Neue Tabelle hinzufügen

```bash
# 1. Erstelle neue Datei
touch src/main/resources/db/migration/V3__add_subscription_table.sql
```

```sql
-- V3__add_subscription_table.sql
CREATE TABLE IF NOT EXISTS subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    plan_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
```

### Beispiel: Spalte hinzufügen

```sql
-- V4__add_user_verified_field.sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_verified ON users(email_verified);
```

### Beispiel: Daten aktualisieren

```sql
-- V5__add_premium_plan.sql
INSERT INTO plans (name, max_stores, max_custom_domains, max_subdomains, max_storage_mb, max_products, max_image_count)
VALUES ('PREMIUM', 10, 5, 10, 10240, 1000, 5000)
ON CONFLICT (name) DO NOTHING;
```

## 🔍 Flyway Status prüfen

### Mit Maven/Spring Boot

```bash
# Application info anzeigen
curl http://localhost:8080/actuator/flyway

# Response:
{
  "contexts": {
    "application": {
      "flywayBeans": {
        "flyway": {
          "migrations": [
            {
              "type": "SQL",
              "checksum": 1234567890,
              "version": "1",
              "description": "initial schema",
              "script": "V1__initial_schema.sql",
              "state": "SUCCESS",
              "installedOn": "2026-01-30T10:00:00.000Z"
            }
          ]
        }
      }
    }
  }
}
```

### Direkt in der Datenbank

```sql
-- Zeige alle Migrationen
SELECT * FROM flyway_schema_history ORDER BY installed_rank;

-- Ausgabe:
-- installed_rank | version | description    | script                  | success | installed_on
-- 1              | 0       | << Baseline >> | << Flyway Baseline >>   | true    | 2026-01-30 10:00:00
-- 2              | 1       | initial schema | V1__initial_schema.sql  | true    | 2026-01-30 10:00:05
-- 3              | 2       | initial data   | V2__initial_data.sql    | true    | 2026-01-30 10:00:06
```

## 🚨 Troubleshooting

### Problem: "Validate failed: Migrations have failed validation"

**Ursache**: Migration wurde nachträglich geändert (Checksum stimmt nicht mehr)

**Lösung 1 - Repair** (wenn nur Checksums falsch):
```bash
# Über Maven Plugin
./mvnw flyway:repair

# Oder über SQL
DELETE FROM flyway_schema_history WHERE version = '3' AND success = false;
```

**Lösung 2 - Clean** (⚠️ NUR in Development!):
```bash
# Löscht ALLE Daten!
./mvnw flyway:clean
./mvnw flyway:migrate
```

### Problem: "Found non-empty schema(s) without schema history table"

**Ursache**: Existierende Datenbank ohne Flyway-Historie

**Lösung**: Baseline ist bereits konfiguriert!
```yaml
flyway:
  baseline-on-migrate: true  # ✅ Bereits aktiviert
```

### Problem: Migration schlägt fehl

**Symptome**:
```
Migration V3__add_feature.sql failed
SQL State: 42P01
ERROR: relation "xyz" does not exist
```

**Lösung**:
```bash
# 1. Prüfe flyway_schema_history
SELECT * FROM flyway_schema_history WHERE success = false;

# 2. Repariere manuelle
DELETE FROM flyway_schema_history WHERE version = '3';

# 3. Korrigiere V3__add_feature.sql

# 4. Starte Application neu
```

## 🔄 Migration auf Production

### Erste Umstellung (einmalig)

```bash
# 1. Backup erstellen
pg_dump storedb > backup_before_flyway.sql

# 2. Code deployen (mit Flyway enabled)
git pull
./mvnw clean package
sudo systemctl restart storebackend

# 3. Logs prüfen
sudo journalctl -u storebackend -f

# Erwartete Ausgabe:
# INFO o.f.core.internal.command.DbValidate : Successfully validated 2 migrations
# INFO o.f.core.internal.command.DbMigrate : Current version of schema "public": 0
# INFO o.f.core.internal.command.DbBaseline : Successfully baselined schema with version: 0
# INFO o.f.core.internal.command.DbMigrate : Successfully applied 2 migrations
```

### Bei weiteren Schema-Änderungen

```bash
# 1. Neue Migration erstellen (lokal)
# src/main/resources/db/migration/V3__add_feature.sql

# 2. Lokal testen
./mvnw clean spring-boot:run

# 3. Commit & Push
git add src/main/resources/db/migration/V3__add_feature.sql
git commit -m "feat: Add new feature table"
git push

# 4. Auf Production deployen
git pull
./mvnw clean package
sudo systemctl restart storebackend

# ✅ Flyway führt automatisch nur V3 aus
```

## 📊 Best Practices

### ✅ DO's

1. **Immer CREATE IF NOT EXISTS verwenden**
   ```sql
   CREATE TABLE IF NOT EXISTS my_table (...);
   ```

2. **Indizes mit IF NOT EXISTS**
   ```sql
   CREATE INDEX IF NOT EXISTS idx_name ON table(column);
   ```

3. **Versionsnummern fortlaufend**
   - V1, V2, V3, V4...
   - Oder: V1.0, V1.1, V2.0

4. **Beschreibende Namen**
   - `V3__add_payment_methods.sql` ✅
   - `V3__update.sql` ❌

5. **Transaktionen nutzen** (PostgreSQL)
   ```sql
   BEGIN;
   -- Änderungen
   COMMIT;
   ```

6. **Backup vor großen Änderungen**
   ```bash
   pg_dump storedb > backup_before_v10.sql
   ```

### ❌ DON'Ts

1. **NIEMALS bestehende Migrationen ändern**
   - Nach dem Deployment sind sie immutable!
   - Erstelle stattdessen neue Migration

2. **KEINE DROP TABLE ohne IF EXISTS**
   ```sql
   DROP TABLE users;  -- ❌ Datenverlust!
   DROP TABLE IF EXISTS users;  -- ⚠️ Nur wenn wirklich nötig
   ```

3. **KEINE DDL-Änderungen ohne Migration**
   - Alle Schema-Änderungen nur via Flyway
   - Nie manuell in Production ausführen

4. **KEIN flyway:clean in Production**
   ```bash
   ./mvnw flyway:clean  # ❌ Löscht ALLE Daten!
   ```

## 🔐 Berechtigungen

Flyway benötigt folgende Rechte:

```sql
-- Für storeapp User (Production)
GRANT CREATE ON SCHEMA public TO storeapp;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO storeapp;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO storeapp;

-- Flyway erstellt automatisch:
-- - flyway_schema_history Tabelle
-- - Alle definierten Tabellen
-- - Alle Indizes
```

## 🎓 Vergleich: Alte vs. Neue Methode

| Aspekt | Alte Methode (init-schema.sql) | Neue Methode (Flyway) |
|--------|--------------------------------|------------------------|
| **Ausführung** | Manuell als postgres User | Automatisch beim Start |
| **Versionierung** | ❌ Keine | ✅ V1, V2, V3... |
| **Status** | ❌ Unbekannt | ✅ flyway_schema_history |
| **Wiederholbar** | ⚠️ Nur mit DROP | ✅ Idempotent |
| **Rollback** | ❌ Nicht möglich | ✅ Möglich |
| **CI/CD** | ⚠️ Kompliziert | ✅ Automatisch |
| **Team-Arbeit** | ⚠️ Konflikte | ✅ Merge-freundlich |
| **Datensicherheit** | ⚠️ DROP bei jedem Run | ✅ Kein Datenverlust |

## 📚 Weiterführende Ressourcen

- [Flyway Official Docs](https://flywaydb.org/documentation/)
- [Spring Boot Flyway Integration](https://docs.spring.io/spring-boot/docs/current/reference/html/howto.html#howto.data-initialization.migration-tool.flyway)
- [Flyway Best Practices](https://flywaydb.org/documentation/bestpractices)

## 🎉 Zusammenfassung

Mit Flyway ist die Datenbank-Verwaltung jetzt:
- **Einfacher**: Keine manuellen Scripts mehr
- **Sicherer**: Keine Datenverluste durch DROP statements
- **Reproduzierbar**: Gleiche Migrationen auf dev, staging, production
- **Versioniert**: Jede Änderung nachvollziehbar
- **Automatisiert**: CI/CD ready

**Die alten `scripts/init-schema.sql` und zugehörigen Shell-Scripts können entfernt werden!**

