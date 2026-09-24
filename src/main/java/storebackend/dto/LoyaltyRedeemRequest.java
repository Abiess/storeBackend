package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request für das Einlösen von Punkten ("Punkte einlösen").
 *
 * points MUSS positiv sein (die Menge, die eingelöst werden soll).
 * Der Service bucht intern eine negative LoyaltyTransaction (REDEEM).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoyaltyRedeemRequest {
    /** Karten-/Kundencode (MUSS ein aktiver Identifier sein) */
    private String identifier;

    /** Anzahl einzulösender Punkte, MUSS positiv sein und <= aktuellem Punktestand */
    private Integer points;

    /** Optionale bestehende Order-Referenz (z.B. POS-Checkout mit Punkte-Rabatt) */
    private Long orderId;
}
