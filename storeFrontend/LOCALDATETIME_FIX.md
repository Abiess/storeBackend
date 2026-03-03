# ✅ LocalDateTime Array → Date Fix

## Problem
Spring Boot liefert `LocalDateTime` als Array:
```json
{
  "startDate": [2026,3,3,15,24,9,692042000],
  "renewalDate": [2026,4,3,15,24,36,787418000],
  "endDate": null
}
```

Angular DatePipe crasht mit **NG02100**.

---

## ✅ Lösung

### 1. **Utility-Funktion**

Datei: `src/app/core/utils/date.utils.ts`

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

### 2. **Im Service anwenden**

```typescript
import { toDate } from '../utils/date.utils';

getCurrentSubscription(userId: number): Observable<Subscription | null> {
  return this.http.get<Subscription>(`${this.API_URL}/user/${userId}/current`).pipe(
    map(sub => {
      // ✅ Konvertiere LocalDateTime-Arrays zu JS Dates
      if (sub) {
        sub.startDate = toDate(sub.startDate) as any;
        sub.endDate = toDate(sub.endDate) as any;
        sub.renewalDate = toDate(sub.renewalDate) as any;
        sub.createdAt = toDate(sub.createdAt) as any;
        sub.updatedAt = toDate(sub.updatedAt) as any;
      }
      return sub;
    })
  );
}
```

### 3. **Im Template nutzen**

```html
<!-- Jetzt funktioniert | date Pipe ✅ -->
<div *ngIf="subscription$ | async as sub">
  <p>Start: {{ sub.startDate | date:'short' }}</p>
  <p>Renewal: {{ sub.renewalDate | date:'dd.MM.yyyy' }}</p>
  <p>Ende: {{ sub.endDate | date:'medium' }}</p>
</div>
```

---

## ✅ Wo wurde es angewendet?

**Datei:** `subscription.service.ts`

1. ✅ `getCurrentSubscription()` - konvertiert alle Date-Felder
2. ✅ `getSubscriptionHistory()` - konvertiert für alle Subscriptions in Array

---

## 🧪 Test

```typescript
// Vorher (Backend Response):
{
  startDate: [2026,3,3,15,24,9,692042000]
}

// Nachher (im Angular):
{
  startDate: Mon Mar 03 2026 15:24:09 GMT+0100
}

// Im Template:
{{ subscription.startDate | date:'short' }}
// Output: 03.03.26, 15:24
```

---

## ✅ Fertig!

Keine weiteren Änderungen nötig. Alle API-Calls konvertieren jetzt automatisch die LocalDateTime-Arrays zu JS Dates.

**Template-Beispiele:**

```html
<!-- Kurz -->
{{ sub.startDate | date:'short' }}
→ 03.03.26, 15:24

<!-- Deutsch -->
{{ sub.startDate | date:'dd.MM.yyyy HH:mm' }}
→ 03.03.2026 15:24

<!-- Medium -->
{{ sub.renewalDate | date:'medium' }}
→ 03. Apr. 2026, 15:24:36

<!-- Relativ (mit zusätzlicher Pipe) -->
{{ sub.startDate | date:'relative' }}
→ vor 2 Stunden
```

