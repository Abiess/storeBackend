package com.example.storebackend.wizard.entity;

import com.example.storebackend.user.entity.User;
import com.example.storebackend.store.entity.Store;
import com.vladmihalcea.hibernate.type.json.JsonBinaryType;
import lombok.Data;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Entity zum Speichern des Store-Creation-Wizard Fortschritts.
 * Ermöglicht Benutzern, den Wizard zu verlassen und später fortzusetzen.
 */
@Entity
@Table(name = "wizard_progress")
@Data
@TypeDef(name = "jsonb", typeClass = JsonBinaryType.class)
public class WizardProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Der Benutzer, dem dieser Fortschritt gehört
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Aktueller Schritt im Wizard (1-5)
     */
    @Column(nullable = false)
    private Integer currentStep;

    /**
     * Status des Wizard-Durchlaufs
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WizardStatus status;

    /**
     * Gesammelte Formulardaten als JSON
     * Enthält: storeName, storeSlug, description, selectedCategories, contactInfo
     */
    @Type(type = "jsonb")
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> data;

    /**
     * Liste der abgeschlossenen Schritte
     */
    @Type(type = "jsonb")
    @Column(name = "completed_steps", columnDefinition = "jsonb")
    private List<Integer> completedSteps;

    /**
     * Zeitpunkt der letzten Aktualisierung
     */
    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    /**
     * Wurde ein Store erstellt?
     */
    @Column(name = "store_created")
    private Boolean storeCreated = false;

    /**
     * Referenz zum erstellten Store (falls vorhanden)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_store_id")
    private Store createdStore;

    /**
     * Status-Enum für den Wizard
     */
    public enum WizardStatus {
        IN_PROGRESS,   // Wizard läuft noch
        COMPLETED,     // Wizard abgeschlossen
        SKIPPED        // Wizard übersprungen
    }

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        this.lastUpdated = LocalDateTime.now();
    }
}

