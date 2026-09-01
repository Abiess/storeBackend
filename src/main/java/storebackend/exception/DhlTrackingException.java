package storebackend.exception;

import lombok.Getter;

/**
 * DHL Tracking Exception
 * 
 * Wird geworfen bei technischen/konfigurativen Fehlern der DHL Tracking API:
 * - Authentifizierung fehlgeschlagen (code="5")
 * - DHL technischer Fehler (code="-1000")
 * - HTTP Timeout / Connection Error
 * - Ungültiges XML
 * 
 * NICHT für "Barcode ungültig" (code="100") - das ist status=NOT_FOUND!
 */
@Getter
public class DhlTrackingException extends RuntimeException {
    
    /**
     * Error Code für Kategorisierung
     */
    private final DhlTrackingErrorCode errorCode;
    
    /**
     * Original DHL Response Code (z.B. "5", "-1000", null bei Connectivity-Fehler)
     */
    private final String dhlResponseCode;
    
    /**
     * i18n Message Key für Frontend
     */
    private final String messageKey;
    
    public DhlTrackingException(
        DhlTrackingErrorCode errorCode,
        String message,
        String messageKey
    ) {
        super(message);
        this.errorCode = errorCode;
        this.dhlResponseCode = null;
        this.messageKey = messageKey;
    }
    
    public DhlTrackingException(
        DhlTrackingErrorCode errorCode,
        String message,
        String messageKey,
        String dhlResponseCode
    ) {
        super(message);
        this.errorCode = errorCode;
        this.dhlResponseCode = dhlResponseCode;
        this.messageKey = messageKey;
    }
    
    public DhlTrackingException(
        DhlTrackingErrorCode errorCode,
        String message,
        String messageKey,
        Throwable cause
    ) {
        super(message, cause);
        this.errorCode = errorCode;
        this.dhlResponseCode = null;
        this.messageKey = messageKey;
    }
    
    public DhlTrackingException(
        DhlTrackingErrorCode errorCode,
        String message,
        String messageKey,
        String dhlResponseCode,
        Throwable cause
    ) {
        super(message, cause);
        this.errorCode = errorCode;
        this.dhlResponseCode = dhlResponseCode;
        this.messageKey = messageKey;
    }
    
    /**
     * Error Code Kategorien
     */
    public enum DhlTrackingErrorCode {
        /**
         * DHL Authentifizierung fehlgeschlagen (code="5")
         */
        AUTHENTICATION_ERROR,
        
        /**
         * DHL technischer Fehler (code="-1000")
         */
        DHL_TECHNICAL_ERROR,
        
        /**
         * Unbekannter DHL-Fehlercode
         */
        UNKNOWN_DHL_ERROR,
        
        /**
         * XML Parsing Fehler
         */
        XML_PARSING_ERROR,
        
        /**
         * HTTP Timeout / Connection Error
         */
        CONNECTIVITY_ERROR,
        
        /**
         * HTTP 4xx/5xx Fehler
         */
        HTTP_ERROR
    }
}
