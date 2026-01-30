# Flyway Database Migrations - Quick Start

## Was wurde implementiert?

✅ **Flyway** für automatisierte Datenbank-Migrationen
✅ **Hibernate DDL-Auto: validate** (keine automatischen Schema-Änderungen mehr)
✅ Versionierte SQL-Migrationen statt manuelle Scripts
✅ Automatische Ausführung beim Application-Start
✅ Baseline-Support für existierende Datenbanken

## Struktur

```
src/main/resources/db/migration/
├── V1__initial_schema.sql    # Alle 30+ Tabellen
└── V2__initial_data.sql      # FREE Plan

scripts/
└── flyway-helper.sh          # Helper für manuelle Operationen
```

## Konfiguration

### application.yml (Dev)
```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate  ✅
  flyway:
    enabled: true
    baseline-on-migrate: true
```

### application-production.yml
```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate  ✅
  flyway:
    enabled: true
    baseline-on-migrate: true
    user: storeapp
    password: ${SPRING_DATASOURCE_PASSWORD}
```

## Verwendung

### Lokale Entwicklung
```bash
# Einfach starten - Flyway macht alles automatisch
./mvnw clean spring-boot:run
```

### Production Deployment
```bash
# 1. Code deployen
git pull
./mvnw clean package

# 2. Starten - Flyway läuft automatisch
sudo systemctl restart storebackend

# 3. Status prüfen (optional)
export DB_PASSWORD='your_password'
./scripts/flyway-helper.sh status
```

### Neue Migration hinzufügen
```bash
# 1. Neue Datei erstellen
touch src/main/resources/db/migration/V3__add_feature.sql

# 2. SQL schreiben
CREATE TABLE IF NOT EXISTS my_table (...);

# 3. Deployen - wird automatisch ausgeführt
```

## Vorteile

| Alt (init-schema.sql) | Neu (Flyway) |
|-----------------------|--------------|
| ❌ Manuell ausführen | ✅ Automatisch |
| ❌ Keine Versionierung | ✅ V1, V2, V3... |
| ❌ DROP TABLE | ✅ Sicher |
| ❌ Berechtigungsprobleme | ✅ Ein User |

## Helper-Commands

```bash
export DB_PASSWORD='your_password'

./scripts/flyway-helper.sh status    # Migrations-Status
./scripts/flyway-helper.sh tables    # Alle Tabellen anzeigen
./scripts/flyway-helper.sh backup    # Backup erstellen
./scripts/flyway-helper.sh repair    # Fehler beheben
```

## Dokumentation

📖 [FLYWAY_MIGRATION_GUIDE.md](FLYWAY_MIGRATION_GUIDE.md) - Vollständige Anleitung
📖 [DATABASE_SETUP.md](DATABASE_SETUP.md) - Deployment & Troubleshooting

## Migration von altem System

Bei **existierender Datenbank**:
- ✅ Flyway erkennt automatisch bestehende Tabellen
- ✅ Erstellt Baseline (Version 0)
- ✅ Keine Änderungen an Daten
- ✅ Einfach deployen und starten!

## Status prüfen

```bash
# In Application Logs
sudo journalctl -u storebackend -f | grep flyway

# Direkt in DB
psql -U storeapp -d storedb
SELECT * FROM flyway_schema_history;
```

Das war's! 🎉

