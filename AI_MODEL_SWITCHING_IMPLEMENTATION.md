# 🤖 AI Model Switching Implementation - Complete

**Datum:** 2026-04-02  
**Status:** ✅ VOLLSTÄNDIG IMPLEMENTIERT  
**Feature:** Multi-Model AI Support mit UI-Auswahl

---

## 📋 Übersicht

Das bestehende AI-System wurde erweitert um **mehrere AI-Modelle** zu unterstützen, ohne die bestehende Funktionalität zu beeinträchtigen.

### ✅ Implementierte Features

1. ✅ **Backend: AI Model Provider Service** (neu)
2. ✅ **Backend: AiImageCaptioningService erweitert** (model parameter)
3. ✅ **Backend: ProductController erweitert** (model parameter)
4. ✅ **Frontend: ProductService erweitert** (model parameter)
5. ✅ **Frontend: UI Combobox für Model-Auswahl**

---

## 🏗️ Architektur

### Backend-Architektur

```
┌─────────────────────────────────┐
│   ProductController              │
│   - ai-suggest (model param)     │
│   - ai-suggest-v2 (model param)  │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  AiImageCaptioningService        │
│  - generateProductSuggestion()   │
│  - generateProductSuggestionV2() │
│    (beide mit optional modelName)│
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│     AiModelProvider (NEU)        │
│  - callModel()                   │
│  - getAvailableModels()          │
│  - getDefaultModel()             │
└────────────┬────────────────────┘
             │
      ┌──────┴──────┐
      ▼             ▼
 ┌────────┐    ┌────────┐
 │ GLM-4.5V│    │  BLIP  │
 │(bestehend)│    │(neu)   │
 └────────┘    └────────┘
```

### Frontend-Architektur

```
┌─────────────────────────────────┐
│  product-form.component.ts       │
│  - selectedAiModel               │
│  - availableAiModels             │
│  - Model Combobox in UI          │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│      ProductService              │
│  - generateAiSuggestionV2()      │
│    (mit optional modelName)      │
│  - getAvailableAiModels()        │
│  - getDefaultAiModel()           │
└────────────┬────────────────────┘
             │
             ▼
      Backend API
```

---

## 📁 Geänderte/Neue Dateien

### 🆕 Neu erstellt

#### 1. Backend: `AiModelProvider.java`
**Pfad:** `src/main/java/storebackend/service/AiModelProvider.java`

**Zweck:** Zentraler Service für AI-Modell-Switching

**Hauptfunktionen:**
```java
- callModel(modelName, imageUrl, imageBytes, language, isV2)
- callGLMModel() // Bestehendes Modell
- callBLIPModel() // Neues kostenloses Modell
- getAvailableModels()
- getDefaultModel()
```

**Verfügbare Modelle:**
- `MODEL_GLM_4_5V` = "zai-org/GLM-4.5V" (Router API, bestehend)
- `MODEL_BLIP` = "Salesforce/blip-image-captioning-large" (Inference API, neu)

---

### ✏️ Erweitert (bestehende Funktionalität bleibt erhalten)

#### 2. Backend: `AiImageCaptioningService.java`

**Geändert:**
- ✅ Constructor: Injiziert `AiModelProvider`
- ✅ `generateProductSuggestion()` - Überladene Methode mit `modelName` Parameter
- ✅ `generateProductSuggestionV2()` - Überladene Methode mit `modelName` Parameter
- ✅ Neue Helper-Methode: `convertCaptionToJson()` für BLIP-Modell

**Backward Compatibility:**
```java
// ALT: Bestehende Signatur bleibt erhalten
public AiProductSuggestionDTO generateProductSuggestion(MultipartFile imageFile, String language)

// NEU: Zusätzliche Überladung
public AiProductSuggestionDTO generateProductSuggestion(MultipartFile imageFile, String language, String modelName)
```

#### 3. Backend: `ProductController.java`

**Geändert:**
- ✅ `generateAiProductSuggestion()` - Neuer `@RequestParam model` (optional)
- ✅ `generateAiSuggestionV2()` - Neuer `@RequestParam model` (optional)

**Backward Compatibility:**
```java
// Parameter ist OPTIONAL - bestehende Clients funktionieren weiterhin
@RequestParam(value = "model", required = false) String modelName
```

#### 4. Frontend: `product.service.ts`

**Geändert:**
- ✅ `generateAiProductSuggestion()` - Optional `modelName` Parameter
- ✅ `generateAiProductSuggestionV2()` - Optional `modelName` Parameter
- ✅ Neue Methode: `getAvailableAiModels()`
- ✅ Neue Methode: `getDefaultAiModel()`

**Backward Compatibility:**
```typescript
// Parameter ist optional - bestehender Code funktioniert
generateAiProductSuggestionV2(storeId: number, imageFile: File, modelName?: string)
```

#### 5. Frontend: `product-form.component.ts`

