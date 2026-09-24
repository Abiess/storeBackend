package storebackend.exception;

/**
 * Exception die geworfen wird, wenn CAPTCHA-Validierung fehlschlägt
 */
public class CaptchaValidationException extends RuntimeException {
    
    public CaptchaValidationException(String message) {
        super(message);
    }
    
    public CaptchaValidationException(String message, Throwable cause) {
        super(message, cause);
    }
}
