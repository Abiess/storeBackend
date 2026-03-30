# 💾 Wizard Progress - Persistence & State Management

## ✨ Feature-Übersicht

Der Store Creation Wizard speichert nun **automatisch** den Fortschritt in der Datenbank. User können den Wizard jederzeit verlassen und später **exakt an der gleichen Stelle** weitermachen.

## 🎯 Was wird gespeichert?

### Database Entity: `wizard_progress`

```sql
CREATE TABLE wizard_progress (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    current_step INTEGER NOT NULL DEFAULT 1,     -- Aktueller Schritt (1-4)
    status VARCHAR(20) NOT NULL,                 -- IN_PROGRESS, COMPLETED, SKIPPED
    wizard_data TEXT,                            -- JSON: alle Formulardaten
    completed_steps TEXT DEFAULT '[]',           -- JSON: [1,2] = Schritte 1&2 fertig
    last_updated TIMESTAMP,                      -- Letzter Save
    created_at TIMESTAMP,                        -- Erster Start
    store_created BOOLEAN DEFAULT FALSE,         -- Store wurde erstellt?
    created_store_id BIGINT                      -- Referenz zum Store
);
```

### Gespeicherte Daten (JSON)

```json
{
  "storeName": "Mein Super Shop",
  "storeSlug": "mein-super-shop",
  "description": "Tolle Produkte für alle",
  "selectedCategories": ["fashion", "electronics"],
  "contactInfo": {
    "email": "info@shop.de",
    "phone": "+49 123 456789",
    "address": "Hauptstraße 1",
    "city": "Berlin",
    "postalCode": "10115"
  }
}
```

## 🔄 Auto-Save Trigger

Der Fortschritt wird **automatisch gespeichert** bei:

### 1. **Schritt-Navigation**
```typescript
nextStep() {
  // ... Schritt wechseln
  this.saveCurrentProgress(); // ← Auto-Save
}

previousStep() {
  // ... Zurück
  this.saveCurrentProgress(); // ← Auto-Save
}
```

### 2. **Wizard überspringen**
```typescript
skip() {
  this.wizardProgressService.skipWizard() // ← Markiert als SKIPPED
    .subscribe(() => this.router.navigate(['/dashboard']));
}
```

### 3. **Store erfolgreich erstellt**
```typescript
createStore() {
  const store = await this.storeService.createStore(data);
  
  this.wizardProgressService.completeWizard(store.id) // ← Markiert als COMPLETED
    .subscribe();
}
```

## 📂 Auto-Load beim Start

Wenn der Wizard geöffnet wird:

```typescript
ngOnInit() {
  this.loadSavedProgress(); // ← Lade gespeicherten Fortschritt
}

private loadSavedProgress() {
  this.wizardProgressService.loadProgress().subscribe(progress => {
    if (progress && progress.status === 'IN_PROGRESS') {
      // Restore Schritt
      this.currentStep.set(progress.currentStep);
      
      // Restore abgeschlossene Schritte
      progress.completedSteps.forEach(step => {
        this.steps[step - 1].completed = true;
      });
      
      // Restore Formulardaten
      this.wizardForm.patchValue(progress.data);
      
      // Restore Kategorien
      this.selectedCategories.set(progress.data.selectedCategories);
    }
  });
}
```

## 🎬 User Flows mit Persistence

### Szenario 1: Unterbrechung & Fortsetzung

**Tag 1 - Abends:**
1. User startet Wizard
2. Füllt Schritt 1 aus: "Mein Shop", "mein-shop"
3. Geht zu Schritt 2
4. Wählt Kategorien: Mode, Elektronik
5. **Schließt Browser** 🚪

**Tag 2 - Morgens:**
1. User loggt sich ein
2. System prüft: Unvollständiger Wizard-Fortschritt
3. **Automatische Weiterleitung zu `/store-wizard`**
4. **Wizard öffnet direkt bei Schritt 2** ✅
5. Alle Daten sind da: Name, Slug, Kategorien
6. User macht weiter bei Schritt 3

### Szenario 2: Mehrmaliges Überspringen

**Versuch 1:**
1. Wizard erscheint
2. User klickt "Überspringen"
3. Status: `SKIPPED`
4. Dashboard wird angezeigt