**Geändert:**
- ✅ Neue Properties: `selectedAiModel`, `availableAiModels`
- ✅ Neue Methode: `loadAiModels()`
- ✅ Neue Methode: `getModelDisplayName()`
- ✅ UI Template: Model-Auswahl Combobox hinzugefügt
- ✅ `generateAiSuggestionForImage()` - Übergibt `selectedAiModel`

**UI Komponente:**
```html
<div class="ai-model-selection">
  <label for="aiModelSelect">🤖 KI-Modell:</label>
  <select [(ngModel)]="selectedAiModel" class="model-select">
    <option *ngFor="let model of availableAiModels" [value]="model.value">
      {{ model.label }}
    </option>
  </select>
  <span class="model-info">
    ℹ️ {{ selectedAiModel === 'zai-org/GLM-4.5V' ? 'Premium Modell (Standard)' : 'Kostenloses Modell' }}
  </span>
</div>
```

---

## 🎯 Verfügbare Modelle

| Modell | Typ | API | Kosten | Beschreibung |
|--------|-----|-----|--------|--------------|
| **GLM-4.5V** | Vision | Router API | API-Key | Bestehendes Modell (Default) |
| **BLIP** | Image Captioning | Inference API | Kostenlos | Neues Salesforce-Modell |

---

## 🔄 User Flow

### 1. Frontend: Model auswählen

```
User → Product Form → AI Tab → Model Dropdown auswählen
                                      ↓
                              z.B. "BLIP (Kostenlos)"
```

### 2. Frontend: AI generieren

```
User klickt "KI-Analyse für alle"
        ↓
generateAiSuggestionForImage(index)
        ↓
productService.generateAiProductSuggestionV2(storeId, file, selectedAiModel)
        ↓
HTTP POST /api/stores/:id/products/ai-suggest-v2?model=Salesforce/blip-image-captioning-large
```

### 3. Backend: Request Processing

```
ProductController.generateAiSuggestionV2()
        ↓
aiImageCaptioningService.generateProductSuggestionV2(file, language, modelName)
        ↓
aiModelProvider.callModel(modelName, ...)
        ↓
  ┌─────────┴──────────┐
  ▼                    ▼
callGLMModel()   callBLIPModel()
  (Router API)    (Inference API)
```

### 4. Response zurück zum Frontend

```
Backend → JSON Response → Frontend
                            ↓
                   UI zeigt Suggestion
```

---

## ⚙️ Konfiguration

### Backend (application.properties)

```properties
# Bestehende Konfiguration bleibt unverändert
huggingface.api.key=${HUGGINGFACE_API_KEY}
```

### Frontend (ProductService)

```typescript
// Verfügbare Modelle
getAvailableAiModels(): string[] {
  return [
    'zai-org/GLM-4.5V',  // Bestehendes Modell (Default)
    'Salesforce/blip-image-captioning-large'  // Neues kostenloses Modell
  ];
}

// Default-Modell
getDefaultAiModel(): string {
  return 'zai-org/GLM-4.5V';
}
```

---

## 🧪 Testing

### Backend Unit Test Beispiel

```java
@Test
void shouldSwitchBetweenModels() {
    // Test GLM-4.5V (bestehend)
    String glmResult = aiModelProvider.callModel(
        AiModelProvider.MODEL_GLM_4_5V, 
        imageUrl, 
        null, 
        "en", 
        false
    );
    assertNotNull(glmResult);
    
    // Test BLIP (neu)
    String blipResult = aiModelProvider.callModel(
        AiModelProvider.MODEL_BLIP, 
        null, 
        imageBytes, 
        "en", 
        false
    );
    assertNotNull(blipResult);
}
```

### Frontend Unit Test Beispiel

```typescript
it('should pass selected model to service', () => {
  component.selectedAiModel = 'Salesforce/blip-image-captioning-large';
  component.generateAiSuggestionForImage(0);
  
  expect(productService.generateAiProductSuggestionV2)
    .toHaveBeenCalledWith(
      storeId,
      jasmine.any(File),
      'Salesforce/blip-image-captioning-large'
    );
});
```

### Manueller Test

1. ✅ Öffne Product Form
2. ✅ Navigiere zum "KI-Assistent" Tab
3. ✅ Lade ein Produktbild hoch
4. ✅ Wähle "BLIP (Kostenlos)" im Dropdown
5. ✅ Klicke "KI-Analyse für alle"
6. ✅ Prüfe DevTools: Request enthält `?model=Salesforce/blip-image-captioning-large`
7. ✅ Suggestion wird generiert und angezeigt

---

## 🚀 Deployment

### Build Backend

```bash
cd storeBackend
mvn clean install
```

### Build Frontend

```bash
cd storeFrontend
npm run build
```

### Start Application

```bash
# Backend
java -jar target/storebackend.jar

# Frontend (Development)
npm start
```

---

## 📊 Unterschiede zwischen Modellen

### GLM-4.5V (Premium)

