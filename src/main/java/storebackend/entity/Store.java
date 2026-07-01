package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.StoreStatus;
import storebackend.enums.BusinessType;

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
    @Column(name = "whatsapp_notifications_enabled", nullable = false,
            columnDefinition = "boolean default false")
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
    @Column(name = "business_type", nullable = false,
            columnDefinition = "varchar(20) default 'SHOP'")
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
    @Column(name = "bot_protection_enabled", nullable = false,
            columnDefinition = "boolean default true")
    private boolean botProtectionEnabled = true;

    /**
     * Modus für Bot-Schutz: OFF | SUSPICIOUS_ONLY | ALWAYS_ON
     * Default: SUSPICIOUS_ONLY
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "bot_protection_mode", nullable = false,
            columnDefinition = "varchar(20) default 'SUSPICIOUS_ONLY'")
    private storebackend.enums.BotProtectionMode botProtectionMode = 
        storebackend.enums.BotProtectionMode.SUSPICIOUS_ONLY;

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