**Versuch 2 (nächster Login):**
1. System prüft: Wizard-Status = SKIPPED
2. **KEIN Auto-Redirect zum Wizard**
3. Direkt zum Dashboard
4. User kann manuell über `/create-store` Wizard starten

### Szenario 3: Abschluss & Cleanup

**Store-Erstellung:**
1. User erstellt Store erfolgreich
2. Status: `COMPLETED`
3. `created_store_id`: 42
4. `store_created`: true

**Nächster Login:**
1. System prüft: Wizard COMPLETED
2. Store existiert bereits
3. **KEIN Wizard** → Direkt zum Dashboard
4. Fortschritt kann gelöscht werden (optional)

## 🔌 API Endpoints

### Backend (Spring Boot)

```java
// GET /api/wizard-progress
// Hole aktuellen Fortschritt
@GetMapping
public ResponseEntity<WizardProgressDTO> getProgress() { }

// POST /api/wizard-progress
// Speichere Fortschritt
@PostMapping
public ResponseEntity<WizardProgressDTO> saveProgress(@RequestBody WizardProgressDTO dto) { }

// POST /api/wizard-progress/skip
// Markiere als übersprungen
@PostMapping("/skip")
public ResponseEntity<Void> skipWizard() { }

// POST /api/wizard-progress/complete?storeId=42
// Markiere als abgeschlossen
@PostMapping("/complete")
public ResponseEntity<Void> completeWizard(@RequestParam Long storeId) { }

// DELETE /api/wizard-progress
// Lösche Fortschritt
@DeleteMapping
public ResponseEntity<Void> deleteProgress() { }

// GET /api/wizard-progress/has-active
// Prüfe ob aktiver Fortschritt vorhanden
@GetMapping("/has-active")
public ResponseEntity<Boolean> hasActiveProgress() { }
```

### Frontend (Angular Service)

```typescript
// Lade Fortschritt
wizardProgressService.loadProgress()
  .subscribe(progress => { /* ... */ });

// Speichere Fortschritt
wizardProgressService.saveProgress({
  currentStep: 2,
  status: 'IN_PROGRESS',
  data: { storeName: 'Shop', ... },
  completedSteps: [1]
});

// Skip
wizardProgressService.skipWizard()
  .subscribe(() => router.navigate(['/dashboard']));

// Complete
wizardProgressService.completeWizard(storeId)
  .subscribe(() => console.log('Wizard done!'));
```

## 🗄️ Datenbank-Schema

### Status-Werte

| Status | Bedeutung | Verhalten bei Login |
|--------|-----------|---------------------|
| `IN_PROGRESS` | Wizard läuft | → Redirect zu `/store-wizard` |
| `COMPLETED` | Store erstellt | → Dashboard (normal) |
| `SKIPPED` | User hat übersprungen | → Dashboard (normal) |

### Completed Steps Format

```json
[1, 2]  // Schritt 1 & 2 abgeschlossen
[1, 2, 3]  // Schritt 1-3 abgeschlossen
[]  // Noch nichts abgeschlossen
```

### Wizard Data Format (JSON in TEXT-Feld)

```json
{
  "storeName": "string",
  "storeSlug": "string",
  "description": "string | null",
  "selectedCategories": ["string[]"],
  "contactInfo": {
    "email": "string | null",
    "phone": "string | null",
    "address": "string | null",
    "city": "string | null",
    "postalCode": "string | null"
  }
}
```

## 🔒 Security

### User-Isolation
```java
// Jeder User sieht nur seinen eigenen Fortschritt
@OneToOne
@JoinColumn(name = "user_id", nullable = false, unique = true)
private User user;

// Query filtert automatisch nach user_id
Optional<WizardProgress> findByUserId(Long userId);
```

### Cascade Delete
```sql
CONSTRAINT fk_wizard_progress_user 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE CASCADE
```
→ Wenn User gelöscht wird, wird auch Wizard-Fortschritt gelöscht

## 📊 Logging

Der Service loggt alle wichtigen Aktionen:

```
✅ Wizard progress saved for user 123: Step 2, Status IN_PROGRESS
⏭️ Wizard skipped by user 123
✅ Wizard completed for user 123 - Store 42 created
🗑️ Wizard progress deleted for user 123
📂 Wizard progress loaded: {...}
```

