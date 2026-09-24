package storebackend.dto.woocommerce;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Minimale Info über importierten Kunden für Aktivierungsliste im Frontend
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ImportedCustomerDto {
    private Long userId;
    private String email;
    private String name;
    private Boolean emailVerified;
    private LocalDateTime activationEmailSentAt;
}
