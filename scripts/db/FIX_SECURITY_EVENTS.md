# 🔧 FIX: security_events Tabelle erstellen

**Problem:** `pq: relation "security_events" does not exist`

**Ursache:** Die Tabelle wurde in den Schema-Dateien vergessen.

---

## ✅ LÖSUNG - 3 Optionen

### Option 1: Via SQL-Script (EMPFOHLEN)

```bash
# PostgreSQL CLI
psql -U postgres -d storebackend -f scripts/db/create_security_events.sql

# Oder mit anderem User
psql -U dein_user -d storebackend -f scripts/db/create_security_events.sql
```

### Option 2: Via DBeaver/pgAdmin (GUI)

1. **Öffne:** `scripts/db/create_security_events.sql`
2. **Markiere alles** (Strg+A)
3. **Ausführen** (F5 oder Execute)
4. **Prüfe Output:** Sollte "✅ security_events Tabelle erfolgreich erstellt!" zeigen

### Option 3: Backend neu starten (automatisch)

Wenn `ddl-auto: update` aktiv ist:

```bash
cd storeBackend
mvn spring-boot:run
```

Spring Boot sollte die Tabelle automatisch erstellen.

**ABER:** Die Schema-Dateien sind jetzt auch aktualisiert, falls du die Datenbank neu erstellen musst.

---

## 🔍 PRÜFUNG

Nach der Erstellung prüfen:

```sql
-- Tabelle existiert?
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'security_events';

-- Spalten korrekt?
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'security_events' 
ORDER BY ordinal_position;

-- Test-Event vorhanden?
SELECT COUNT(*) FROM security_events;
-- Sollte 1 sein (Test-Event)

-- Grafana-Query testen:
SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE blocked = true) as blocked,
    COUNT(DISTINCT endpoint) as endpoints
FROM security_events;
```

---

## 📄 AKTUALISIERTE DATEIEN

1. ✅ `scripts/db/schema.sql` - V24 hinzugefügt
2. ✅ `src/main/resources/schema.sql` - V24 hinzugefügt
3. ✅ `scripts/db/create_security_events.sql` - Separates Script erstellt

---

## 🎯 NÄCHSTE SCHRITTE

Nach erfolgreicher Erstellung:

1. ✅ Tabelle existiert
2. ✅ Grafana Dashboards importieren (sollten jetzt funktionieren)
3. ✅ Backend starten → Security Events werden geloggt
4. ✅ Grafana → Dashboard prüfen → Panels sollten Daten zeigen

---

## 🚨 WENN ES IMMER NOCH NICHT FUNKTIONIERT

### Problem: Tabelle existiert, aber Grafana sieht sie nicht

**Lösung 1:** Datasource-Berechtigungen prüfen
```sql
-- Als Grafana User einloggen und testen:
SELECT current_user;
SELECT COUNT(*) FROM security_events;
```

**Lösung 2:** Grafana Datasource neu verbinden
```
Grafana → Connections → Data sources → PostgreSQL
→ Test → sollte "Database Connection OK" zeigen
```

### Problem: ddl-auto erstellt die Tabelle nicht

**Check application.properties:**
```properties
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
```

**Check Entity Package:**
```java
// Application.java sollte haben:
@EntityScan("storebackend.entity")
```

---

**Datum:** 2026-07-15  
**Status:** ✅ Schema-Dateien aktualisiert  
**Nächster Schritt:** SQL-Script ausführen
