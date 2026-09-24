package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request zum Registrieren eines Karten-/Kundencodes für einen bestehenden Kunden.
 *
 * MVP: Nötig, um den Testablauf durchführbar zu machen (Code muss vor dem
 * ersten Lookup existieren). identifier kann später 1:1 durch eine NFC-UID
 * ersetzt werden, ohne dass sich an dieser Struktur etwas ändert.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoyaltyRegisterRequest {
    /** Bestehendes CustomerProfile (store-spezifisch) */
    private Long customerProfileId;

    /** Manueller Testcode, z.B. "BONUS-0001" (später: NFC-UID) */
    private String identifier;
}
