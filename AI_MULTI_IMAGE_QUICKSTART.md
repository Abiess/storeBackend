# 🚀 Multi-Image AI - Quick Start Guide

**Feature:** Mehrere Bilder hochladen → AI generiert für alle → Speichern

---

## Wie funktioniert es?

### 1. Bilder hochladen
```
Tab "KI-Assistent" → "Bilder auswählen" → Mehrere Dateien auswählen
```

### 2. AI generieren
```
"KI-Analyse für alle X Bild(er) starten" → Warten auf Generierung
```

### 3. Vorschlag auswählen
```
Jedes Bild zeigt AI-Vorschlag → Klick auf "Auswählen" bei bestem Vorschlag
```

### 4. Übernehmen
```
"In Formular übernehmen (inkl. X Bild(er))" → Daten + ALLE Bilder werden übertragen
```

### 5. Speichern
```
"Produkt erstellen" → Alle Bilder werden hochgeladen und verknüpft
```

---

## Was passiert im Hintergrund?

```typescript
// 1. Bilder werden als aiImages[] gespeichert
aiImages = [
  { file: File1, preview: "data:...", suggestion: null },
  { file: File2, preview: "data:...", suggestion: null },
  { file: File3, preview: "data:...", suggestion: null }
]

// 2. AI generiert für jedes Bild (parallel)
aiImages.forEach(img => generateAiSuggestionForImage(img))

// 3. Suggestions werden gespeichert
aiImages[0].suggestion = { title: "...", description: "...", ... }
aiImages[1].suggestion = { title: "...", description: "...", ... }
aiImages[2].suggestion = { title: "...", description: "...", ... }

// 4. User wählt Index 1 aus
selectedSuggestionIndex = 1

// 5. Übernehmen: Daten + Files → uploadedImages[]
productForm.patchValue(aiImages[1].suggestion)
uploadedImages.push({ _file: File1, preview: "..." })
uploadedImages.push({ _file: File2, preview: "..." })
uploadedImages.push({ _file: File3, preview: "..." })

// 6. Speichern: Files hochladen → Bilder verknüpfen
uploadNewImagesAndLink() → uploadImage(File1) → mediaId: 101
                       → uploadImage(File2) → mediaId: 102
                       → uploadImage(File3) → mediaId: 103
linkExistingImages() → addMediaToProduct(101)
                    → addMediaToProduct(102)
                    → addMediaToProduct(103)
```

---

## Sprach-Support

Die AI generiert automatisch in der aktiven Sprache:

```
Cookie: preferred_lang=de → AI antwortet auf Deutsch
Cookie: preferred_lang=en → AI responds in English
Cookie: preferred_lang=ar → الذكاء الاصطناعي يستجيب بالعربية
```

Keine manuelle Konfiguration nötig!

---

## Beispiel-Workflow

### Szenario: T-Shirt in 3 Farben

1. **Upload**: 3 Bilder (rot.jpg, blau.jpg, grün.jpg)
2. **AI generiert**:
   - Bild 1: "Rotes Casual T-Shirt" (de)
   - Bild 2: "Blaues Casual T-Shirt" (de)
   - Bild 3: "Grünes Casual T-Shirt" (de)
3. **Auswählen**: Bild 2 (blau) hat beste Beschreibung
4. **Übernehmen**: Titel "Blaues Casual T-Shirt" + alle 3 Bilder
5. **Anpassen**: Titel ändern zu "Casual T-Shirt" (generisch)
6. **Speichern**: Produkt mit 3 Farbvarianten gespeichert

---

## Wichtige Hinweise

✅ **Alle Bilder werden gespeichert**, nicht nur das ausgewählte  
✅ **Erstes Bild ist Primary** (Hauptbild in Produktliste)  
✅ **Sprache wird automatisch erkannt** (Cookie/Accept-Language)  
✅ **Fehler bei einem Bild** stoppt nicht die anderen  
✅ **Größenlimit: 10MB** pro Bild  

---

## Troubleshooting

### Problem: AI generiert nicht

**Ursache**: Bild zu groß oder ungültiges Format  
**Lösung**: Maximal 10MB, nur JPG/PNG/WebP

### Problem: Bilder werden nicht gespeichert

**Ursache**: Upload-Fehler während Speicherung  
**Lösung**: Prüfe Browser-Console auf Fehler, versuche erneut

### Problem: Falsche Sprache

**Ursache**: Cookie nicht gesetzt  
**Lösung**: Wähle Sprache im UI-Switcher, dann erneut generieren

---

## Code-Referenz

### Multi-Image Upload

```html
<input 
  type="file" 
  accept="image/*"
  multiple
  (change)="onAiImagesSelect($event)"
/>
```

### AI Generation

```typescript
generateAiSuggestionsForAll(): void {
  this.aiImages.forEach((imgData, index) => {
    this.generateAiSuggestionForImage(index);
  });
}
```

### Übernehmen

```typescript
useSelectedAiSuggestion(): void {
  const suggestion = this.aiImages[selectedIndex].suggestion;
  
  this.productForm.patchValue({
    title: suggestion.title,
    description: suggestion.description,
    basePrice: suggestion.suggestedPrice
  });

  this.aiImages.forEach(img => {
    this.uploadedImages.push({
      mediaId: 0,
      _file: img.file,  // Für späteren Upload
      isPrimary: idx === 0
    });
  });
}
```

---

**Fertig!** 🎉

Das Multi-Image AI Feature ist einsatzbereit.

