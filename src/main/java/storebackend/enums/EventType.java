package storebackend.enums;

/**
 * Security Event Types für strukturiertes Logging
 * Keine Strings mehr - verhindert Tippfehler
 */
public enum EventType {
    // Authentication
    LOGIN_SUCCESS,
    LOGIN_FAILED,
    LOGOUT,
    
    // Registration & Verification
    REGISTRATION_ATTEMPT,
    REGISTRATION_SUCCESS,
    EMAIL_VERIFICATION_SENT,
    EMAIL_VERIFICATION_RESENT,
    EMAIL_VERIFICATION_SUCCESS,
    EMAIL_VERIFICATION_FAILED,
    
    // Password Reset
    PASSWORD_RESET_REQUESTED,
    PASSWORD_RESET_SUCCESS,
    PASSWORD_RESET_FAILED,
    
    // Phone Verification
    PHONE_VERIFICATION_SENT,
    PHONE_VERIFICATION_SUCCESS,
    PHONE_VERIFICATION_FAILED,
    
    // Store Operations
    STORE_CREATION_ATTEMPT,
    STORE_CREATION_SUCCESS,
    STORE_ACCESS_EMAIL_SENT,
    
    // Mail Events
    MAIL_SENT,
    MAIL_BLOCKED,
    MAIL_FAILED,
    
    // Security Events
    CAPTCHA_FAILED,
    HONEYPOT_TRIGGERED,
    RATE_LIMIT_EXCEEDED,
    KILL_SWITCH_TRIGGERED,
    CIRCUIT_BREAKER_TRIGGERED,
    
    // Other
    API_REQUEST,
    SUSPICIOUS_ACTIVITY,
    BOT_DETECTED
}
