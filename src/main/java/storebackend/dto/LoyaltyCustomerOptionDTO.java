package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Leichtgewichtige Kunden-Option für die Loyalty-Code-Registrierung
 * (Dropdown/Suche über bestehende CustomerProfile-Datensätze).
 *
 * Kein neuer Customer-Datentyp – nur eine Projektion des bestehenden
 * CustomerProfile für die Auswahl in der UI.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoyaltyCustomerOptionDTO {
    private Long customerProfileId;
    private String name;
    private String email;
    private String phone;
    /** true, wenn dieser Kunde bereits einen Loyalty Account/Code besitzt */
    private boolean alreadyRegistered;
}
