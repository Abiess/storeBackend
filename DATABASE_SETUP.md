# Datenbank-Setup für Production (mit Flyway)

## 🎯 Übersicht

Das Store Backend verwendet jetzt **Flyway** für automatisierte, versionierte Datenbank-Migrationen. Dies ersetzt die alten manuellen SQL-Scripts und macht Deployments deutlich einfacher und sicherer.

## ✅ Wichtige Änderungen

### Was ist neu?

- ✅ **Flyway verwaltet Schema-Migrationen automatisch**
- ✅ **Hibernate mit `ddl-auto: validate`** (nur Validierung, kein Auto-DDL)
- ✅ **Versionierte Migrationen** in `src/main/resources/db/migration/`
- ✅ **Automatische Ausführung** beim Application-Start
- ✅ **Keine manuellen Scripts** mehr erforderlich

### Was wurde ersetzt?

- ❌ ~~`scripts/init-schema.sql`~~ → Flyway Migrationen
- ❌ ~~`scripts/init-schema.sh`~~ → Automatisch beim Start
- ❌ ~~`scripts/reset-database.sh`~~ → `scripts/flyway-helper.sh clean`
- ❌ ~~Manuelle Ausführung als postgres User~~ → Läuft als storeapp User

## 📁 Migrations-Struktur

```
src/main/resources/db/migration/
├── V1__initial_schema.sql      # Erstellt alle 30+ Tabellen + Indizes
└── V2__initial_data.sql        # Fügt FREE Plan hinzu
```

## 🚀 Deployment-Prozess

### 1. Erstes Deployment (neue Installation)

```bash
# 1. Code deployen
git pull
./mvnw clean package

# 2. Application starten
sudo systemctl restart storebackend

# 3. Flyway läuft automatisch:
# ✅ Erstellt flyway_schema_history Tabelle
# ✅ Führt V1__initial_schema.sql aus (alle Tabellen)
# ✅ Führt V2__initial_data.sql aus (FREE Plan)
# ✅ Hibernate validiert Schema

# 4. Fertig! Keine manuellen Scripts nötig
```

### 2. Deployment auf existierender Datenbank

```bash
# 1. Backup erstellen (Sicherheit!)
export DB_PASSWORD='your_password'
./scripts/flyway-helper.sh backup

# 2. Code deployen
git pull
./mvnw clean package

# 3. Application starten
sudo systemctl restart storebackend

# Flyway erkennt automatisch existierende Datenbank:
# ✅ Erstellt Baseline (Version 0)
# ✅ Markiert V1 + V2 als bereits ausgeführt
# ✅ Keine Änderungen an existierenden Daten
```

### 3. Schema-Updates

```bash
# Neue Migration wurde hinzugefügt (z.B. V3__add_feature.sql)

# 1. Code deployen
git pull
./mvnw clean package

# 2. Application starten
sudo systemctl restart storebackend

# Flyway führt automatisch nur V3 aus:
# ✅ Prüft: V1, V2 bereits ausgeführt
# ✅ Führt nur V3 aus
# ✅ Hibernate validiert neues Schema
```

## 🔧 Konfiguration

### application-production.yml

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate  # ✅ Nur validieren, Schema kommt von Flyway

  flyway:
    enabled: true
    baseline-on-migrate: true  # Wichtig für existierende DBs
    baseline-version: 0
    locations: classpath:db/migration
    user: storeapp
    password: ${SPRING_DATASOURCE_PASSWORD}
```

## 🛠️ Flyway Helper Script

Für manuelle Operationen (selten nötig):

```bash
# Status prüfen
export DB_PASSWORD='your_password'
./scripts/flyway-helper.sh status

