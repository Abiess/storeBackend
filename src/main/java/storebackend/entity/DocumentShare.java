package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.DocumentSharePermission;

import java.time.LocalDateTime;

/**
 * DOCUMENTS-App (Phase 1) - Teilen eines {@link UserDocument} mit einem
 * anderen bestehenden markt.ma-User (kein öffentlicher Share-Link in
 * Version 1, siehe Auftrag).
 *
 * Bewusst als EIGENE Entität modelliert (nicht als Flag auf {@link UserDocument}),
 * damit ein Dokument mit mehreren Usern geteilt werden kann und der Owner
 * einzelne Freigaben unabhängig voneinander wieder entfernen kann.
 *
 * Der Owner wird NICHT redundant auf dieser Entität gespeichert, sondern
 * ausschließlich über {@link #document}.{@code getOwner()} ermittelt - so
 * kann es nie zu einem inkonsistenten "ownerUserId" auf dem Share kommen,
 * der vom tatsächlichen Dokument-Owner abweicht.
 */
@Entity
@Table(name = "document_shares")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentShare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private UserDocument document;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shared_with_user_id", nullable = false)
    private User sharedWithUser;

    /** MVP: ausschließlich VIEW (lesen + Datei öffnen, kein Löschen/Owner-Wechsel). */
    @Enumerated(EnumType.STRING)
    @Column(name = "permission", nullable = false, length = 20)
    private DocumentSharePermission permission = DocumentSharePermission.VIEW;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
