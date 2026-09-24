package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request zum Ersetzen eines LoyaltyIdentifier ("Karte ersetzen").
 * Der alte Identifier wird REPLACED, ein neuer ACTIVE Identifier wird
 * angelegt und an denselben LoyaltyAccount gehängt (siehe LoyaltyService.replaceIdentifier).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoyaltyReplaceCardRequest {
    private String newIdentifier;
}
