package storebackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Speichert den Fortschritt des Store-Creation-Wizards pro User.
 * Ermöglicht Fortsetzung an der letzten Position bei erneutem Login.
 */
@Entity
@Table(name = "wizard_progress")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WizardProgress {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    /**
     * Aktueller Schritt im Wizard (1-4)
     */
    @Column(name = "current_step", nullable = false)
    private Integer currentStep = 1;

    /**
     * Status: IN_PROGRESS, COMPLETED, SKIPPED
     */
    @Column(name = "status", nullable = false)
    private String status = "IN_PROGRESS";

    /**
     * Wizard-Daten als JSON
     * Speichert: storeName, storeSlug, description, selectedCategories, contactInfo
     */
    @Column(name = "wizard_data", columnDefinition = "TEXT")
    private String wizardData;

    /**
     * Welche Schritte wurden bereits abgeschlossen (JSON Array)
     * Beispiel: "[1,2]" bedeutet Schritt 1 und 2 sind completed
     */
    @Column(name = "completed_steps", columnDefinition = "TEXT")
    private String completedSteps = "[]";

    /**
     * Zeitpunkt des letzten Fortschritts
     */
    @Column(name = "last_updated", nullable = false)
    private LocalDateTime lastUpdated;

    /**
     * Zeitpunkt der Erstellung
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Flag: Wurde Store am Ende erstellt?
     */
    @Column(name = "store_created", nullable = false)
    private Boolean storeCreated = false;

    /**
     * Falls Store erstellt wurde, speichere die Store-ID
     */
    @Column(name = "created_store_id")
    private Long createdStoreId;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        lastUpdated = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        lastUpdated = LocalDateTime.now();
    }

    // Helper Methods
    public boolean isInProgress() {
        return "IN_PROGRESS".equals(status);
    }

    public boolean isCompleted() {
        return "COMPLETED".equals(status);
    }

    public boolean isSkipped() {
        return "SKIPPED".equals(status);
    }

    public void markAsCompleted() {
        this.status = "COMPLETED";
    }

    public void markAsSkipped() {
        this.status = "SKIPPED";
    }
}

