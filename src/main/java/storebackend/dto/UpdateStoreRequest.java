package storebackend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO für Store-Updates
 * Im Gegensatz zu CreateStoreRequest ist das slug-Feld optional,
 * da es normalerweise nicht nachträglich geändert wird
 */
@Data
public class UpdateStoreRequest {
    @NotBlank(message = "Name darf nicht leer sein")
    private String name;

    // Slug ist optional beim Update - wird nur geändert wenn explizit gesetzt
    private String slug;

    // Beschreibung ist optional
    private String description;

    // Status – optional, null = nicht ändern
    private String status;

    // WhatsApp-Kontaktdaten – optional, null = nicht ändern
    private String whatsappNumber;
    private Boolean whatsappNotificationsEnabled;
    private String greetingMessage;

    // ─── Social Media & Kontakt-Links ─────────────────────
    private String contactEmail;
    private String contactPhone;
    private String telegramUrl;
    private String facebookUrl;
    private String instagramUrl;
    private String tiktokUrl;
    private String footerText;

    // ─── Business-Typ & Restaurant/Riad-Felder – optional, null = nicht ändern ─
    /** SHOP | RESTAURANT | RIAD (als String, wird im Service zu Enum geparst) */
    private String businessType;
    private String openingHours;
    private String address;
    private String googleMapsUrl;
    private String reservationWhatsappText;

    // ─── Bot-Schutz – optional, null = nicht ändern ─
    /** Bot-Schutz aktiviert (true) oder deaktiviert (false) */
    private Boolean botProtectionEnabled;
    /** OFF | SUSPICIOUS_ONLY | ALWAYS_ON */
    private String botProtectionMode;

    // ─── Währung & Steuern – optional, null = nicht ändern ─
    /** Währung: EUR, MAD, USD, GBP */
    private String currencyCode;
    /** Land: DE, MA, etc. */
    private String countryCode;
    /** Preismodus: GROSS oder NET */
    private String priceMode;
    /** USt aktiv */
    private Boolean vatEnabled;
    /** Standard-Steuersatz */
    private java.math.BigDecimal defaultTaxRate;
    /** Versand-Steuersatz */
    private java.math.BigDecimal shippingTaxRate;
    /** Versandsteuer-Strategie: STORE_DEFINED, PROPORTIONAL_TO_CART, STANDARD_RATE */
    private String shippingTaxStrategy;
    /** Kleinunternehmer-Text: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet." */
    private String vatExemptionText;

    // ─── Legal/Impressum ─────────────────────────────────────
    /** Offizieller Firmenname (z.B. "Müller GmbH" oder "Max Mustermann") */
    private String legalName;
    /** Rechtsform (z.B. "GmbH", "UG", "Einzelunternehmen") */
    private String legalForm;
    /** Vertretungsberechtigte Person (z.B. "Max Mustermann, Geschäftsführer") */
    private String authorizedRepresentative;
    /** Registergericht (z.B. "Amtsgericht Berlin-Charlottenburg") */
    private String commercialRegister;
    /** Registernummer (z.B. "HRB 123456 B") */
    private String registerNumber;
    /** Umsatzsteuer-Identifikationsnummer (z.B. "DE123456789") */
    private String vatId;

    // ─── Legal Consent (nur für Owner-Ansicht, nicht für Public) ──
    /** Zeitstempel: Wann Store-Owner rechtliche Verantwortung bestätigt hat */
    private java.time.LocalDateTime legalResponsibilityAcceptedAt;
    /** Consent-Version (z.B. "1.0") */
    private String legalResponsibilityVersion;

    // ─── Legal Texts (store-specific) ──────────────────────────
    /** AGB des Stores */
    private String termsAndConditionsText;
    /** Status der AGB (für Admin, nicht für Veröffentlichungs-Aktionen) */
    private String termsAndConditionsStatus;
    
    /** Datenschutzerklärung des Stores */
    private String privacyPolicyText;
    /** Status der Datenschutzerklärung */
    private String privacyPolicyStatus;
    
    /** Rückgaberecht / Widerrufsbelehrung */
    private String returnPolicyText;
    /** Status der Rückgabebedingungen */
    private String returnPolicyStatus;
    
    /** Versandinformationen / Lieferbedingungen */
    private String shippingPolicyText;
    /** Status der Versandbedingungen */
    private String shippingPolicyStatus;
    
    /**
     * Consent-Flag: Wurde rechtliche Verantwortung bestätigt?
     * WICHTIG: Wird bei Veröffentlichungs-Aktionen automatisch gesetzt,
     * NICHT vom Frontend direkt editierbar
     */
    private Boolean legalResponsibilityAccepted;
}
