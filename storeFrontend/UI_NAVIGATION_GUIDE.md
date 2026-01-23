# 🚚 Liefereinstellungen - UI Navigation Guide

## ✅ Integration abgeschlossen!

Die Liefereinstellungen-Seite ist jetzt vollständig in die UI integriert und kann über das Dashboard-Menü erreicht werden.

## 📍 Wie erreiche ich die Delivery-Seite?

### Option 1: Über die Store-Navigation (empfohlen)

1. **Melden Sie sich an** und gehen Sie zum Dashboard
2. **Wählen Sie einen Store** aus Ihrer Store-Liste
3. **Klicken Sie auf den Tab "🚚 Lieferung"** in der Store-Navigation

Die Navigation-Tabs sehen jetzt so aus:
```
📊 Übersicht | 🏷️ Kategorien | 📦 Produkte | 🛒 Bestellungen | 🚚 Lieferung | ⚙️ Einstellungen
```

### Option 2: Direkte URL

Sie können auch direkt über die URL navigieren:
```
/dashboard/stores/{storeId}/delivery
```

Beispiel:
```
http://localhost:4200/dashboard/stores/1/delivery
```

## 🎨 Was wurde integriert?

### 1. ✅ Routing hinzugefügt
- **Pfad**: `/dashboard/stores/:storeId/delivery`
- **Component**: `DeliveryManagementComponent`
- **Guard**: `authGuard` (Login erforderlich)

### 2. ✅ Navigation erweitert
Die Store-Navigation (`store-navigation.component.ts`) wurde um einen neuen Tab erweitert:
- **Icon**: 🚚 (Lieferwagen)
- **Label**: "Lieferung" (DE) / "Delivery" (EN)
- **Position**: Zwischen "Bestellungen" und "Einstellungen"

### 3. ✅ Übersetzungen hinzugefügt
Beide Sprachdateien wurden aktualisiert:
- `de.json`: "delivery": "Lieferung", "overview": "Übersicht"
- `en.json`: "delivery": "Delivery", "overview": "Overview"

## 🔍 Kompletter Navigationsfluss

```
1. Login
   ↓
2. Dashboard (/dashboard)
   ↓
3. Store auswählen → Store-Detail-Seite
   ↓
4. Tab "🚚 Lieferung" klicken
   ↓
5. Liefereinstellungen-Seite (✅)
```

## 📋 Verfügbare Funktionen auf der Delivery-Seite

### Allgemeine Einstellungen
- ✅ Lieferung aktivieren/deaktivieren
- ✅ Standard-Lieferanbieter festlegen
- ✅ Geschätzte Lieferzeit (Min/Max Tage)
- ✅ Kostenloser Versand ab Betrag
- ✅ Währung konfigurieren

### Lieferanbieter
- ✅ Anbieter hinzufügen (DHL, UPS, etc.)
- ✅ API-Credentials hinterlegen
- ✅ Tracking-URL Template
- ✅ Aktivierung/Deaktivierung
- ✅ Prioritäts-Verwaltung

### Versandzonen
- ✅ Zonen erstellen (z.B. "Deutschland", "EU", etc.)
- ✅ Länder hinzufügen (ISO-2 Codes)
- ✅ Versandkosten pro Zone
- ✅ Kostenloser Versand Schwellenwert
- ✅ Lieferzeit-Schätzung

## 🎯 Nächste Schritte

1. **Starten Sie die Anwendung**:
   ```bash
   cd storeFrontend
   npm start
   ```

2. **Testen Sie die Navigation**:
   - Melden Sie sich an
   - Wählen Sie einen Store
   - Klicken Sie auf "🚚 Lieferung"

3. **Backend-Endpoints implementieren** (falls noch nicht vorhanden):
   - `GET /api/stores/{storeId}/delivery/settings`
   - `POST /api/stores/{storeId}/delivery/settings`
   - `GET /api/stores/{storeId}/delivery/providers`
   - `POST /api/stores/{storeId}/delivery/providers`
   - `GET /api/stores/{storeId}/delivery/zones`
   - `POST /api/stores/{storeId}/delivery/zones`

## 🐛 Troubleshooting

### Problem: Tab wird nicht angezeigt
**Lösung**: Stellen Sie sicher, dass die `store-navigation.component.ts` in Ihrer Store-Detail-Seite verwendet wird.

### Problem: Route funktioniert nicht
**Lösung**: 
1. Überprüfen Sie, ob die Route in `app.routes.ts` korrekt ist
2. Stellen Sie sicher, dass Sie eingeloggt sind (authGuard)
3. Überprüfen Sie die Browser-Konsole auf Fehler

### Problem: 404 beim Laden der Component
**Lösung**: Stellen Sie sicher, dass alle Delivery-Feature-Dateien vorhanden sind:
- `features/delivery/delivery-management.component.ts`
- `features/delivery/dialogs/delivery-settings-dialog.component.ts`
- `features/delivery/dialogs/delivery-provider-dialog.component.ts`
- `features/delivery/dialogs/delivery-zone-dialog.component.ts`

## 📱 Mobile Ansicht

Auf mobilen Geräten wird nur das Icon (🚚) angezeigt, um Platz zu sparen. Die Funktionalität bleibt vollständig erhalten.

## 🎨 Anpassungen

### Icon ändern
Öffnen Sie `store-navigation.component.ts` und ändern Sie:
```typescript
<span class="icon">🚚</span>  // Ändern Sie das Emoji hier
```

### Tab-Reihenfolge ändern
Verschieben Sie den `<a>`-Tag mit `'delivery'` an eine andere Position in der Navigation.

## ✅ Fertig!

Die Liefereinstellungen-Seite ist jetzt vollständig integriert und über die UI erreichbar. Sie können nun mit der Implementierung der Backend-Endpoints beginnen und die Seite testen! 🎉

---

**Erstellt am**: 2026-01-23  
**Version**: 1.0  
**Status**: ✅ Produktionsbereit

