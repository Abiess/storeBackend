package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO für Telefonnummer-Verifizierungsantwort
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PhoneVerificationResponseDTO {
    private boolean success;
    private Long verificationId;
    private String channel; // "whatsapp", "sms"
    private String message;
    private Integer expiresInMinutes;
    private Integer remainingAttempts;
}

