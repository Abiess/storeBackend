package storebackend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateStoreRequest {
    @NotBlank
    private String name;

    @NotBlank
    private String slug;

    private String description;

    private String category; // Kategorie für Slider-Initialisierung (z.B. "fashion", "electronics", "food", "general")

    /** WhatsApp-Nummer des Store-Inhabers (für Bestellbenachrichtigungen an Owner). */
    private String whatsappNumber;

    /** Wenn true: Kunden erhalten WA-Nachrichten bei Bestellungen & Status-Updates. */
    private boolean whatsappNotificationsEnabled = false;

    /** Geschäftstyp: SHOP | RESTAURANT | RIAD. Default SHOP wenn null/leer. */
    private String businessType;

    /**
     * Wenn true und businessType = RESTAURANT/RIAD: Store wird mit dem passenden
     * Starter-Pack (Kategorien/Produkte/Carousel) vorbefüllt.
     */
    private boolean seedSampleData = false;

    // ─── Währung & Steuern (optional - Defaults in Entity) ─────
    /** Währung: EUR (default), MAD, USD, GBP */
    private String currencyCode;
    /** Land: DE (default), MA, etc. */
    private String countryCode;
    /** Preismodus: GROSS (default) oder NET */
    private String priceMode;
    /** USt aktiv: true (default) */
    private Boolean vatEnabled;
    /** Standard-Steuersatz: 19.00 (default) */
    private BigDecimal defaultTaxRate;
    /** Versand-Steuersatz: 19.00 (default) */
    private BigDecimal shippingTaxRate;
    /** Versandsteuer-Strategie: STORE_DEFINED (default) */
    private String shippingTaxStrategy;
}
