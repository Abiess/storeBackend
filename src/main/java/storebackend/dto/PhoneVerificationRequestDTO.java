package storebackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * DTO für Telefonnummer-Verifizierung Anfrage
 * Für Cash on Delivery Bestellungen
 */
@Data
public class PhoneVerificationRequestDTO {

    @NotBlank(message = "Telefonnummer ist erforderlich")
    @Pattern(
        regexp = "^\\+?[1-9]\\d{1,14}$",
        message = "Ungültige Telefonnummer. Format: +49123456789 oder 0123456789"
    )
    private String phoneNumber;

    @NotBlank(message = "Store ID ist erforderlich")
    private String storeId;

    /**
     * Optional: Bevorzugter Kanal (whatsapp, sms)
     * Default: whatsapp mit SMS-Fallback
     */
    private String preferredChannel;
}

