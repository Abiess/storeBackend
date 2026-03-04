# 📋 Date-Konvertierung - Übersicht aller betroffenen Komponenten

## ✅ Bereits implementiert

### 1. **subscription.service.ts**
- ✅ `getCurrentSubscription()` - konvertiert alle Date-Felder
- ✅ `getSubscriptionHistory()` - konvertiert für alle Subscriptions

### 2. **subscription.component.ts** (Subscription Page)
- ✅ `loadCurrentSubscription()` - Sicherheitskonvertierung
- ✅ Zeigt aktiven Plan korrekt an
- ✅ DatePipes funktionieren im Template

### 3. **dashboard.component.ts**
- ✅ `formatDate()` - Custom Formatter für Store.createdAt
- ✅ Unterstützt sowohl Arrays als auch ISO-Strings

## 🔧 Utility-Funktion

**Datei:** `src/app/core/utils/date.utils.ts`

```typescript
export function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (Array.isArray(value) && value.length >= 3) {
    return new Date(
      value[0],           // year
      value[1] - 1,       // month (0-11)
      value[2],           // day
      value[3] || 0,      // hour
      value[4] || 0,      // minute
      value[5] || 0,      // second
      Math.floor((value[6] || 0) / 1000000) // nano → ms
    );
  }
  return null;
}
```

## 📋 Checkliste für neue Komponenten

Wenn du eine neue Komponente erstellst, die Dates vom Backend empfängt:

### ✅ Schritt 1: Import
```typescript
import { toDate } from '@app/core/utils/date.utils';
```

### ✅ Schritt 2: Nach API-Call konvertieren
```typescript
// In deinem Service:
this.http.get<MyEntity>('/api/endpoint').pipe(
  map(entity => {
    entity.createdAt = toDate(entity.createdAt) as any;
    entity.updatedAt = toDate(entity.updatedAt) as any;
    // ... weitere Date-Felder
    return entity;
  })
)

// ODER in der Komponente:
this.myService.getData().subscribe(data => {
  data.createdAt = toDate(data.createdAt) as any;
  data.updatedAt = toDate(data.updatedAt) as any;
  this.myData = data;
});
```

### ✅ Schritt 3: Im Template nutzen
```html
{{ myData.createdAt | date:'dd.MM.yyyy HH:mm' }}
{{ myData.updatedAt | date:'short' }}
```

## 🎯 Typische Backend-Felder die konvertiert werden müssen

- `createdAt`
- `updatedAt`
- `startDate`
- `endDate`
- `renewalDate`
- `expiresAt`
- `verifiedAt`
- Alle anderen Felder vom Typ `LocalDateTime`

## ⚠️ Wichtig

**Backend liefert LocalDateTime als:**
```json
[2026, 3, 4, 15, 24, 36, 787418000]
```
**Format:** `[Jahr, Monat(1-12), Tag, Stunde, Minute, Sekunde, Nanosekunden]`

**Frontend benötigt:**
```javascript
Date Object
// z.B. Mon Mar 04 2026 15:24:36 GMT+0100
```

**Die `toDate()` Funktion macht die Konvertierung automatisch!** ✅

## 🐛 Fehler-Symptom

Wenn du **NG02100** Fehler siehst:
```
ERROR NG02100: InvalidPipeArgument: 'Unable to convert "[2026,3,4,15,24,36,787418000]" into a date' for pipe 'DatePipe'
```

**Lösung:** `toDate()` Funktion auf das Feld anwenden!

## 📊 Status

| Komponente | Date-Konvertierung | Status |
|-----------|-------------------|--------|
| subscription.service.ts | ✅ | Implementiert |
| subscription.component.ts | ✅ | Implementiert |
| dashboard.component.ts | ✅ | Custom Formatter |
| store-detail.component.ts | ⏳ | Noch nicht geprüft |
| order.component.ts | ⏳ | Noch nicht geprüft |
| ... | ⏳ | Bei Bedarf hinzufügen |

## 🚀 Best Practice

**Immer im Service konvertieren, nicht in der Komponente!**

```typescript
// ✅ GOOD: Im Service
getMyData(): Observable<MyEntity> {
  return this.http.get<MyEntity>('/api/data').pipe(
    map(entity => {
      entity.createdAt = toDate(entity.createdAt) as any;
      return entity;
    })
  );
}

// ❌ BAD: In jeder Komponente einzeln
// Dann musst du es überall machen wo du die Daten nutzt!
```

## 📝 Notizen

- ✅ H2 (lokal) und PostgreSQL (prod) liefern beide LocalDateTime als Array
- ✅ `toDate()` ist null-safe
- ✅ Funktioniert mit UTC-Zeiten
- ✅ Keine Dependencies außer nativen JS Date

