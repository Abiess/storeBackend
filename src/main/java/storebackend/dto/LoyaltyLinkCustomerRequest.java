package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request zum nachträglichen Verknüpfen eines anonymen LoyaltyAccounts
 * (Bonuskarte ohne Konto) mit einem bestehenden CustomerProfile.
 *
 * Die Punkte bleiben erhalten - es wird KEIN neuer Account angelegt,
 * sondern lediglich die customerProfile-Referenz des bestehenden
 * (anonymen) Accounts gesetzt.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoyaltyLinkCustomerRequest {
    /** Bestehender (bisher anonymer) LoyaltyAccount */
    private Long loyaltyAccountId;
    /** Bestehendes CustomerProfile (store-spezifisch), dem der Account zugeordnet werden soll */
    private Long customerProfileId;
}
