package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Loyalty Account – Listen-Eintrag ("Bonuskarten"-Übersicht)
 *
 * Schlanke Projektion für die Übersichtsliste auf der Loyalty-Seite
 * (GET /api/stores/{storeId}/loyalty/accounts). Enthält bewusst nur die für
 * die Liste benötigten Felder - für Details/Aktionen wird weiterhin
 * {@link LoyaltyAccountDTO} über den bestehenden lookup-Endpoint verwendet.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoyaltyAccountListItemDTO {
    private Long loyaltyAccountId;
    private Long customerProfileId;
    /** null bei anonymem Account - Frontend zeigt dann "Nicht registriert" */
    private String customerName;
    /** true = Account ist (noch) keinem CustomerProfile zugeordnet */
    private boolean anonymous;
    /** Primärer/erster (bevorzugt aktiver) Karten-/Kundencode dieses Accounts */
    private String identifier;
    /** Status des primären Identifiers: ACTIVE | BLOCKED | REPLACED, null falls kein Identifier existiert */
    private String status;
    private Integer pointsBalance;
    private LocalDateTime createdAt;
    /** Zeitpunkt der letzten EARN-Transaction, null falls noch kein Einkauf zugeordnet wurde */
    private LocalDateTime lastPurchaseAt;
}
