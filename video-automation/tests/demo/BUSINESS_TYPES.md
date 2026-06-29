# Business Type Categories Reference

## ⚠️ WICHTIG: Keine Breaking Changes!

Diese Datei dokumentiert die **aktuellen Kategorienamen** im Frontend-Code.  
**Diese Namen NICHT ändern** ohne vorher die Tests zu updaten!

---

## 📋 Aktuelle Kategorien (WITH LUCIDE ICONS!)

**Quelle:** `storeFrontend/src/app/features/stores/create-store-public.component.ts` (Zeile 537-542)

**WICHTIG:** Emojis wurden durch **Lucide Icons** ersetzt!

```typescript
categories = [
  { id: 'fashion',     icon: 'Shirt',      name: this.translate.instant('createStorePublic.categories.fashion') },
  { id: 'electronics', icon: 'Smartphone', name: this.translate.instant('createStorePublic.categories.electronics') },
  { id: 'food',        icon: 'Pizza',      name: this.translate.instant('createStorePublic.categories.food') },
  { id: 'beauty',      icon: 'Sparkles',   name: this.translate.instant('createStorePublic.categories.beauty') },
  { id: 'home',        icon: 'Home',       name: this.translate.instant('createStorePublic.categories.home') },
  { id: 'other',       icon: 'Package',    name: this.translate.instant('createStorePublic.categories.other') }
];
```

---

## 🎯 Test-Selektoren (NEU: Lucide Icons!)

**Playwright-Tests müssen NEUE Selektoren verwenden (keine Emojis mehr!):**

```javascript
// ✅ RICHTIG (Strategie 1: Text-basiert, robustest):
page.getByRole('button', { name: /lebensmittel/i })

// ✅ RICHTIG (Strategie 2: Via Lucide Icon):
page.locator('button:has(lucide-icon[name="Pizza"])')

// ✅ RICHTIG (Strategie 3: Position):
page.locator('.sc-cat-btn').nth(2)

// ❌ FALSCH (funktioniert NICHT mehr):
page.locator('button:has-text("🍕")')          // Emojis gibt es nicht mehr! ❌
page.getByRole('button', { name: /🍕/i })      // Emoji-Selector funktioniert nicht ❌
```

---

## 📊 Mapping: ID → Lucide Icon → Name

| Category ID   | Lucide Icon | Name (Deutsch) | Playwright Selector |
|---------------|-------------|----------------|---------------------|
| `fashion`     | `Shirt`     | Mode           | `button:has(lucide-icon[name="Shirt"])` oder `button:has-text("Mode")` |
| `electronics` | `Smartphone`| Elektronik     | `button:has(lucide-icon[name="Smartphone"])` oder `button:has-text("Elektronik")` |
| `food`        | `Pizza`     | Lebensmittel   | `button:has(lucide-icon[name="Pizza"])` oder `button:has-text("Lebensmittel")` |
| `beauty`      | `Sparkles`  | Beauty         | `button:has(lucide-icon[name="Sparkles"])` oder `button:has-text("Beauty")` |
| `home`        | `Home`      | Heim           | `button:has(lucide-icon[name="Home"])` oder `button:has-text("Heim")` |
| `other`       | `Package`   | Sonstiges      | `button:has(lucide-icon[name="Package"])` oder `button:has-text("Sonstiges")` |

---

## 🔄 Wenn Namen geändert werden:

1. **Frontend ändern:**
   - `create-store-public.component.ts` (Zeile 537-542)

2. **Tests updaten:**
   - `boutique-sans-inscription.spec.js` (Zeile ~157-178)
   - `quick-start-demo.spec.js` (falls vorhanden)
   - `marktma-platform-demo.spec.js` (falls vorhanden)

3. **Diese Datei updaten:**
   - `video-automation/tests/demo/BUSINESS_TYPES.md`

---

## 🌐 Internationalisierung (i18n)

**Geplant aber noch NICHT implementiert:**

Wenn die Namen später in i18n-Keys geändert werden, müssen die Tests angepasst werden:

```typescript
// ZUKÜNFTIG (i18n):
{ id: 'fashion', icon: '👗', name: this.translate('categories.fashion') }

// Dann müssen Tests flexible Selektoren verwenden:
page.locator('button:has-text("👗")') // Icon ist stabil! ✅
```

**Empfehlung:** Verwende in Tests **primär Emojis** als Selektoren, da diese sprachunabhängig sind!

---

## ✅ Best Practice für Tests:

```javascript
// 3-stufige Fallback-Strategie:

// 1. Icon + Text (robusteste Methode)
let button = page.getByRole('button', { name: /🍕.*lebensmittel/i });

// 2. Nur Icon (sprachunabhängig!)
if (!await button.isVisible({ timeout: 2000 })) {
  button = page.locator('button:has-text("🍕")');
}

// 3. Nur Text (als letzter Fallback)
if (!await button.isVisible({ timeout: 2000 })) {
  button = page.locator('button:has-text("Lebensmittel")');
}

await button.click();
```

---

**Letzte Aktualisierung:** 2026-06-28  
**Erstellt von:** Demo Video Implementation Task
