package storebackend.dto;

import lombok.Data;
import storebackend.enums.PaymentMethod;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

/**
 * DTO fuer Checkout-Anfrage mit optionaler Phone-Verifizierung
 */
@Data
public class CheckoutRequestDTO {

    @NotNull(message = "Store ID ist erforderlich")
    private Long storeId;

    @NotBlank(message = "Email ist erforderlich")
    @Email(message = "Ungueltige Email-Adresse")
    private String customerEmail;

    private String sessionId; // fuer Guest-Checkout

    @NotNull(message = "Lieferadresse ist erforderlich")
    private Map<String, String> shippingAddress;

    @NotNull(message = "Rechnungsadresse ist erforderlich")
    private Map<String, String> billingAddress;

    private String notes;

    @NotNull(message = "Zahlungsmethode ist erforderlich")
    private PaymentMethod paymentMethod;

    // Fuer Cash on Delivery erforderlich
    private Long phoneVerificationId;
}
