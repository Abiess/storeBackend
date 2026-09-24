package storebackend.exception;

/**
 * DHL Configuration Exception
 * 
 * Wird geworfen wenn DHL nicht konfiguriert ist oder Credentials fehlen.
 * Enthält messageKey für i18n im Frontend.
 */
public class DhlConfigurationException extends RuntimeException {
    
    private final String messageKey;
    
    public DhlConfigurationException(String message, String messageKey) {
        super(message);
        this.messageKey = messageKey;
    }
    
    public String getMessageKey() {
        return messageKey;
    }
}