# Ausgabe:
# installed_rank | version | description    | script
# 1              | 0       | Baseline       | << Flyway Baseline >>
# 2              | 1       | initial schema | V1__initial_schema.sql
# 3              | 2       | initial data   | V2__initial_data.sql
```

### Verfügbare Befehle

```bash
./scripts/flyway-helper.sh status    # Zeige Migrations-Status
./scripts/flyway-helper.sh tables    # Zeige alle Tabellen
./scripts/flyway-helper.sh check     # Prüfe letzte Migration
./scripts/flyway-helper.sh repair    # Repariere fehlgeschlagene Migrationen
./scripts/flyway-helper.sh baseline  # Erstelle Baseline (einmalig)
./scripts/flyway-helper.sh backup    # Erstelle Backup
./scripts/flyway-helper.sh clean     # ⚠️ LÖSCHT ALLE DATEN!
```

## 📊 Datenbank-Struktur

### Erstellte Tabellen (30+)

Die Flyway-Migration `V1__initial_schema.sql` erstellt automatisch:

**Benutzer & Authentifizierung**
- `users` - Benutzerkonten
- `user_roles` - Benutzerrollen
- `plans` - Subscription-Pläne
- `customer_profiles` - Kundenprofile
- `customer_addresses` - Adressen

**Stores & Domains**
- `stores` - Store-Definitionen
- `domains` - Custom Domains
- `store_usage` - Nutzungsstatistiken
- `store_themes` - Store-Themes
- `redirect_rules` - URL-Redirects

**Produkte & Medien**
- `products` - Produktdaten
- `categories` - Kategorien
- `product_options` - Produktoptionen
- `product_option_values` - Optionswerte
- `product_variants` - Produktvarianten
- `inventory_logs` - Lagerbestand-Logs
- `media` - Hochgeladene Dateien
- `product_media` - Produkt-Media-Verknüpfung

**Shopping & Checkout**
- `carts` - Warenkörbe
- `cart_items` - Warenkorb-Items
- `orders` - Bestellungen
- `order_items` - Bestellpositionen
- `order_status_history` - Statusverlauf

**Customer Features**
- `wishlists` - Wunschlisten
- `wishlist_items` - Wunschlisten-Items
- `saved_carts` - Gespeicherte Warenkörbe
- `saved_cart_items` - Gespeicherte Items

**Coupons & Marketing**
- `coupons` - Gutscheine
- `coupon_product_ids` - Produkt-Zuordnungen
- `coupon_category_ids` - Kategorie-Zuordnungen
- `coupon_collection_ids` - Collection-Zuordnungen
- `coupon_customer_emails` - Kunden-Einschränkungen
- `coupon_domain_ids` - Domain-Einschränkungen
- `coupon_redemptions` - Einlösungen

**System**
- `audit_logs` - Audit-Trail
- `flyway_schema_history` - Migrations-Historie (automatisch)

## 🔍 Monitoring & Diagnose

### Application Logs prüfen

```bash
# Flyway Migrations im Log
sudo journalctl -u storebackend -f | grep -i flyway

# Erwartete Ausgabe bei erfolgreichem Start:
# INFO o.f.c.i.d.base.BaseDatabaseType : Database: jdbc:postgresql://localhost:5432/storedb
# INFO o.f.core.internal.command.DbValidate : Successfully validated 2 migrations
# INFO o.f.core.internal.command.DbMigrate : Current version of schema "public": 2
# INFO o.f.core.internal.command.DbMigrate : Schema "public" is up to date. No migration necessary.
```

### Direkt in Datenbank prüfen

```bash
export DB_PASSWORD='your_password'
psql -h localhost -U storeapp -d storedb

-- Zeige Migrations-Historie
SELECT * FROM flyway_schema_history ORDER BY installed_rank;

-- Zeige alle Tabellen
\dt

-- Zeige Tabellengröße
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🚨 Troubleshooting

### Problem: "Validate failed: Migrations have failed validation"

**Ursache**: Migration wurde nachträglich geändert

**Lösung**:
```bash
# 1. Status prüfen
./scripts/flyway-helper.sh status

# 2. Repair durchführen
./scripts/flyway-helper.sh repair
```

### Problem: "Found non-empty schema without schema history"

**Ursache**: Existierende Datenbank ohne Flyway-Historie

**Lösung**: Baseline ist bereits konfiguriert!
```yaml
flyway:
  baseline-on-migrate: true  # ✅ Bereits aktiviert
```

Beim nächsten Start wird automatisch ein Baseline erstellt.

### Problem: Migration schlägt fehl

**Symptome**:
```
Migration V3__add_feature.sql failed
ERROR: relation "xyz" does not exist
```

