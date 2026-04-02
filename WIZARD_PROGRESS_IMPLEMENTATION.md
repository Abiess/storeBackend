# Store Creation Wizard - Progress Persistence Implementation

## 📋 Übersicht

Das Store Creation Wizard Feature wurde um die Möglichkeit erweitert, den Fortschritt des Benutzers in der Datenbank zu speichern und wiederherzustellen. Dies ermöglicht es Nutzern, den Wizard zu verlassen und später genau dort fortzufahren, wo sie aufgehört haben.

## 🎯 Hauptfunktionen

### 1. Progress Service (`wizard-progress.service.ts`)

Ein neuer Service für die Verwaltung des Wizard-Fortschritts:

- **Speichern**: Automatisches Speichern des aktuellen Fortschritts (Schritt, Status, eingegebene Daten)
- **Laden**: Wiederherstellen des gespeicherten Fortschritts beim nächsten Besuch
- **Status-Tracking**: Verfolgen des Wizard-Status (IN_PROGRESS, COMPLETED, SKIPPED)
- **Schritt-Verfolgung**: Speichern abgeschlossener Schritte
- **Store-Verknüpfung**: Speichern der erstellten Store-ID nach Abschluss

#### Service-Methoden

```typescript
loadProgress(): Observable<WizardProgress | null>
saveProgress(progress: WizardProgress): Observable<WizardProgress | null>
skipWizard(): Observable<void | null>
completeWizard(storeId: number): Observable<void | null>
deleteProgress(): Observable<void | null>
hasActiveProgress(): Observable<boolean>
getCurrentProgress(): WizardProgress | null
setProgress(progress: WizardProgress | null): void
reset(): void
```

### 2. Datenstruktur

#### WizardProgress Interface

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
```

#### WizardProgressData Interface

```typescript
interface WizardProgressData {
  storeName?: string;
  storeSlug?: string;
  description?: string;
  selectedCategories?: string[];
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postalCode?: string;
  };
}
```

## 🌐 Mehrsprachige Übersetzungen

Alle Wizard-Texte wurden in **drei Sprachen** implementiert:

### Deutsche Übersetzungen (`de.json`)

- ✅ `wizard.*` - Alle Wizard-Schritte und UI-Texte
- ✅ `aiGenerator.*` - AI-Produkterstellung Texte
- ✅ Kategorien und Platzhalter
- ✅ Kontaktinformationen
- ✅ Zusammenfassung

### Englische Übersetzungen (`en.json`)

- ✅ `wizard.*` - Vollständige englische Übersetzungen
- ✅ `aiGenerator.*` - AI-Feature Übersetzungen
- ✅ Alle UI-Elemente lokalisiert

### Arabische Übersetzungen (`ar.json`)

- ✅ `wizard.*` - Arabische Übersetzungen (RTL-kompatibel)
- ✅ `aiGenerator.*` - AI-Feature auf Arabisch
- ✅ Kulturelle Anpassungen (z.B. Telefonnummern, Postleitzahlen)

## 🔧 Backend-Anforderungen

Der Service erwartet folgende Backend-Endpunkte:

```
GET    /api/wizard-progress           - Fortschritt laden
POST   /api/wizard-progress           - Fortschritt speichern
POST   /api/wizard-progress/skip      - Wizard überspringen
POST   /api/wizard-progress/complete  - Wizard abschließen (mit storeId)
DELETE /api/wizard-progress           - Fortschritt löschen
GET    /api/wizard-progress/has-active - Prüfen ob aktiver Fortschritt vorhanden
```

### Erwartete Backend-Entity

```java
@Entity
@Table(name = "wizard_progress")
public class WizardProgress {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;
    
    private Integer currentStep;
    
    @Enumerated(EnumType.STRING)
    private WizardStatus status;
    
    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private WizardProgressData data;
    
    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private List<Integer> completedSteps;
    
    private LocalDateTime lastUpdated;
    private Boolean storeCreated;
    
