# 🧙‍♂️ Store Creation Wizard - Progress Persistence Feature

> **Status**: ✅ Frontend komplett | ⏳ Backend-Implementation ausstehend

## 📖 Übersicht

Dieses Feature ermöglicht es Benutzern, den Store-Creation-Wizard zu verlassen und später **genau dort fortzufahren**, wo sie aufgehört haben. Der Fortschritt wird in der Datenbank gespeichert und bei erneutem Besuch wiederhergestellt.

## ✨ Hauptfunktionen

- ✅ **Auto-Save**: Automatisches Speichern bei jedem Schritt
- ✅ **Progress Restore**: Wiederherstellen des Fortschritts beim nächsten Besuch
- ✅ **Multi-Step Support**: Unterstützung für alle 5 Wizard-Schritte
- ✅ **Multilingual**: Deutsch, Englisch und Arabisch
- ✅ **Graceful Degradation**: Funktioniert auch ohne Backend
- ✅ **Store Linking**: Verknüpfung mit erstelltem Store

## 📁 Dateistruktur

```
storeBackend/
├── storeFrontend/
│   └── src/
│       ├── app/core/services/
│       │   └── wizard-progress.service.ts          ⭐ Haupt-Service
│       └── assets/i18n/
│           ├── de.json                             ✅ Deutsche Übersetzungen
│           ├── en.json                             ✅ Englische Übersetzungen
│           └── ar.json                             ✅ Arabische Übersetzungen
│
├── WIZARD_PROGRESS_IMPLEMENTATION.md               📚 Ausführliche Doku
├── WIZARD_PROGRESS_BACKEND_GUIDE.md                🔧 Backend-Integration Guide
└── WIZARD_PROGRESS_BACKEND_EXAMPLE.java            📝 Entity-Beispiel
```

## 🚀 Quick Start

### Frontend (bereits implementiert ✅)

```typescript
// Service injizieren
constructor(private wizardProgressService: WizardProgressService) {}

// Fortschritt laden
this.wizardProgressService.loadProgress().subscribe(progress => {
  if (progress) {
    this.restoreWizardState(progress);
  }
});

// Fortschritt speichern
const progress: WizardProgress = {
  currentStep: 2,
  status: 'IN_PROGRESS',
  data: { storeName: 'My Shop', storeSlug: 'my-shop' },
  completedSteps: [1]
};
this.wizardProgressService.saveProgress(progress).subscribe();

// Wizard abschließen
this.wizardProgressService.completeWizard(storeId).subscribe();
```

### Backend (noch zu implementieren ⏳)

Folge der Anleitung in **WIZARD_PROGRESS_BACKEND_GUIDE.md**:

1. ✅ Entity erstellen (siehe WIZARD_PROGRESS_BACKEND_EXAMPLE.java)
2. ✅ Repository implementieren
3. ✅ Service implementieren
4. ✅ REST Controller hinzufügen
5. ✅ Database Migration durchführen

**Geschätzte Zeit**: 2-3 Stunden

## 📊 API Endpoints

Die folgenden Endpunkte müssen im Backend implementiert werden:

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| `GET` | `/api/wizard-progress` | Lade gespeicherten Fortschritt |
| `POST` | `/api/wizard-progress` | Speichere/Update Fortschritt |
| `POST` | `/api/wizard-progress/skip` | Wizard überspringen |
| `POST` | `/api/wizard-progress/complete?storeId=X` | Wizard abschließen |
| `DELETE` | `/api/wizard-progress` | Fortschritt löschen |
| `GET` | `/api/wizard-progress/has-active` | Prüfe ob aktiver Fortschritt existiert |

## 🌐 Übersetzungen

Alle UI-Texte sind in **3 Sprachen** verfügbar:

| Key | Deutsch | English | العربية |
|-----|---------|---------|---------|
| `wizard.createStore` | Store erstellen | Create Store | إنشاء متجر |
| `wizard.step1Title` | Basis-Info | Basic Info | المعلومات الأساسية |
| `wizard.next` | Weiter | Next | التالي |
| `aiGenerator.analyzing` | Analysiere | Analyzing | جاري التحليل |

**Vollständige Übersetzungen** in allen i18n-Dateien verfügbar.

## 🔧 Technische Details

### TypeScript Interfaces

```typescript
interface WizardProgress {
  id?: number;
  userId?: number;
  currentStep: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  data?: WizardProgressData;
  completedSteps: number[];
  lastUpdated?: string;
  storeCreated?: boolean;
  createdStoreId?: number;
}

interface WizardProgressData {
  storeName?: string;
  storeSlug?: string;
  description?: string;
  selectedCategories?: string[];
  contactInfo?: { email?, phone?, address?, city?, postalCode? };
}
```

