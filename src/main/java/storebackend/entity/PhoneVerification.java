package storebackend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity für Telefonnummer-Verifizierung
 */
@Entity
@Table(name = "phone_verifications", indexes = {
    @Index(name = "idx_phone_number", columnList = "phoneNumber"),
    @Index(name = "idx_created_at", columnList = "createdAt"),
    @Index(name = "idx_expires_at", columnList = "expiresAt")
})
@Data
@NoArgsConstructor
public class PhoneVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String phoneNumber;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private Long storeId;

    @Column(nullable = false)
    private boolean verified = false;

    @Column
    private LocalDateTime verifiedAt;

    @Column(nullable = false)
    private int attempts = 0;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column
    private String channel; // "sms" or "whatsapp"
}

