# Database Scripts - Verwendung & Status

## 📁 Dateien in diesem Verzeichnis:

### `schema.sql` ✅ (Optional)

**Status:** ⚠️ **Nur für manuelle DB-Setups / Backup**

**Verwendung:**
- **NICHT** automatisch von Spring Boot geladen
- Kann manuell für DB-Initialisierung verwendet werden
- Backup/Referenz für die Tabellenstruktur

**Wann nützlich:**
```bash
# Manuelle DB-Initialisierung (falls Hibernate deaktiviert wäre)
psql -U storeapp -d storedb -f scripts/db/schema.sql
```

---

## ⚙️ Aktuelle Architektur:

### Schema-Verwaltung:

```
┌─────────────────────────────────────────────┐
│  Hibernate DDL (aus Entity-Klassen)        │
│  = PRIMARY SOURCE OF TRUTH                  │
│                                             │
│  • Lokal (H2): ddl-auto: create-drop       │
│  • Production: ddl-auto: update            │
└─────────────────────────────────────────────┘
                    │
                    ├─ Erstellt: Alle Tabellen
                    ├─ Updated: Fehlende Spalten
                    └─ Verwaltet: Constraints, Indizes

┌─────────────────────────────────────────────┐
│  scripts/db/schema.sql                      │
│  = BACKUP / MANUELLE REFERENZ               │
│                                             │
│  • Wird NICHT automatisch geladen          │
│  • Kann manuell verwendet werden            │
│  • Sollte synchron mit Entities bleiben    │
└─────────────────────────────────────────────┘
```

---

## 🔄 Scripts die schema.sql verwenden:

### ~~`reset-database-no-flyway.sh`~~ ✅ **UPDATED**

**Vorher:**
```bash
# Verwendete schema.sql direkt
psql -f /opt/storebackend/scripts/schema.sql
```

**Jetzt:**
```bash
# Lässt Hibernate das Schema erstellen
sudo systemctl restart storebackend
# → Hibernate erstellt Schema aus Entities
```

---

## 📝 Maintenance:

### Wenn Entity geändert wird:

1. **Hibernate kümmert sich automatisch** ✅
   - Lokal: Schema wird neu erstellt
   - Production: Schema wird geupdated

2. **Optional: schema.sql aktualisieren**
   - Damit es als Referenz aktuell bleibt
   - Aber nicht zwingend nötig

### Beispiel:

```java
// Entity ändern:
@Entity
public class Subscription {
    @Column(name = "new_field")  // ← Neues Feld
    private String newField;
}
```

**Ergebnis:**
- ✅ Hibernate fügt Spalte automatisch hinzu
- ℹ️ schema.sql kann manuell geupdated werden (optional)

---

## ⚠️ Wichtige Hinweise:

### ❌ NICHT verwenden für:
- Automatisches Schema-Loading (ist deaktiviert)
- Production Deployments (Hibernate macht das)
- Normale Entwicklung (Hibernate macht das)

### ✅ Verwenden für:
- Manuelle DB-Initialisierung (falls nötig)
- Referenz für Tabellenstruktur
- Dokumentation
- Backup

---

## 🎯 Zusammenfassung:

| Aspekt | Status |
|--------|--------|
| **Wird automatisch geladen?** | ❌ Nein (`spring.sql.init.mode: never`) |
| **Ist noch nützlich?** | ⚠️ Nur als Referenz/Backup |
| **Muss gepflegt werden?** | ℹ️ Optional (Hibernate ist Source of Truth) |
| **Schema-Quelle für Production?** | ❌ Nein (Hibernate Entities) |

---

## 🚀 Best Practice:

**Für Schema-Änderungen:**
1. ✅ Entity-Klasse ändern
2. ✅ Hibernate erstellt/updated automatisch
3. ℹ️ Optional: schema.sql aktualisieren (für Konsistenz)

**Kein manuelles SQL mehr nötig!** 🎉