### Database Schema

```sql
CREATE TABLE wizard_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    current_step INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    data JSONB,
    completed_steps JSONB,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    store_created BOOLEAN DEFAULT FALSE,
    created_store_id BIGINT REFERENCES stores(id)
);
```

## 🎯 User Flow

```
1. User startet Wizard
   ↓
2. Füllt Formular in Schritt 1 aus
   ↓
3. Klickt "Weiter" → Auto-Save in DB
   ↓
4. Verlässt Seite
   ↓
5. Kommt später zurück
   ↓
6. Fortschritt wird geladen
   ↓
7. User ist automatisch bei Schritt 2
```

## 🛡️ Error Handling

Der Service implementiert **Graceful Degradation**:

```typescript
.pipe(
  catchError(err => {
    console.warn('⚠️ Could not save progress:', err.status);
    // Wizard funktioniert weiterhin, nur ohne Persistierung
    return of(null);
  })
)
```

→ **Keine Fehlermeldung für User, wenn Backend nicht verfügbar ist**

## 📈 Monitoring Empfehlungen

Tracke folgende Metriken:

- **Wizard Start Rate**: Wie viele User starten den Wizard?
- **Completion Rate**: Wie viele schließen ihn ab?
- **Drop-off Rate**: Wo brechen User ab?
- **Restoration Rate**: Wie oft wird Fortschritt wiederhergestellt?
- **Average Time per Step**: Durchschnittliche Zeit pro Schritt

## 🧪 Testing

### Frontend Unit-Tests

```typescript
describe('WizardProgressService', () => {
  it('should save progress', (done) => {
    const progress: WizardProgress = { currentStep: 2, status: 'IN_PROGRESS' };
    service.saveProgress(progress).subscribe(result => {
      expect(result).toBeTruthy();
      done();
    });
  });
});
```

### Backend Integration-Tests

```java
@Test
void shouldSaveAndLoadProgress() {
    WizardProgress progress = new WizardProgress();
    progress.setCurrentStep(2);
    WizardProgress saved = service.saveProgress(user, progress);
    assertThat(saved.getId()).isNotNull();
}
```

## 📚 Weitere Dokumentation

- **[WIZARD_PROGRESS_IMPLEMENTATION.md](./WIZARD_PROGRESS_IMPLEMENTATION.md)** - Ausführliche Feature-Dokumentation
- **[WIZARD_PROGRESS_BACKEND_GUIDE.md](./WIZARD_PROGRESS_BACKEND_GUIDE.md)** - Schritt-für-Schritt Backend-Guide
- **[WIZARD_PROGRESS_BACKEND_EXAMPLE.java](./WIZARD_PROGRESS_BACKEND_EXAMPLE.java)** - Entity-Code-Beispiel

## ❓ FAQ

**Q: Was passiert, wenn das Backend nicht erreichbar ist?**  
A: Der Wizard funktioniert normal weiter, nur ohne Persistierung. Es gibt keine Fehlermeldung für den User.

**Q: Kann ein User mehrere Fortschritte haben?**  
A: Nein, es gibt eine UNIQUE-Constraint: Pro User nur ein IN_PROGRESS Status.

**Q: Was passiert beim Logout?**  
A: Der Service sollte `reset()` aufrufen, um das Subject zu leeren.

**Q: Werden Bilder auch gespeichert?**  
A: Nein, nur die Metadaten. Bilder werden separat im FileStorage gespeichert.

## 🤝 Beitragen

Bei Fragen oder Problemen:

1. Prüfe die Dokumentation in `WIZARD_PROGRESS_*.md`
2. Schaue in die Code-Kommentare im Service
3. Erstelle ein Issue mit detaillierter Beschreibung

## 📝 Changelog

### Version 1.0.0 (2026-04-02)
- ✅ Initial Frontend-Implementation
- ✅ TypeScript Service mit vollem Feature-Set
- ✅ Mehrsprachige Übersetzungen (DE, EN, AR)
- ✅ Ausführliche Dokumentation
- ✅ Backend-Integration Guide
- ✅ JSON-Validierung (alle Dateien fehlerfrei)

---

**Erstellt am**: 2026-04-02  
**Status**: Frontend ✅ | Backend ⏳  
**Priorität**: Medium  
**Geschätzter Aufwand Backend**: 2-3 Stunden

