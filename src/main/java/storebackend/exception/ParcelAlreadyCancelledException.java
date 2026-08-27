package storebackend.exception;

import lombok.Getter;

import java.util.Map;

/**
 * Exception: Paket wurde bereits storniert
 * 
 * Phase 3A.4 - Paket-Korrektur
 * 
 * Wird geworfen wenn versucht wird, ein bereits CANCELLED Paket
 * erneut zu stornieren.
 */
@Getter
public class ParcelAlreadyCancelledException extends DhlParcelException {
    
    public ParcelAlreadyCancelledException(String trackingCode) {
        super(
            "PARCEL_ALREADY_CANCELLED",
            String.format("Parcel %s has already been cancelled", trackingCode),
            Map.of("trackingCode", trackingCode)
        );
    }
}
