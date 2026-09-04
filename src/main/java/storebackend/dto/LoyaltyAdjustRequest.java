package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request für die manuelle Punktekorrektur ("Punkte korrigieren").
 *
 * points kann positiv (Bonus) oder negativ (Abzug) sein. reason ist
 * Pflichtfeld (Audit-Trail, landet als Note in der LoyaltyTransaction).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoyaltyAdjustRequest {
    /** Karten-/Kundencode (MUSS ein aktiver Identifier sein) */
    private String identifier;

    /** Punkteänderung, positiv oder negativ, darf nicht 0 sein */
    private Integer points;

    /** Pflichtfeld: Grund der Korrektur (z.B. "Kulanz", "Storno Bestellung #123") */
    private String reason;
}
