package storebackend.enums;

/**
 * Blockierungsgründe - strukturiert statt Freitext
 */
public enum BlockReason {
    // CAPTCHA
    CAPTCHA_MISSING,
    CAPTCHA_INVALID,
    CAPTCHA_EXPIRED,
    CAPTCHA_CONFIG_ERROR,
    
    // Rate Limiting
    IP_RATE_LIMIT,
    EMAIL_RATE_LIMIT,
    DOMAIN_RATE_LIMIT,
    PHONE_RATE_LIMIT,
    ENDPOINT_RATE_LIMIT,
    GLOBAL_RATE_LIMIT,
    
    // Domain/Email
    DISPOSABLE_EMAIL,
    INVALID_EMAIL_DOMAIN,
    BLACKLISTED_DOMAIN,
    
    // Honeypot & Bot Detection
    HONEYPOT_TRIGGERED,
    BOT_DETECTED,
    SUSPICIOUS_USER_AGENT,
    
    // Feature Controls
    KILL_SWITCH_ACTIVE,
    FEATURE_DISABLED,
    CIRCUIT_BREAKER_OPEN,
    
    // Authentication
    INVALID_CREDENTIALS,
    ACCOUNT_LOCKED,
    ACCOUNT_DISABLED,
    EMAIL_NOT_VERIFIED,
    TOKEN_EXPIRED,
    TOKEN_INVALID,
    
    // Authorization
    INSUFFICIENT_PERMISSIONS,
    UNAUTHORIZED_ACCESS,
    
    // Other
    DUPLICATE_REQUEST,
    MALFORMED_REQUEST,
    UNKNOWN
}
