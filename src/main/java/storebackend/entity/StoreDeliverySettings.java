package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * Store-wide delivery configuration settings
 * Inkludiert DHL Integration Settings (store-spezifisch)
 */
@Entity
@Table(name = "store_delivery_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoreDeliverySettings {

    @Id
    @Column(name = "store_id")
    private Long storeId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "store_id")
    private Store store;

    @Column(name = "pickup_enabled", nullable = false)
    private Boolean pickupEnabled = true;

    @Column(name = "delivery_enabled", nullable = false)
    private Boolean deliveryEnabled = false;

    @Column(name = "express_enabled", nullable = false)
    private Boolean expressEnabled = false;

    @Column(name = "currency", length = 3, nullable = false)
    private String currency = "EUR";

    // ════════════════════════════════════════════════════════════
    // DHL INTEGRATION SETTINGS (Store-spezifisch)
    // ════════════════════════════════════════════════════════════
    
    @Column(name = "dhl_enabled")
    private Boolean dhlEnabled = false;
    
    @Column(name = "dhl_environment", length = 20)
    private String dhlEnvironment; // SANDBOX | PRODUCTION
    
    @Column(name = "dhl_client_id", length = 500)
    private String dhlClientId;
    
    @Column(name = "dhl_client_secret", length = 500)
    private String dhlClientSecret; // TODO: Encrypt
    
    @Column(name = "dhl_username", length = 255)
    private String dhlUsername;
    
    @Column(name = "dhl_password", length = 500)
    private String dhlPassword; // TODO: Encrypt
    
    @Column(name = "dhl_billing_number", length = 100)
    private String dhlBillingNumber;
    
    // Shipper Address (Absender)
    @Column(name = "dhl_shipper_name", length = 255)
    private String dhlShipperName;
    
    @Column(name = "dhl_shipper_street", length = 255)
    private String dhlShipperStreet;
    
    @Column(name = "dhl_shipper_house_number", length = 50)
    private String dhlShipperHouseNumber;
    
    @Column(name = "dhl_shipper_postal_code", length = 20)
    private String dhlShipperPostalCode;
    
    @Column(name = "dhl_shipper_city", length = 100)
    private String dhlShipperCity;
    
    @Column(name = "dhl_shipper_country", length = 2)
    private String dhlShipperCountry; // ISO 3166-1 alpha-2 (DE, AT, etc.)
    
    @Column(name = "dhl_shipper_email", length = 255)
    private String dhlShipperEmail;
    
    @Column(name = "dhl_shipper_phone", length = 50)
    private String dhlShipperPhone;
    
    // Default Package Dimensions
    // WICHTIG: Gewicht in GRAMM speichern, nicht in kg!
    // UI sollte kg anzeigen, aber als Gramm speichern:
    //   - UI zeigt "1 kg" → speichert 1000g
    //   - UI zeigt "0.5 kg" → speichert 500g
    // Minimum für DHL: 100g (wird sonst als Fehler behandelt)
    @Column(name = "dhl_default_weight_grams")
    private Integer dhlDefaultWeightGrams;
    
    @Column(name = "dhl_default_length_mm")
    private Integer dhlDefaultLengthMm;
    
    @Column(name = "dhl_default_width_mm")
    private Integer dhlDefaultWidthMm;
    
    @Column(name = "dhl_default_height_mm")
    private Integer dhlDefaultHeightMm;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