**Vorteile:**
- ✅ Strukturiertes JSON mit allen Feldern
- ✅ Mehrsprachig (DE/EN/AR)
- ✅ SEO-Felder (title, meta description, slug)
- ✅ Tags und Kategorien

**Nachteile:**
- ❌ Benötigt API-Key
- ❌ Möglicherweise kostenpflichtig

### BLIP (Kostenlos)

**Vorteile:**
- ✅ Komplett kostenlos
- ✅ Schnelle Inference
- ✅ Gute Bilderkennung

**Nachteile:**
- ❌ Nur einfacher Text-Output
- ❌ Keine strukturierten Daten
- ❌ Nur Englisch

**Conversion:** BLIP-Output wird automatisch in JSON konvertiert:
```java
private String convertCaptionToJson(String caption, String language) {
    String title = generateTitle(caption);
    String description = generateDescription(caption);
    
    return String.format(
        "{\"title\": \"%s\", \"description\": \"%s\", \"category\": \"General\", \"tags\": [], \"suggestedPrice\": 0.0}",
        title.replace("\"", "\\\""),
        description.replace("\"", "\\\"")
    );
}
```

---

## 🔐 Sicherheit

### API-Key Protection

```java
@Value("${huggingface.api.key:}")
private String apiKey;

if (apiKey == null || apiKey.isBlank()) {
    throw new AiServiceException("API key is not configured");
}
```

### Model Validation

```java
// Fallback auf Default-Modell bei unbekanntem Model
default:
    log.warn("Unknown model: {}, falling back to GLM-4.5V", modelName);
    return callGLMModel(imageUrl, language, isV2);
```

---

## 🎨 UI Screenshots (Konzept)

### Model Selection Dropdown

```
┌────────────────────────────────────┐
│ 🤖 KI-Modell:                      │
├────────────────────────────────────┤
│ ▼ GLM-4.5V (Premium)              │ ← Ausgewählt
│   BLIP (Kostenlos)                 │
└────────────────────────────────────┘
│ ℹ️ Premium Modell (Standard)       │
└────────────────────────────────────┘
```

---

## 📈 Erweiterbarkeit

### Neues Modell hinzufügen (3 Schritte)

#### 1. Backend: AiModelProvider

```java
public static final String MODEL_NEUE_KI = "organization/model-name";

private String callNeueKiModel(String imageUrl, byte[] imageBytes) {
    // Implementation
}

// In callModel():
case MODEL_NEUE_KI:
    return callNeueKiModel(imageUrl, imageBytes);
```

#### 2. Frontend: ProductService

```typescript
getAvailableAiModels(): string[] {
  return [
    'zai-org/GLM-4.5V',
    'Salesforce/blip-image-captioning-large',
    'organization/model-name'  // NEU
  ];
}
```

#### 3. Frontend: product-form.component.ts

```typescript
private getModelDisplayName(modelName: string): string {
  const displayNames: {[key: string]: string} = {
    'zai-org/GLM-4.5V': 'GLM-4.5V (Premium)',
    'Salesforce/blip-image-captioning-large': 'BLIP (Kostenlos)',
    'organization/model-name': 'Neue KI (Beta)'  // NEU
  };
  return displayNames[modelName] || modelName;
}
```

**Das war's!** Das System erkennt automatisch das neue Modell.

---

## ✅ Erfolgskriterien

- [x] Bestehendes Modell (GLM-4.5V) funktioniert unverändert
- [x] Neues kostenloses Modell (BLIP) hinzugefügt
- [x] UI Combobox für Model-Auswahl
- [x] Backend nimmt `model` Parameter entgegen (optional)
- [x] Frontend sendet ausgewähltes Modell an Backend
- [x] Backward Compatibility gewährleistet
- [x] Code ist erweiterbar für weitere Modelle
- [x] Keine Breaking Changes

---

## 🎯 Zusammenfassung

### Was wurde erreicht

✅ **Multi-Model Support** ohne bestehende Funktionalität zu beeinträchtigen  
✅ **Kostenloses Modell** (BLIP) als Alternative integriert  
✅ **UI-Auswahl** via Combobox  
✅ **Zentrale Verwaltung** über AiModelProvider  
✅ **Erweiterbar** für beliebig viele weitere Modelle  
✅ **Backward Compatible** - bestehender Code funktioniert weiterhin  

### Dateien-Übersicht

| Datei | Typ | Änderung |
|-------|-----|----------|
| `AiModelProvider.java` | Backend | 🆕 NEU |
| `AiImageCaptioningService.java` | Backend | ✏️ ERWEITERT |
| `ProductController.java` | Backend | ✏️ ERWEITERT |
| `product.service.ts` | Frontend | ✏️ ERWEITERT |
| `product-form.component.ts` | Frontend | ✏️ ERWEITERT |

**Erstellt am:** 2026-04-02  
**Status:** ✅ Produktionsbereit  
**Breaking Changes:** Keine

