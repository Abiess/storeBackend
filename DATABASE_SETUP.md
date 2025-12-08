# Datenbank-Setup für Production

## Übersicht

Das Store Backend verwendet PostgreSQL in Production. Dieses Dokument beschreibt das Setup und die Lösung von Berechtigungsproblemen.

## Problem: Hibernate DDL vs. Berechtigungen

### Das ursprüngliche Problem

Bei der Verwendung von `ddl-auto: create` oder `ddl-auto: update` in Production traten folgende Probleme auf:

1. **Berechtigungsfehler**: Der PostgreSQL-User `storeapp` hatte keine Berechtigung, Tabellen im `public` Schema zu erstellen
2. **Fehlende Tabellen**: Hibernate konnte keine Tabellen erstellen, was zu `relation does not exist` Fehlern führte
3. **Inkonsistente Zustände**: Bei `ddl-auto: update` wurden nur Foreign Keys aktualisiert, aber keine neuen Tabellen erstellt

### Die Lösung: SQL-basierte Schema-Initialisierung

Statt sich auf Hibernate DDL zu verlassen, verwenden wir jetzt ein **SQL-Init-Script**, das als PostgreSQL Superuser ausgeführt wird.

## Implementierung

### 1. SQL-Schema-Script (`scripts/init-schema.sql`)

Das Script enthält:
- `DROP TABLE IF EXISTS` Statements für saubere Neuerstellung
- `CREATE TABLE` Statements für alle 16 Tabellen
- Foreign Key Constraints
- Indizes für Performance
- Initiale Daten (FREE Plan)

### 2. Init-Script (`scripts/init-schema.sh`)

Führt das SQL-Script als `postgres` Superuser aus:

```bash
sudo -u postgres psql -d storedb -f init-schema.sql
```

**Wichtig**: 
- Verwendet **lokale Verbindung** (ohne `-h localhost`)
- Keine Passwort-Authentifizierung nötig (peer authentication)
- Läuft automatisch bei jedem Deployment

### 3. Integration in Deployment

Das `deploy.sh` Script führt die Schema-Initialisierung **vor dem App-Start** aus:

```bash
🔄 Reloading systemd daemon...
🗃️ Initializing database schema...
✅ Database schema initialized successfully!
📊 Created 16 tables
🚀 Starting new application...
```

## Datenbank-Struktur

### Erstellte Tabellen (16)

1. **Benutzer & Authentifizierung**
   - `users` - Benutzerkonten
   - `user_roles` - Benutzerrollen (ADMIN, STORE_OWNER, etc.)
   - `plans` - Subscription-Pläne (FREE, PRO, etc.)

2. **Stores & Domains**
   - `stores` - Store-Definitionen
   - `domains` - Custom Domains
   - `store_usage` - Nutzungsstatistiken

3. **Produkte & Medien**
   - `products` - Produktdaten
   - `product_options` - Produktoptionen (Größe, Farbe)
   - `product_option_values` - Optionswerte (S, M, L)
   - `product_variants` - Produktvarianten
   - `media` - Hochgeladene Dateien
   - `product_media` - Produkt-Media-Verknüpfung

4. **Bestellungen**
   - `orders` - Bestellungen
   - `order_items` - Bestellpositionen
   - `order_status_history` - Statusverlauf

5. **Audit**
   - `audit_logs` - Audit-Trail

## Hibernate-Konfiguration

### Production (`application-production.yml`)

```yaml
jpa:
  hibernate:
    ddl-auto: validate  # Nur validieren, nicht erstellen
  show-sql: true
  properties:
    hibernate:
      dialect: org.hibernate.dialect.PostgreSQLDialect
  sql:
    init:
      mode: never  # Kein data.sql ausführen
```

**Wichtig**: `ddl-auto: validate` bedeutet:
- Hibernate erstellt KEINE Tabellen
- Hibernate validiert nur, dass Tabellen existieren
- Schema-Änderungen müssen über SQL-Scripts erfolgen

## Diagnose & Fehlerbehebung

### Datenbank-Diagnose-Script

Das `diagnose-database.sh` Script prüft:
- Vorhandene Schemas
- Alle Tabellen im `public` Schema
- Suche nach spezifischen Tabellen
- Tabellenanzahl

Verwendung:
```bash
cd /opt/storebackend
export DB_PASSWORD="your_password"
./diagnose-database.sh
```

### Reset-Script

Falls die Datenbank zurückgesetzt werden muss:

```bash
cd /opt/storebackend
export DB_PASSWORD="your_password"
./reset-database.sh
```

**Warnung**: Löscht ALLE Tabellen und Daten!

### Häufige Probleme

#### Problem: "permission denied for schema public"

**Lösung**: Das Init-Script muss als `postgres` User laufen:
```bash
sudo -u postgres psql -d storedb -f init-schema.sql
```

#### Problem: "relation does not exist"

**Ursachen**:
- Schema-Init-Script wurde nicht ausgeführt
- Tabellen wurden gelöscht
- Falsches Schema verwendet

**Lösung**:
1. Führe `diagnose-database.sh` aus
2. Wenn keine Tabellen: Führe `init-schema.sh` aus
3. Starte App neu

#### Problem: "no password supplied"

**Ursache**: Versuch einer Netzwerk-Verbindung als postgres User

**Lösung**: Verwende lokale Verbindung ohne `-h` Parameter:
```bash
# Falsch (braucht Passwort):
psql -h localhost -U postgres -d storedb

# Richtig (peer authentication):
sudo -u postgres psql -d storedb
```

## Berechtigungen (Optional)

Falls der `storeapp` User auch Tabellen erstellen soll:

```bash
cd /opt/storebackend
./grant-permissions.sh
```

Dies erteilt:
- `CREATE` Berechtigung auf `public` Schema
- `ALL PRIVILEGES` auf allen Tabellen
- `ALL PRIVILEGES` auf allen Sequences

## Deployment-Workflow

1. **Build**: Maven baut JAR mit allen Entity-Klassen
2. **Upload**: JAR + Scripts werden zum Server hochgeladen
3. **Schema-Init**: SQL-Script erstellt alle Tabellen
4. **App-Start**: Spring Boot startet mit `ddl-auto: validate`
5. **Validierung**: Hibernate validiert, dass alle Tabellen existieren
6. **Diagnose**: Script prüft Tabellen
7. **Health-Check**: Deployment erfolgreich

## Backup & Restore

### Backup erstellen

```bash
cd /opt/storebackend
./scripts/backup-database.sh
```

### Backup wiederherstellen

```bash
cd /opt/storebackend
./scripts/restore-database.sh backup-file.sql
```

## Best Practices

1. **Schema-Änderungen**: Immer über SQL-Scripts (nicht via Hibernate DDL)
2. **Backups**: Vor jedem Schema-Update Backup erstellen
3. **Testing**: Schema-Changes erst in Staging testen
4. **Validierung**: Nach Deployment Diagnose-Script ausführen
5. **Monitoring**: Logs auf `relation does not exist` Fehler überwachen

## Weiterführende Dokumentation

- [VPS Deployment Guide](VPS_DEPLOYMENT_GUIDE.md) - Kompletter Deployment-Prozess
- [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) - Aktueller Status
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Schnellreferenz für häufige Aufgaben

