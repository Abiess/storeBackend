package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.StoreStatus;
import storebackend.enums.BusinessType;
import storebackend.enums.CurrencyCode;
import storebackend.enums.PriceMode;
import storebackend.enums.ShippingTaxStrategy;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "stores")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Store {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    // Logo & Banner/Slider Images
    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    @Column(name = "banner_image_url", columnDefinition = "TEXT")
    private String bannerImageUrl;

    @Column(name = "slider_images", columnDefinition = "TEXT")
    private String sliderImages; // JSON array: ["url1", "url2", "url3"]

    // WhatsApp-Kontakt
    @Column(name = "whatsapp_number")
    private String whatsappNumber;

    @Column(name = "greeting_message", columnDefinition = "TEXT")
    private String greetingMessage;

    /**
     * Wenn true: Kunden erhalten WhatsApp-Benachrichtigungen bei Order-Status-Änderungen
     * (analog zu E-Mail-Benachrichtigungen, sofern Kundennummer vorhanden).
     */
    @Column(name = "whatsapp_notifications_enabled", nullable = false)
    private boolean whatsappNotificationsEnabled = false;

    // ─── Social Media & Kontakt-Links ────────────────────────
    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "contact_phone")
    private String contactPhone;

    @Column(name = "telegram_url")
    private String telegramUrl;

    @Column(name = "facebook_url")
    private String facebookUrl;

    @Column(name = "instagram_url")
    private String instagramUrl;

    @Column(name = "tiktok_url")
    private String tiktokUrl;

    @Column(name = "footer_text", columnDefinition = "TEXT")
    private String footerText;

    // ─── Business-Typ & Restaurant/Riad-Felder (MVP) ─────────────
    /**
     * Geschäftstyp des Stores. Default SHOP (= bestehendes Shop-Verhalten).
     * RESTAURANT / RIAD aktivieren das Menü-/Restaurant-Template.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "business_type", length = 20, nullable = false)
    private BusinessType businessType = BusinessType.SHOP;

    /** Öffnungszeiten als einfacher Freitext (MVP, kein JSON). */
    @Column(name = "opening_hours", columnDefinition = "TEXT")
    private String openingHours;

    /** Adresse als Freitext. */
    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    /** Optionaler Google-Maps-Link für den "Route"-Button. */
    @Column(name = "google_maps_url", columnDefinition = "TEXT")
    private String googleMapsUrl;

    /** Prefix für die WhatsApp-Reservierungs-/Bestellnachricht (Restaurant/Riad). */
    @Column(name = "reservation_whatsapp_text", columnDefinition = "TEXT")
    private String reservationWhatsappText;

    // ─── DHL Shipping Address (strukturiert) ────────────────────
    /**
     * DHL Versand-Adresse (Absender bei Label-Erstellung).
     * Separate Felder für DHL API (benötigt street + house_number getrennt).
     */
    @Column(name = "shipping_address_street")
    private String shippingAddressStreet;
    
    @Column(name = "shipping_address_house_number", length = 10)
    private String shippingAddressHouseNumber;
    
    @Column(name = "shipping_address_postal_code", length = 20)
    private String shippingAddressPostalCode;
    
    @Column(name = "shipping_address_city", length = 100)
    private String shippingAddressCity;
    
    @Column(name = "shipping_address_country", length = 2)
    private String shippingAddressCountry;  // ISO 3166-1 alpha-2: "DE", "AT", etc.
    
    @Column(name = "shipping_address_email", length = 100)
    private String shippingAddressEmail;

    // ─── Bot-Schutz-Konfiguration (MVP) ────────────────────────
    /**
     * Bot-Schutz für öffentliche Bestellungen aktiviert.
     * Default: true (Schutz aktiv)
     */
    @Column(name = "bot_protection_enabled", nullable = false)
    private boolean botProtectionEnabled = true;

    /**
     * Modus für Bot-Schutz: OFF | SUSPICIOUS_ONLY | ALWAYS_ON
     * Default: SUSPICIOUS_ONLY
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "bot_protection_mode", length = 20, nullable = false)
    private storebackend.enums.BotProtectionMode botProtectionMode = 
        storebackend.enums.BotProtectionMode.SUSPICIOUS_ONLY;

    // ─── Währungs- und Steuerkonfiguration ────────────────────────
    /**
     * Währung des Stores (ISO 4217)
     * Default: EUR (Euro)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "currency_code", nullable = false, length = 3)
    private CurrencyCode currencyCode = CurrencyCode.EUR;

    /**
     * Land des Stores (ISO 3166-1 alpha-2)
     * Default: DE (Deutschland)
     */
    @Column(name = "country_code", nullable = false, length = 2)
    private String countryCode = "DE";

    /**
     * Preismodell: GROSS (inkl. MwSt.) oder NET (zzgl. MwSt.)
     * Default: GROSS (Bruttopreise für B2C in Deutschland)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "price_mode", nullable = false, length = 10)
    private PriceMode priceMode = PriceMode.GROSS;

    /**
     * Umsatzsteuer aktiviert/deaktiviert
     * Default: true
     * Bei false: Kleinunternehmerregelung oder steuerfrei
     */
    @Column(name = "vat_enabled", nullable = false)
    private Boolean vatEnabled = true;

    /**
     * Standard-Umsatzsteuersatz in Prozent
     * Default: 19.00 (regulärer Steuersatz in Deutschland)
     */
    @Column(name = "default_tax_rate", precision = 5, scale = 2, nullable = false)
    private BigDecimal defaultTaxRate = new BigDecimal("19.00");

    /**
     * Steuersatz für Versandkosten in Prozent
     * Default: 19.00
     */
    @Column(name = "shipping_tax_rate", precision = 5, scale = 2, nullable = false)
    private BigDecimal shippingTaxRate = new BigDecimal("19.00");

    /**
     * Strategie zur Besteuerung der Versandkosten
     * Default: STORE_DEFINED (fester Steuersatz aus shippingTaxRate)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "shipping_tax_strategy", length = 30, nullable = false)
    private ShippingTaxStrategy shippingTaxStrategy = ShippingTaxStrategy.STORE_DEFINED;

    /**
     * Hinweistext für Kleinunternehmer oder Steuerbefreiung
     * Wird auf Rechnungen angezeigt wenn vatEnabled=false
     * Beispiel: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."
     */
    @Column(name = "vat_exemption_text", columnDefinition = "TEXT")
    private String vatExemptionText;

    // ─── Legal/Impressum-Felder ─────────────────────────────────
    /** Offizieller Firmen-/Name (z.B. "Müller GmbH" oder "Max Mustermann") */
    @Column(name = "legal_name", length = 255)
    private String legalName;

    /** Rechtsform (z.B. "GmbH", "UG", "Einzelunternehmen", "e.K.") */
    @Column(name = "legal_form", length = 100)
    private String legalForm;

    /** Vertretungsberechtigte Person (z.B. "Max Mustermann, Geschäftsführer") */
    @Column(name = "authorized_representative", length = 255)
    private String authorizedRepresentative;

    /** Registergericht (z.B. "Amtsgericht Berlin-Charlottenburg") */
    @Column(name = "commercial_register", length = 255)
    private String commercialRegister;

    /** Registernummer (z.B. "HRB 123456 B") */
    @Column(name = "register_number", length = 100)
    private String registerNumber;

    /** Umsatzsteuer-Identifikationsnummer (z.B. "DE123456789") */
    @Column(name = "vat_id", length = 50)
    private String vatId;

    // ─── Legal Responsibility Consent Tracking ─────────────────
    /** Zeitstempel: Wann Store-Owner Verantwortung bestätigt hat */
    @Column(name = "legal_responsibility_accepted_at")
    private LocalDateTime legalResponsibilityAcceptedAt;

    /** User-ID: Wer Verantwortung bestätigt hat (FK zu User) */
    @Column(name = "legal_responsibility_accepted_by_user_id")
    private Long legalResponsibilityAcceptedByUserId;

    /** Consent-Version (z.B. "1.0", "2024-01") für Versionierung */
    @Column(name = "legal_responsibility_version", length = 20)
    private String legalResponsibilityVersion;

    /** Validierung: Ist Impressum vollständig ausgefüllt? */
    @Column(name = "imprint_complete", nullable = false)
    private Boolean imprintComplete = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StoreStatus status = StoreStatus.ACTIVE;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Explizite Getter für Lombok-Kompatibilität
    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public User getOwner() {
        return owner;
    }

    public void setOwner(User owner) {
        this.owner = owner;
    }

    public StoreStatus getStatus() {
        return status;
    }

    public void setStatus(StoreStatus status) {
        this.status = status;
    }
}
