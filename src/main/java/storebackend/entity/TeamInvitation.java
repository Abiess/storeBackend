package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "team_invitations")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "role", nullable = false, length = 50)
    private String role;

    /** Komma-separierte Liste von Permissions (optional) */
    @Column(name = "permissions", columnDefinition = "TEXT")
    private String permissions;

    /** SHA-256 Hash des Token (NICHT der Klartext!) */
    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private InvitationStatus status = InvitationStatus.PENDING;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "invited_by_user_id", nullable = false)
    private User invitedBy;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "accepted_by_user_id")
    private User acceptedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (expiresAt == null) {
            expiresAt = LocalDateTime.now().plusDays(7);  // Default: 7 Tage
        }
    }

    public enum InvitationStatus {
        PENDING,
        ACCEPTED,
        EXPIRED,
        REVOKED
    }

    /** Prüfen ob Einladung noch gültig ist */
    public boolean isValid() {
        return status == InvitationStatus.PENDING
                && LocalDateTime.now().isBefore(expiresAt);
    }

    /** Einladung als abgelaufen markieren */
    public void markExpired() {
        this.status = InvitationStatus.EXPIRED;
    }

    /** Einladung widerrufen */
    public void revoke() {
        this.status = InvitationStatus.REVOKED;
        this.revokedAt = LocalDateTime.now();
    }

    /** Einladung akzeptieren */
    public void accept(User user) {
        this.status = InvitationStatus.ACCEPTED;
        this.acceptedBy = user;
        this.acceptedAt = LocalDateTime.now();
    }
}