**Lösung**:
```bash
# 1. Logs prüfen
sudo journalctl -u storebackend -n 100

# 2. Status prüfen
./scripts/flyway-helper.sh status

# 3. Fehlgeschlagene Migration entfernen
./scripts/flyway-helper.sh repair

# 4. Migration korrigieren und neu deployen
```

## 📝 Neue Migration hinzufügen

### Beispiel: Neue Tabelle

```bash
# 1. Erstelle neue Migration
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
```

```bash
# 2. Lokal testen
./mvnw clean spring-boot:run

# 3. Commit & Push
git add src/main/resources/db/migration/V3__add_subscription_table.sql
git commit -m "feat: Add subscriptions table"
git push

# 4. Auf Production deployen
git pull
./mvnw clean package
sudo systemctl restart storebackend

# ✅ Flyway führt automatisch V3 aus
```

## 🔄 Migration von altem System

Falls du noch die alten Scripts verwendest:

### Option 1: Fresh Start (neue Installation)

```bash
# Einfach deployen - Flyway macht alles automatisch
git pull
./mvnw clean package
sudo systemctl restart storebackend
```

### Option 2: Existierende Datenbank (Production)

```bash
# 1. Backup erstellen
export DB_PASSWORD='your_password'
pg_dump storedb > backup_before_flyway.sql

# 2. Code deployen
git pull
./mvnw clean package

# 3. Application starten
sudo systemctl restart storebackend

# ✅ Flyway erkennt existierende Tabellen
# ✅ Erstellt Baseline automatisch
# ✅ Keine Änderungen an Daten
```

## 📊 Vergleich: Alt vs. Neu

| Aspekt | Alte Methode | Flyway |
|--------|-------------|--------|
| **Schema-Erstellung** | Manuell als postgres User | Automatisch beim Start |
| **Versionierung** | ❌ Keine | ✅ V1, V2, V3... |
| **Status-Tracking** | ❌ Unbekannt | ✅ flyway_schema_history |
| **Wiederholbarkeit** | ⚠️ DROP TABLE nötig | ✅ Idempotent |
| **Berechtigungen** | ⚠️ postgres + storeapp | ✅ Nur storeapp |
| **CI/CD** | ⚠️ Kompliziert | ✅ Automatisch |
| **Rollback** | ❌ Nicht möglich | ✅ Möglich |
| **Team-Arbeit** | ⚠️ Konflikte | ✅ Merge-freundlich |

## 🎉 Best Practices

### ✅ DO's

1. **Backup vor großen Änderungen**
   ```bash
   ./scripts/flyway-helper.sh backup
   ```

2. **CREATE IF NOT EXISTS verwenden**
   ```sql
   CREATE TABLE IF NOT EXISTS my_table (...);
   CREATE INDEX IF NOT EXISTS idx_name ON table(column);
   ```

3. **Migrationen lokal testen**
   ```bash
   ./mvnw clean spring-boot:run
   ```

4. **Beschreibende Versionsnamen**
   - `V3__add_payment_methods.sql` ✅
   - `V3__update.sql` ❌

### ❌ DON'Ts

1. **NIEMALS bestehende Migrationen ändern**
   - Nach Deployment sind sie immutable
   - Erstelle stattdessen neue Migration

2. **KEIN flyway:clean in Production**
   - Löscht ALLE Daten!

3. **KEINE manuellen DDL-Änderungen**
   - Alle Schema-Änderungen über Flyway

## 📚 Weiterführende Dokumentation

- [Flyway Migration Guide](FLYWAY_MIGRATION_GUIDE.md) - Detaillierte Anleitung
- [VPS Deployment Guide](VPS_DEPLOYMENT_GUIDE.md) - Kompletter Deployment-Prozess
- [Flyway Official Docs](https://flywaydb.org/documentation/)

## ✅ Zusammenfassung

Mit Flyway ist die Datenbank-Verwaltung jetzt:
- **Einfacher**: Keine manuellen Scripts
- **Sicherer**: Keine Datenverluste
- **Automatisiert**: Läuft beim App-Start
- **Versioniert**: Nachvollziehbar
- **Professionell**: Industry Standard

**Die alten Shell-Scripts werden nicht mehr benötigt!**
