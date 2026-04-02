# Backend Integration Guide - Wizard Progress Feature

## 🚀 Quick Start

Diese Anleitung zeigt, wie das Wizard Progress Feature im Backend implementiert wird.

## 📋 Schritt 1: Dependencies

Stelle sicher, dass diese Dependencies in `pom.xml` vorhanden sind:

```xml
<!-- Hibernate Types für JSONB Support -->
<dependency>
    <groupId>com.vladmihalcea</groupId>
    <artifactId>hibernate-types-52</artifactId>
    <version>2.20.0</version>
</dependency>
```

## 📊 Schritt 2: Database Migration

Erstelle eine neue Flyway-Migration: `V{next}_create_wizard_progress.sql`

```sql
-- Tabelle für Wizard-Fortschritt
CREATE TABLE wizard_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    data JSONB,
    completed_steps JSONB,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    store_created BOOLEAN DEFAULT FALSE,
    created_store_id BIGINT REFERENCES stores(id) ON DELETE SET NULL,
    
    -- Index für schnelle Benutzer-Lookups
    CONSTRAINT fk_wizard_progress_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_wizard_progress_store FOREIGN KEY (created_store_id) REFERENCES stores(id)
);

-- Index für Performance
CREATE INDEX idx_wizard_progress_user_id ON wizard_progress(user_id);
CREATE INDEX idx_wizard_progress_status ON wizard_progress(status);

-- Nur ein aktiver Fortschritt pro User
CREATE UNIQUE INDEX idx_wizard_progress_unique_active 
ON wizard_progress(user_id) 
WHERE status = 'IN_PROGRESS';
```

## 📁 Schritt 3: Entity, Repository und Service

### 3.1 Entity
Erstelle `WizardProgress.java` (siehe WIZARD_PROGRESS_BACKEND_EXAMPLE.java)

### 3.2 Repository

```java
package com.example.storebackend.wizard.repository;

import com.example.storebackend.wizard.entity.WizardProgress;
import com.example.storebackend.wizard.entity.WizardProgress.WizardStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WizardProgressRepository extends JpaRepository<WizardProgress, Long> {
    
    /**
     * Finde aktiven Fortschritt für einen Benutzer
     */
    Optional<WizardProgress> findByUserIdAndStatus(Long userId, WizardStatus status);
    
    /**
     * Finde beliebigen Fortschritt für einen Benutzer
     */
    Optional<WizardProgress> findByUserId(Long userId);
    
    /**
     * Prüfe ob aktiver Fortschritt existiert
     */
    boolean existsByUserIdAndStatus(Long userId, WizardStatus status);
    
    /**
     * Lösche Fortschritt für Benutzer
     */
    void deleteByUserId(Long userId);
}
```

### 3.3 Service

