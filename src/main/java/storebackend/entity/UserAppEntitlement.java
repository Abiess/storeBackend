package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.AppKey;

import java.time.LocalDateTime;

/**
 * App-Entitlement-Konzept (Phase 1) - additive, rückwärtskompatible
 * Steuerung des App-ZUGRIFFS ("darf dieser User diese App überhaupt
 * öffnen/nutzen?"), getrennt von:
 * - Store-Zugriff       -> {@code storebackend.util.StoreAccessChecker}
 * - fachlichen Aktionen -> {@link StoreRole#getPermissionList()}
 *
 * LEGACY/MANAGED-Semantik (userweit, siehe {@code storebackend.enums.AppAccessMode}):
 * - Existiert für einen User KEIN Eintrag in dieser Tabelle -> LEGACY,
 *   Zugriff auf alle Apps bleibt wie bisher (kein Verhalten geändert).
 * - Existiert MINDESTENS EIN Eintrag -> MANAGED für den GESAMTEN User;
 *   nur passende enabled=true-Einträge gewähren dann noch Zugriff.
 *
 * SCOPE-KONSISTENZ (siehe {@code storebackend.enums.AppScope}):
 * - STORE-Apps (SHOP, DHL, LOYALTY)     -> store MUSS gesetzt sein.
 * - GLOBAL-Apps (MARITIME, ISSUE_ANALYSIS) -> store MUSS null sein.
 * Die Validierung erfolgt bewusst in {@code storebackend.util.AppAccessChecker}
 * bzw. beim Anlegen von Einträgen, NICHT über eine JPA-Bean-Validation-Annotation,
 * da die Regel je nach AppKey unterschiedlich ist.
 *
 * WICHTIG - Uniqueness ist AUSSCHLIESSLICH DB-seitig geregelt (siehe
 * scripts/db/migrations/V025__create_user_app_entitlements.sql):
 * - Es gibt bewusst KEIN @UniqueConstraint auf Entity-Ebene.
 * - Grund: Ein unconditional JPA-Unique-Constraint über (user_id, store_id, app)
 *   würde bei ddl-auto=update NICHT die für NULL-store_id (globale Apps) und
 *   NULL-freie Fälle (Store-Apps) benötigten ZWEI PARTIELLEN Unique-Indizes
 *   abbilden können (Postgres: NULL <> NULL, ein normaler Unique-Constraint
 *   würde mehrere globale Einträge pro User/App nicht verhindern).
 *   Analog zum bewusst gewählten Muster bei {@link DhlParcel} (siehe dortigen
 *   Kommentar sowie Migrationen V017/V020) lebt die tatsächliche
 *   Unique-Regel ausschließlich in der SQL-Migration.
 */
@Entity
@Table(name = "user_app_entitlements")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserAppEntitlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Null bei GLOBAL-Scope-Apps (z.B. MARITIME, ISSUE_ANALYSIS),
     * gesetzt bei STORE-Scope-Apps (z.B. SHOP, DHL, LOYALTY).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = true)
    private Store store;

    @Enumerated(EnumType.STRING)
    @Column(name = "app", nullable = false, length = 30)
    private AppKey app;

    @Column(name = "enabled", nullable = false)
    private boolean enabled;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