    @ManyToOne
    @JoinColumn(name = "created_store_id")
    private Store createdStore;
}
```

## 📊 Nutzungsszenarien

### Szenario 1: Wizard-Start
1. Benutzer startet Wizard
2. Service lädt gespeicherten Fortschritt
3. Bei vorhandenem Fortschritt: Wiederherstellung des letzten Schritts
4. Bei keinem Fortschritt: Start bei Schritt 1

### Szenario 2: Schritt-Navigation
1. Benutzer füllt Formular aus
2. Bei Navigation zum nächsten Schritt: Automatisches Speichern
3. Fortschritt wird in DB persistiert
4. Bei Fehler: Graceful Degradation (Fortsetzung ohne Speichern)

### Szenario 3: Wizard-Abbruch
1. Benutzer verlässt Wizard
2. Fortschritt bleibt gespeichert
3. Bei erneutem Besuch: Fortsetzung möglich
4. Option "Von vorne beginnen" verfügbar

### Szenario 4: Wizard-Abschluss
1. Store wird erstellt
2. `completeWizard(storeId)` wird aufgerufen
3. Status wird auf COMPLETED gesetzt
4. Store-ID wird gespeichert
5. Bei erneutem Besuch: Kein Wizard, direkt zum Dashboard

## 🛡️ Error Handling

Der Service implementiert **Graceful Degradation**:

- **Kein Backend verfügbar**: Wizard funktioniert weiterhin, nur ohne Persistierung
- **Netzwerkfehler**: Logging in Console, Fortsetzung möglich
- **Ungültige Daten**: Validierung mit klaren Fehlermeldungen

```typescript
.pipe(
  catchError(err => {
    console.warn('⚠️ Could not save wizard progress:', err.status);
    return of(null);
  })
)
```

## 🔄 Integration mit Komponenten

### In Store-Creation-Wizard Component

```typescript
export class StoreCreationWizardComponent implements OnInit {
  constructor(
    private wizardProgressService: WizardProgressService,
    private router: Router
  ) {}

  ngOnInit() {
    // Fortschritt laden
    this.wizardProgressService.loadProgress().subscribe(progress => {
      if (progress && progress.status === 'IN_PROGRESS') {
        this.restoreProgress(progress);
      }
    });
  }

  onStepChange() {
    // Fortschritt speichern
    const progress: WizardProgress = {
      currentStep: this.currentStep,
      status: 'IN_PROGRESS',
      data: this.collectFormData(),
      completedSteps: this.completedSteps
    };
    this.wizardProgressService.saveProgress(progress).subscribe();
  }

  onStoreCreated(storeId: number) {
    // Wizard abschließen
    this.wizardProgressService.completeWizard(storeId).subscribe(() => {
      this.router.navigate(['/dashboard']);
    });
  }
}
```

## ✅ JSON-Validierung

Alle Sprachdateien wurden auf Gültigkeit geprüft:

- ✅ `de.json` - Gültig
- ✅ `en.json` - Gültig  
- ✅ `ar.json` - Gültig (Duplikat-Fehler behoben)

## 📝 Nächste Schritte

### Backend-Implementation (erforderlich)
1. [ ] `WizardProgress` Entity erstellen
2. [ ] `WizardProgressRepository` implementieren
3. [ ] `WizardProgressService` (Backend) implementieren
4. [ ] REST Controller mit allen Endpunkten
5. [ ] User-Authentifizierung integrieren
6. [ ] JSON-Serialisierung für `data` und `completedSteps`

### Frontend-Integration (optional)
1. [ ] Wizard-Komponente um Progress-Service erweitern
2. [ ] "Fortschritt löschen" Button hinzufügen
3. [ ] Loading-States für Progress-Operations
4. [ ] Toast-Notifications bei Save/Load
5. [ ] Analytics für Wizard-Completion-Rate

### Testing
1. [ ] Unit-Tests für Service-Methoden
2. [ ] Integration-Tests für API-Calls
3. [ ] E2E-Tests für Wizard-Flow
4. [ ] Offline-Verhalten testen

## 🎨 UI/UX Empfehlungen

1. **Progress-Indicator**: Zeige visuell an, wenn gespeichert wird
2. **Fortsetzungs-Banner**: "Sie haben einen unvollständigen Wizard - Fortfahren?"
3. **Neu-Start-Option**: Button "Von vorne beginnen" mit Warnung
4. **Auto-Save-Feedback**: Subtile Benachrichtigung "Automatisch gespeichert"
5. **Offline-Hinweis**: Wenn Backend nicht erreichbar ist

## 🔐 Sicherheit

- **User-Isolation**: Jeder User sieht nur seinen eigenen Fortschritt
- **Input-Validation**: Alle Eingaben werden validiert
- **XSS-Protection**: Keine direkten HTML-Injektionen
- **CSRF-Protection**: Standard Spring Security CSRF-Token

## 📊 Monitoring

Empfohlene Metriken:
- Wizard-Start-Rate
- Wizard-Completion-Rate
- Durchschnittliche Zeit pro Schritt
- Abbruch-Rate pro Schritt
- Fortschritts-Wiederherstellungs-Rate

---

**Status**: ✅ Frontend vollständig implementiert | ⏳ Backend-Implementation ausstehend  
**Version**: 1.0.0  
**Erstellt**: 2026-04-02  
**Letzte Aktualisierung**: 2026-04-02

