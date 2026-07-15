package storebackend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;

/**
 * E-Mail Domain Validation Service
 * 
 * Blockiert bekannte Wegwerf-E-Mail-Domains und offensichtlich ungültige Domains.
 */
@Service
@Slf4j
public class EmailDomainValidationService {

    @Value("${email.domain.blacklist.enabled:true}")
    private boolean blacklistEnabled;

    // Bekannte Wegwerf-E-Mail-Domains (erweitert bei Bedarf)
    private static final Set<String> DISPOSABLE_DOMAINS = new HashSet<>() {{
        // Top Disposable Email Providers
        add("mailinator.com");
        add("guerrillamail.com");
        add("10minutemail.com");
        add("10minutemail.net");
        add("tempmail.com");
        add("temp-mail.org");
        add("throwaway.email");
        add("trashmail.com");
        add("yopmail.com");
        add("sharklasers.com");
        add("getnada.com");
        add("maildrop.cc");
        add("fakeinbox.com");
        add("emailondeck.com");
        add("mintemail.com");
        add("mytrashmail.com");
        add("mt2014.com");
        add("mt2015.com");
        add("dispostable.com");
        add("spambog.com");
        add("mailnesia.com");
        add("mailcatch.com");
        add("mohmal.com");
        add("anonymbox.com");
        add("burnermail.io");
        add("discard.email");
        add("getairmail.com");
        add("inboxkitten.com");
        add("spam4.me");
        add("tempinbox.com");
        add("throwawaymail.com");
        add("tmailinator.com");
        add("jetable.org");
        add("mailexpire.com");
        add("mailforspam.com");
        add("mailfreeonline.com");
        add("mailmoat.com");
        add("mailslite.com");
        add("meltmail.com");
        add("mintemail.com");
        add("mytemp.email");
        add("noclickemail.com");
        add("nomail.xl.cx");
        add("nullbox.info");
        add("objectmail.com");
        add("oneoffemail.com");
        add("owlpic.com");
        add("recode.me");
        add("spambox.us");
        add("spamgourmet.com");
        add("tempemail.net");
        add("tempmail.de");
        add("tempmailo.com");
        add("tempr.email");
        add("tmail.ws");
        add("trash2009.com");
        add("trashcanmail.com");
        add("trashdevil.com");
        add("trashymail.com");
        add("wegwerfemail.de");
        add("wronghead.com");
    }};

    /**
     * Validiert E-Mail-Domain
     * 
     * @param email E-Mail-Adresse
     * @return ValidationResult mit Status und Grund
     */
    public ValidationResult validate(String email) {
        if (email == null || !email.contains("@")) {
            return new ValidationResult(false, "Invalid email format");
        }

        String domain = extractDomain(email);
        if (domain == null || domain.isBlank()) {
            return new ValidationResult(false, "Missing domain");
        }

        // Blacklist-Check
        if (blacklistEnabled && isDisposableDomain(domain)) {
            log.warn("🚫 Disposable email domain blocked: {}", domain);
            return new ValidationResult(false, "Disposable email addresses are not allowed");
        }

        // Offensichtlich ungültige Domains
        if (isObviouslyInvalid(domain)) {
            log.warn("🚫 Invalid domain blocked: {}", domain);
            return new ValidationResult(false, "Invalid email domain");
        }

        return new ValidationResult(true, null);
    }

    /**
     * Prüft ob Domain in Blacklist
     */
    private boolean isDisposableDomain(String domain) {
        String normalized = domain.toLowerCase().trim();
        
        // Exakte Übereinstimmung
        if (DISPOSABLE_DOMAINS.contains(normalized)) {
            return true;
        }

        // Wildcard-Muster (z.B. *.tempmail.*)
        for (String blocked : DISPOSABLE_DOMAINS) {
            if (normalized.contains(blocked.replace(".com", "").replace(".net", "").replace(".org", ""))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Prüft offensichtlich ungültige Domains
     */
    private boolean isObviouslyInvalid(String domain) {
        // Keine TLD
        if (!domain.contains(".")) {
            return true;
        }

        // Zu kurz
        if (domain.length() < 4) {
            return true;
        }

        // Test/Example Domains
        if (domain.equals("example.com") || domain.equals("test.com") || 
            domain.equals("localhost") || domain.equals("invalid.com")) {
            return true;
        }

        // IP-Adressen (sollten nicht als E-Mail-Domain verwendet werden)
        if (domain.matches("\\d+\\.\\d+\\.\\d+\\.\\d+")) {
            return true;
        }

        return false;
    }

    /**
     * Extrahiert Domain aus E-Mail
     */
    private String extractDomain(String email) {
        if (email == null || !email.contains("@")) {
            return null;
        }
        return email.substring(email.lastIndexOf("@") + 1).toLowerCase().trim();
    }

    /**
     * Validation Result DTO
     */
    public record ValidationResult(boolean valid, String reason) {}
}
