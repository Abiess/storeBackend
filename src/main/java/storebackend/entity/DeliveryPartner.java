package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Delivery Partner Profile – Plattformweites Portfolio für Lieferanten.
 * Jeder User kann EIN Profil als Delivery-Partner anlegen.
 * Andere Store-Besitzer können diesen Partner finden, bewerten und beauftragen.
 */
@Entity
@Table(name = "delivery_partners", indexes = {
    @Index(name = "idx_dp_user", columnList = "user_id", unique = true),
    @Index(name = "idx_dp_active", columnList = "active"),
    @Index(name = "idx_dp_type", columnList = "partner_type"),
    @Index(name = "idx_dp_rating", columnList = "average_rating")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryPartner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "partner_type", nullable = false, length = 20)
    private String type; // COMPANY | INDIVIDUAL

    @Column(name = "company_name", columnDefinition = "TEXT")
    private String companyName;

    @Column(name = "contact_name", nullable = false, columnDefinition = "TEXT")
    private String contactName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String email;

    @Column(nullable = false, length = 30)
    private String phone;

    @Column(length = 30)
    private String whatsapp;

    private String website;

    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    /** MinIO-Objektpfad des Logos – permanent gespeichert, URL wird on-the-fly generiert */
    @Column(name = "logo_object_name", columnDefinition = "TEXT")
    private String logoObjectName;

    // Social Media Links
    @Column(name = "instagram_url", columnDefinition = "TEXT")
    private String instagramUrl;

    @Column(name = "facebook_url", columnDefinition = "TEXT")
    private String facebookUrl;

    @Column(name = "tiktok_url", columnDefinition = "TEXT")
    private String tiktokUrl;

    @Column(name = "linkedin_url", columnDefinition = "TEXT")
    private String linkedinUrl;

    @Column(name = "youtube_url", columnDefinition = "TEXT")
    private String youtubeUrl;

    @Column(name = "twitter_url", columnDefinition = "TEXT")
    private String twitterUrl;

    // Geschäftsdaten (Marokko)
    @Column(length = 20)
    private String ice; // Identifiant Commun de l'Entreprise

    @Column(length = 30)
    private String rc; // Registre de Commerce

    @Column(name = "tax_id", length = 30)
    private String taxId;

    @Column(columnDefinition = "TEXT")
    private String description;

    // Services (als komma-getrennte Strings gespeichert)
    @Column(name = "services", length = 500)
    private String services; // EXPRESS,STANDARD,COD,...

    @Column(name = "vehicle_types", length = 300)
    private String vehicleTypes; // MOTORCYCLE,VAN,TRUCK,...

    // Abdeckung
    @Column(name = "coverage_morocco")
    private Boolean coverageMorocco = true;

    @Column(name = "morocco_regions", length = 1000)
    private String moroccoRegions; // komma-getrennt

    @Column(name = "coverage_international")
    private Boolean coverageInternational = false;

    @Column(name = "international_countries", length = 500)
    private String internationalCountries; // FR,ES,DE,...

    // Preise
    @Column(name = "base_price_local", precision = 10, scale = 2)
    private BigDecimal basePriceLocal;

    @Column(name = "base_price_national", precision = 10, scale = 2)
    private BigDecimal basePriceNational;

    @Column(name = "base_price_international", precision = 10, scale = 2)
    private BigDecimal basePriceInternational;

    @Column(length = 5)
    private String currency = "MAD";

    @Column(name = "cod_fee_percent", precision = 5, scale = 2)
    private BigDecimal codFeePercent;

    // SLAs
    @Column(name = "estimated_local_hours")
    private Integer estimatedLocalHours;

    @Column(name = "estimated_national_days")
    private Integer estimatedNationalDays;

    @Column(name = "estimated_international_days")
    private Integer estimatedInternationalDays;

    @Column(name = "max_weight_kg", precision = 8, scale = 2)
    private BigDecimal maxWeightKg;

    // Bewertungen (berechnet / denormalisiert)
    @Column(name = "average_rating", precision = 3, scale = 2)
    private BigDecimal averageRating = BigDecimal.ZERO;

    @Column(name = "total_reviews")
    private Integer totalReviews = 0;

    @Column(name = "completed_deliveries")
    private Integer completedDeliveries = 0;

    // Status
    @Column(nullable = false)
    private Boolean verified = false;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(nullable = false)
    private Boolean featured = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
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

    // ─── Helpers: String-Felder als Listen ───
    public List<String> getServicesList() {
        if (services == null || services.isBlank()) return List.of();
        return List.of(services.split(","));
    }

    public void setServicesList(List<String> list) {
        this.services = list != null ? String.join(",", list) : null;
    }

    public List<String> getVehicleTypesList() {
        if (vehicleTypes == null || vehicleTypes.isBlank()) return List.of();
        return List.of(vehicleTypes.split(","));
    }

    public void setVehicleTypesList(List<String> list) {
        this.vehicleTypes = list != null ? String.join(",", list) : null;
    }

    public List<String> getMoroccoRegionsList() {
        if (moroccoRegions == null || moroccoRegions.isBlank()) return List.of();
        return List.of(moroccoRegions.split(","));
    }

    public void setMoroccoRegionsList(List<String> list) {
        this.moroccoRegions = list != null ? String.join(",", list) : null;
    }

    public List<String> getInternationalCountriesList() {
        if (internationalCountries == null || internationalCountries.isBlank()) return List.of();
        return List.of(internationalCountries.split(","));
    }

    public void setInternationalCountriesList(List<String> list) {
        this.internationalCountries = list != null ? String.join(",", list) : null;
    }
}