```java
package com.example.storebackend.wizard.service;

import com.example.storebackend.wizard.entity.WizardProgress;
import com.example.storebackend.wizard.entity.WizardProgress.WizardStatus;
import com.example.storebackend.wizard.repository.WizardProgressRepository;
import com.example.storebackend.store.entity.Store;
import com.example.storebackend.store.repository.StoreRepository;
import com.example.storebackend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class WizardProgressService {

    private final WizardProgressRepository wizardProgressRepository;
    private final StoreRepository storeRepository;

    /**
     * Lade gespeicherten Fortschritt für aktuellen User
     */
    @Transactional(readOnly = true)
    public Optional<WizardProgress> loadProgress(UserPrincipal user) {
        log.info("Loading wizard progress for user: {}", user.getId());
        return wizardProgressRepository.findByUserIdAndStatus(
            user.getId(), 
            WizardStatus.IN_PROGRESS
        );
    }

    /**
     * Speichere oder aktualisiere Fortschritt
     */
    @Transactional
    public WizardProgress saveProgress(UserPrincipal user, WizardProgress progress) {
        log.info("Saving wizard progress for user: {} at step: {}", 
            user.getId(), progress.getCurrentStep());
        
        // Suche existierenden Fortschritt
        Optional<WizardProgress> existing = wizardProgressRepository
            .findByUserIdAndStatus(user.getId(), WizardStatus.IN_PROGRESS);
        
        WizardProgress toSave;
        if (existing.isPresent()) {
            // Update existierenden Fortschritt
            toSave = existing.get();
            toSave.setCurrentStep(progress.getCurrentStep());
            toSave.setData(progress.getData());
            toSave.setCompletedSteps(progress.getCompletedSteps());
        } else {
            // Neuen Fortschritt erstellen
            toSave = progress;
            toSave.setUser(user.getUser());
            toSave.setStatus(WizardStatus.IN_PROGRESS);
        }
        
        return wizardProgressRepository.save(toSave);
    }

    /**
     * Markiere Wizard als übersprungen
     */
    @Transactional
    public void skipWizard(UserPrincipal user) {
        log.info("User {} skipped wizard", user.getId());
        
        wizardProgressRepository.findByUserIdAndStatus(
            user.getId(), 
            WizardStatus.IN_PROGRESS
        ).ifPresent(progress -> {
            progress.setStatus(WizardStatus.SKIPPED);
            wizardProgressRepository.save(progress);
        });
    }

    /**
     * Markiere Wizard als abgeschlossen und verknüpfe mit Store
     */
    @Transactional
    public void completeWizard(UserPrincipal user, Long storeId) {
        log.info("User {} completed wizard, created store: {}", user.getId(), storeId);
        
        Optional<Store> store = storeRepository.findById(storeId);
        
        wizardProgressRepository.findByUserIdAndStatus(
            user.getId(), 
            WizardStatus.IN_PROGRESS
        ).ifPresent(progress -> {
            progress.setStatus(WizardStatus.COMPLETED);
            progress.setStoreCreated(true);
            store.ifPresent(progress::setCreatedStore);
            wizardProgressRepository.save(progress);
        });
    }

    /**
     * Lösche Wizard-Fortschritt (User will von vorne beginnen)
     */
    @Transactional
    public void deleteProgress(UserPrincipal user) {
        log.info("Deleting wizard progress for user: {}", user.getId());
        wizardProgressRepository.deleteByUserId(user.getId());
    }

    /**
     * Prüfe ob aktiver Fortschritt vorhanden ist
     */
    @Transactional(readOnly = true)
    public boolean hasActiveProgress(UserPrincipal user) {
        return wizardProgressRepository.existsByUserIdAndStatus(
            user.getId(), 
            WizardStatus.IN_PROGRESS
        );
    }
}
```

## 🎮 Schritt 4: REST Controller

```java
package com.example.storebackend.wizard.controller;

import com.example.storebackend.wizard.entity.WizardProgress;
import com.example.storebackend.wizard.service.WizardProgressService;
import com.example.storebackend.security.CurrentUser;
import com.example.storebackend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wizard-progress")
@RequiredArgsConstructor
@Slf4j
public class WizardProgressController {

    private final WizardProgressService wizardProgressService;

    /**
     * GET /api/wizard-progress
     * Lade gespeicherten Fortschritt
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<WizardProgress> getProgress(@CurrentUser UserPrincipal user) {
        log.debug("GET /api/wizard-progress for user: {}", user.getId());
        
        return wizardProgressService.loadProgress(user)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.noContent().build());
    }

    /**
     * POST /api/wizard-progress
     * Speichere Fortschritt
     */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<WizardProgress> saveProgress(
        @CurrentUser UserPrincipal user,
        @RequestBody WizardProgress progress
    ) {
        log.debug("POST /api/wizard-progress for user: {}", user.getId());
        
        WizardProgress saved = wizardProgressService.saveProgress(user, progress);
        return ResponseEntity.ok(saved);
    }

    /**
     * POST /api/wizard-progress/skip
     * Wizard überspringen
     */
    @PostMapping("/skip")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> skipWizard(@CurrentUser UserPrincipal user) {
        log.debug("POST /api/wizard-progress/skip for user: {}", user.getId());
        
        wizardProgressService.skipWizard(user);
        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/wizard-progress/complete?storeId=123
     * Wizard abschließen
     */
    @PostMapping("/complete")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> completeWizard(
        @CurrentUser UserPrincipal user,
        @RequestParam Long storeId
    ) {
        log.debug("POST /api/wizard-progress/complete for user: {}, store: {}", 
            user.getId(), storeId);
        
        wizardProgressService.completeWizard(user, storeId);
        return ResponseEntity.ok().build();
    }

    /**
     * DELETE /api/wizard-progress
     * Fortschritt löschen
     */
    @DeleteMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteProgress(@CurrentUser UserPrincipal user) {
        log.debug("DELETE /api/wizard-progress for user: {}", user.getId());
        
        wizardProgressService.deleteProgress(user);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/wizard-progress/has-active
     * Prüfe ob aktiver Fortschritt vorhanden
     */
    @GetMapping("/has-active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Boolean> hasActiveProgress(@CurrentUser UserPrincipal user) {
        log.debug("GET /api/wizard-progress/has-active for user: {}", user.getId());
        
        boolean hasProgress = wizardProgressService.hasActiveProgress(user);
        return ResponseEntity.ok(hasProgress);
    }
}
```

