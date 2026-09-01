package storebackend.dto.dhl;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DHL Tracking Validation Result
 * 
 * Normalisiertes Ergebnis einer DHL Parcel DE Tracking API Abfrage.
 * 
 * Status-Unterscheidung:
 * - VALID: DHL kennt diese Sendung (code="0")
 * - NOT_FOUND: DHL kennt diese Sendung nicht (code="100")
 * 
 * Technische Fehler (Auth, Timeout, XML-Parsing) werden als Exception geworfen,
 * nicht als Status-Wert zurückgegeben.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DhlTrackingValidationResult {
    
    /**
     * Validation Status
     */
    private DhlTrackingValidationStatus status;
    
    /**
     * Original eingegebener Tracking-Code
     */
    private String trackingCode;
    
    /**
     * DHL Piece Code (mit führenden Nullen, z.B. "00340434664988418341")
     */
    private String pieceCode;
    
    /**
     * DHL Piece Identifier (ohne führende Nullen, z.B. "340434664988418341")
     */
    private String pieceIdentifier;
    
    /**
     * Sendungsstatus (z.B. "Vsl. am nächsten Werktag in Filiale abholbereit")
     */
    private String shipmentStatus;
    
    /**
     * DHL Standard Event Code (z.B. "ZF")
     */
    private String standardEventCode;
    
    /**
     * DHL Produktname (z.B. "DHL PAKET, Filial-Routing, GoGreen Plus")
     */
    private String productName;
    
    /**
     * Gewicht in kg (z.B. 2.5)
     */
    private BigDecimal weightKg;
    
    /**
     * DHL Response Code (z.B. "0", "100")
     */
    private String dhlResponseCode;
    
    /**
     * DHL Error Message (nur bei NOT_FOUND oder anderen Fehlern)
     */
    private String dhlErrorMessage;
    
    /**
     * Ist diese Sendung gültig?
     * Convenience-Methode für Abwärtskompatibilität
     */
    public boolean isValid() {
        return status == DhlTrackingValidationStatus.VALID;
    }
    
    /**
     * Validation Status Enum
     */
    public enum DhlTrackingValidationStatus {
        /**
         * DHL hat die Sendung gefunden (code="0")
         */
        VALID,
        
        /**
         * DHL kennt diese Sendung nicht (code="100")
         */
        NOT_FOUND
    }
}
