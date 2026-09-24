package storebackend.exception;

/**
 * Exception wenn Benutzer versucht sich anzumelden aber Email noch nicht bestätigt hat.
 * 
 * Diese Exception signalisiert dem Frontend dass:
 * - Login-Daten korrekt sind
 * - Email-Verifizierung noch aussteht
 * - User soll Email-Posteingang prüfen
 */
public class EmailNotVerifiedException extends RuntimeException {
    
    public EmailNotVerifiedException() {
        super("Please verify your email address before logging in. Check your inbox for the verification link.");
    }
    
    public EmailNotVerifiedException(String message) {
        super(message);
    }
}