## 🛠️ Manuelle Operationen

### Fortschritt manuell löschen (Admin/Dev)

```sql
-- Für einen User
DELETE FROM wizard_progress WHERE user_id = 123;

-- Alle alten abgeschlossenen Wizards (> 30 Tage)
DELETE FROM wizard_progress 
WHERE status = 'COMPLETED' 
AND last_updated < NOW() - INTERVAL '30 days';
```

### Fortschritt debuggen

```sql
-- Zeige alle aktiven Wizard-Sessions
SELECT 
  wp.id,
  u.email,
  wp.current_step,
  wp.status,
  wp.last_updated,
  wp.wizard_data
FROM wizard_progress wp
JOIN users u ON wp.user_id = u.id
WHERE wp.status = 'IN_PROGRESS'
ORDER BY wp.last_updated DESC;
```

### Status manuell ändern

```sql
-- Wizard auf Schritt 1 zurücksetzen
UPDATE wizard_progress 
SET current_step = 1, completed_steps = '[]'
WHERE user_id = 123;

-- Wizard als completed markieren
UPDATE wizard_progress 
SET status = 'COMPLETED', store_created = TRUE
WHERE user_id = 123;
```

## 🧪 Testing

### Unit Test (Service)

```typescript
describe('WizardProgressService', () => {
  it('should save progress', () => {
    service.saveProgress({
      currentStep: 2,
      status: 'IN_PROGRESS',
      // ...
    }).subscribe(saved => {
      expect(saved.currentStep).toBe(2);
      expect(saved.status).toBe('IN_PROGRESS');
    });
  });

  it('should load progress', () => {
    service.loadProgress().subscribe(progress => {
      expect(progress).toBeDefined();
      expect(progress.currentStep).toBeGreaterThan(0);
    });
  });
});
```

### Integration Test (E2E)

```typescript
describe('Wizard Persistence', () => {
  it('should restore progress after reload', () => {
    // Starte Wizard
    cy.visit('/store-wizard');
    
    // Fülle Schritt 1
    cy.get('#storeName').type('Test Shop');
    cy.get('button').contains('Weiter').click();
    
    // Reload Page
    cy.reload();
    
    // Prüfe: Wizard ist bei Schritt 2
    expect(cy.get('.wizard-step[currentStep="2"]')).toBeVisible();
    expect(cy.get('#storeName')).toHaveValue('Test Shop');
  });
});
```

## 📈 Performance

### Optimierungen

1. **Single Request**: Alle Daten in einem API-Call
2. **JSON Storage**: Flexibel ohne Schema-Änderungen
3. **Indexed Queries**: `user_id`, `status`, `last_updated`
4. **BehaviorSubject**: Reactive State ohne Re-Fetches

### Caching Strategy

```typescript
// Service hält State im Memory
private progressSubject = new BehaviorSubject<WizardProgress | null>(null);
public progress$ = this.progressSubject.asObservable();

// Components können subscriben
wizardProgressService.progress$.subscribe(progress => {
  // Aktualisiert automatisch bei Änderungen
});
```

## 🚀 Deployment

### Migration (Automatisch bei App-Start)

```sql
-- Schema wird automatisch von schema.sql geladen
-- Bei Produktion: Flyway Migration hinzufügen
```

### Rollback (falls nötig)

```sql
-- Tabelle löschen
DROP TABLE IF EXISTS wizard_progress CASCADE;

-- Constraint entfernen
ALTER TABLE wizard_progress DROP CONSTRAINT IF EXISTS fk_wizard_progress_user;
```

## 🎉 Benefits

✅ **Bessere UX**: User verliert niemals Eingaben  
✅ **Höhere Conversion**: Weniger Abbrüche durch Fortsetzung  
✅ **Analytics**: Tracking wo User abbrechen  
✅ **Multi-Device**: Fortschritt auf allen Geräten  
✅ **Backup**: Automatische Sicherung der Eingaben  

---

**Erstellt**: 2026-03-30  
**Version**: 1.0  
**Status**: ✅ Production Ready  
**Backend**: Spring Boot + PostgreSQL/H2  
**Frontend**: Angular Signals + RxJS