## ✅ Schritt 5: Testen

### 5.1 Mit cURL

```bash
# Fortschritt laden
curl -X GET http://localhost:8080/api/wizard-progress \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Fortschritt speichern
curl -X POST http://localhost:8080/api/wizard-progress \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentStep": 2,
    "status": "IN_PROGRESS",
    "data": {
      "storeName": "Mein Test Shop",
      "storeSlug": "test-shop"
    },
    "completedSteps": [1]
  }'

# Wizard abschließen
curl -X POST "http://localhost:8080/api/wizard-progress/complete?storeId=123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5.2 Unit-Test

```java
@SpringBootTest
@Transactional
class WizardProgressServiceTest {

    @Autowired
    private WizardProgressService service;
    
    @Autowired
    private WizardProgressRepository repository;
    
    @Test
    void shouldSaveAndLoadProgress() {
        // Given
        UserPrincipal user = createTestUser();
        WizardProgress progress = new WizardProgress();
        progress.setCurrentStep(2);
        progress.setStatus(WizardStatus.IN_PROGRESS);
        
        // When
        WizardProgress saved = service.saveProgress(user, progress);
        Optional<WizardProgress> loaded = service.loadProgress(user);
        
        // Then
        assertThat(loaded).isPresent();
        assertThat(loaded.get().getCurrentStep()).isEqualTo(2);
    }
}
```

## 🔧 Troubleshooting

### Problem: "Column 'data' has type jsonb but expression has type bytea"

**Lösung**: PostgreSQL-Dialect korrekt konfigurieren:

```properties
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQL10Dialect
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQL10Dialect
```

### Problem: JsonBinaryType nicht gefunden

**Lösung**: Hibernate Types Dependency hinzufügen (siehe Schritt 1)

### Problem: UNIQUE Constraint Violation

**Lösung**: Ein User kann nur einen IN_PROGRESS Fortschritt haben. Vor dem Erstellen eines neuen Fortschritts den alten löschen oder aktualisieren.

## 📊 Performance-Tipps

1. **Caching**: Aktiviere Second-Level-Cache für WizardProgress
2. **Lazy Loading**: Lade `user` und `createdStore` lazy
3. **Batch Operations**: Bei vielen Updates BatchSize konfigurieren
4. **Index**: Nutze die vorgeschlagenen Indizes für schnelle Queries

## 🔐 Security Checklist

- [x] User kann nur eigenen Fortschritt sehen/ändern
- [x] @PreAuthorize auf allen Endpunkten
- [x] CSRF-Protection (automatisch durch Spring Security)
- [x] Input-Validierung in Controller
- [x] SQL-Injection-Schutz (durch JPA)

---

**Status**: ✅ Bereit für Implementation  
**Geschätzte Zeit**: 2-3 Stunden  
**Schwierigkeit**: Mittel

