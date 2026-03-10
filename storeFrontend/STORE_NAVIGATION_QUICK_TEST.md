# 🧪 Store-Navigation Quick Test Guide

## ⚡ SCHNELLTEST (5 Minuten)

### 1️⃣ Desktop Test (Chrome)

```bash
1. ng serve
2. http://localhost:4200/dashboard/stores/1
3. Fenster auf 1400px Breite
```

**Prüfen:**
- [ ] Alle 8 Tabs sichtbar mit Text
- [ ] "Homepage" statt "navigation.homepage"
- [ ] Fenster kleiner ziehen → Tabs wrappen
- [ ] KEINE Scrollbar

---

### 2️⃣ Mobile Test (Chrome DevTools)

```bash
1. F12 → Device Toolbar
2. iPhone SE (375px)
```

**Prüfen:**
- [ ] Nur Icons sichtbar (keine Labels)
- [ ] Icons groß genug (1.25rem)
- [ ] Tabs in 2 Reihen
- [ ] Badge auf 📞 sichtbar
- [ ] Keine Scrollbar

---

### 3️⃣ Tablet Test (iPad)

```bash
1. F12 → iPad (768px)
```

**Prüfen:**
- [ ] Labels + Icons sichtbar
- [ ] Tabs wrappen in 2-3 Reihen
- [ ] Gut klickbar
- [ ] Keine Scrollbar

---

### 4️⃣ Übersetzung Test

```bash
1. Sprache auf Deutsch
2. Gehe zu Homepage-Tab
```

**Erwartung:**
- ✅ "Homepage" (nicht "navigation.homepage")

---

### 5️⃣ Active State Test

```bash
1. Klicke auf "Kategorien"
2. Prüfe blauer Border-Bottom
3. Klicke auf "Produkte"
4. Prüfe State-Wechsel
```

---

## ✅ ERFOLG?

**Alle Punkte erfüllt?**
→ Navigation ist fixed! 🎉

**Problem gefunden?**
→ Siehe `STORE_NAVIGATION_IMPROVED.md` für Details

---

**Zeit:** ~5 Minuten  
**Geräte:** Desktop + Mobile  
**Browser:** Chrome (empfohlen)

