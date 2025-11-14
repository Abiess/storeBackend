- Tablet: Horizontales Scrollen für große Tabellen
- Mobile: Optimierte Ansicht mit gestapelten Informationen

## 🔐 Sicherheit & Compliance

### Datenschutz
- IP-Adressen werden **anonymisiert** gespeichert (optional)
- Logs können nach **90 Tagen automatisch gelöscht** werden
- Zugriff nur für **autorisierte Benutzer**

### Compliance
- **DSGVO-konform**: Vollständige Änderungshistorie
- **GoBD-konform**: Unveränderbare Protokollierung
- **ISO 27001**: Audit-Trail für Sicherheitsvorfälle

## 🎯 Best Practices

1. **Regelmäßig überprüfen**: Schauen Sie wöchentlich in die Logs
2. **Filter nutzen**: Filtern Sie nach relevanten Bereichen
3. **Exportieren**: Speichern Sie wichtige Logs als CSV
4. **Schulung**: Informieren Sie Ihr Team über die Protokollierung
5. **Reaktion**: Reagieren Sie schnell auf ungewöhnliche Aktivitäten

## 📈 Erweiterungen (geplant)

- [ ] Real-time Benachrichtigungen bei kritischen Änderungen
- [ ] Grafische Auswertungen (Charts, Diagramme)
- [ ] Automatische Anomalie-Erkennung
- [ ] Integration mit externen SIEM-Systemen
- [ ] Wiederherstellung aus Audit-Logs (Rollback)
- [ ] Multi-Store-Übersicht
- [ ] Benutzerdefinierte Alerts

## 🆘 Support

Bei Fragen oder Problemen:
1. Überprüfen Sie die Konsole auf Fehler
2. Stellen Sie sicher, dass `useMockData` in `environment.ts` korrekt gesetzt ist
3. Kontaktieren Sie den Support mit Screenshots

---

**Version**: 1.0.0  
**Letztes Update**: 2025-01-14  
**Autor**: Store Backend Team
# Audit-Log / Änderungsprotokoll-System

## 📋 Übersicht

Das Audit-Log-System protokolliert **alle wichtigen Änderungen** in Ihrem Shop und zeigt:
- **Welcher Benutzer** die Änderung vorgenommen hat
- **Welche Rolle** der Benutzer hatte
- **Was genau** geändert wurde (Feld für Feld)
- **Wann** die Änderung stattfand
- **Welche IP-Adresse** verwendet wurde

## 🎯 Funktionen

### 1. Vollständige Änderungsverfolgung
- ✅ Produkte (Erstellen, Bearbeiten, Löschen)
- ✅ Kategorien (Erstellen, Bearbeiten, Löschen)
- ✅ Bestellungen (Statusänderungen)
- ✅ Einstellungen (Shop-Einstellungen, Theme-Änderungen)
- ✅ Benutzer (Rollen, Berechtigungen)
- ✅ Domains (Hinzufügen, Verifizieren)
- ✅ Medien (Uploads, Löschen)

### 2. Erweiterte Filterung
- Nach **Aktion** (Erstellt, Aktualisiert, Gelöscht, etc.)
- Nach **Bereich** (Produkt, Kategorie, Bestellung, etc.)
- Nach **Benutzer**
- Nach **Zeitraum** (Von-Bis Datum)

### 3. Detail-Ansicht
- Klicken Sie auf einen Eintrag, um **alle Feldänderungen** zu sehen
- **Vorher/Nachher-Vergleich** für jedes geänderte Feld
- Farbcodierung: Rot = Alter Wert, Grün = Neuer Wert

### 4. Export-Funktion
- Exportieren Sie Audit-Logs als **CSV-Datei**
- Für Compliance, Audits oder interne Dokumentation

## 🎨 Benutzeroberfläche

### Hauptansicht
- **Tabellarische Darstellung** aller Änderungen
- **Farbige Badges** für verschiedene Aktionen:
  - 🟢 Grün: Erstellt, Aktiviert, Veröffentlicht
  - 🔵 Blau: Aktualisiert, Exportiert, Importiert
  - 🟡 Gelb: Deaktiviert, Unveröffentlicht
  - 🔴 Rot: Gelöscht
  - ⚪ Grau: Login, Logout

### Benutzerinformationen
Jeder Eintrag zeigt:
- **Name** des Benutzers
- **E-Mail-Adresse**
- **Rolle** (Shop-Besitzer, Manager, Mitarbeiter)

### Änderungsdetails
Erweiterte Ansicht zeigt:
- Feldname (z.B. "Preis", "Status", "Name")
- Alter Wert → Neuer Wert
- Visuelle Hervorhebung der Änderungen

## 📊 Verwendung

### 1. In den Settings öffnen
```
Dashboard → Einstellungen → Tab "Änderungsprotokoll"
```

### 2. Filter anwenden
```typescript
// Beispiel: Alle Produktänderungen der letzten 7 Tage
Bereich: Produkt
Von: 2025-01-07
Bis: 2025-01-14
```

### 3. Details anzeigen
Klicken Sie auf ▶ neben einem Eintrag, um alle Feldänderungen zu sehen.

### 4. Exportieren
Klicken Sie auf "📥 Exportieren", um eine CSV-Datei herunterzuladen.

## 🔧 Technische Details

### Modelle
```typescript
interface AuditLog {
  id: number;
  storeId: number;
  userId: number;
  userName: string;
  userEmail: string;
  userRole: Role;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: number;
  entityName?: string;
  changes?: AuditChange[];
  description: string;
  ipAddress?: string;
  createdAt: string;
}

interface AuditChange {
  field: string;
  fieldLabel: string;
  oldValue: any;
  newValue: any;
}
```

### Service
```typescript
// Audit-Logs abrufen
auditLogService.getStoreAuditLogs(storeId, page, size)

// Mit Filter
auditLogService.getAuditLogs({
  storeId: 1,
  action: AuditAction.UPDATE,
  entityType: AuditEntityType.PRODUCT,
  startDate: '2025-01-01',
  endDate: '2025-01-31'
})

// Exportieren
auditLogService.exportAuditLogs(filter)
```

## 🎭 Mock-Daten

Für die Entwicklung sind **6 Beispiel-Einträge** enthalten:
1. Produkt erstellt (Premium Laptop)
2. Produkt aktualisiert (Preis geändert)
3. Theme-Einstellungen geändert
4. Kategorie erstellt
5. Shop-Einstellungen aktualisiert
6. Bestellstatus geändert (von Manager)

## 🚀 Integration mit Backend

### API-Endpoints
```
GET  /api/audit-logs?storeId={id}&page={page}&size={size}
GET  /api/audit-logs?action={action}&entityType={type}
GET  /api/audit-logs/export?storeId={id}
```

### Automatisches Logging
Um automatisch Audit-Logs zu erstellen, fügen Sie in Ihren Services hinzu:

```typescript
// Beispiel: Product-Service
updateProduct(storeId: number, productId: number, data: any) {
  return this.http.put(`/api/products/${productId}`, data)
    .pipe(
      tap(() => {
        // Audit-Log erstellen
        this.auditLogService.logAction({
          storeId,
          action: AuditAction.UPDATE,
          entityType: AuditEntityType.PRODUCT,
          entityId: productId,
          changes: this.calculateChanges(oldData, data)
        });
      })
    );
}
```

## 📱 Responsive Design

Das Audit-Log-System ist **vollständig responsiv**:
- Desktop: Volle Tabelle mit allen Spalten

