package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request zum Ausgeben einer neuen (anonymen) Bonuskarte für Laufkundschaft
 * ohne Konto/CustomerProfile.
 *
 * Erzeugt einen neuen LoyaltyAccount OHNE CustomerProfile und verknüpft
 * damit den übergebenen Karten-/Kundencode (identifier). Kann später über
 * {@code /loyalty/link-customer} nachträglich einem CustomerProfile
 * zugeordnet werden, ohne dass Punkte verloren gehen.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoyaltyIssueCardRequest {
    /** Gescannter/eingegebener Code, z.B. "BONUS-0001" (später: NFC-UID) */
    private String identifier;
}
