package storebackend.dto;

import lombok.Data;
import storebackend.enums.StoreStatus;
import storebackend.enums.BusinessType;
import storebackend.enums.CurrencyCode;
import storebackend.enums.PriceMode;
import storebackend.enums.ShippingTaxStrategy;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class StoreDTO {
    private Long id;
    private String name;
    private String slug;
    private String description;
    private String logoUrl;
    private String bannerImageUrl;
    private StoreStatus status;
    private LocalDateTime createdAt;
    private String whatsappNumber;
    private boolean whatsappNotificationsEnabled;
    private String greetingMessage;
    // ─── Social & Kontakt ─────────────────────────────────
    private String contactEmail;
    private String contactPhone;
    private String telegramUrl;
    private String facebookUrl;
    private String instagramUrl;
    private String tiktokUrl;
    private String footerText;
    // ─── Business-Typ & Restaurant/Riad-Felder ─────────────
    private BusinessType businessType;
    private String openingHours;
    private String address;
    private String googleMapsUrl;
    private String reservationWhatsappText;

    // ─── Bot-Schutz (nur für Admin-Bereich, NICHT öffentlich) ─
    private boolean botProtectionEnabled;
    private storebackend.enums.BotProtectionMode botProtectionMode;

    // ─── Währung & Steuern ─────────────────────────────────
    private CurrencyCode currencyCode;
    private String countryCode;
    private PriceMode priceMode;
    private Boolean vatEnabled;
    private BigDecimal defaultTaxRate;
    private BigDecimal shippingTaxRate;
    private ShippingTaxStrategy shippingTaxStrategy;
    private String vatExemptionText;

    // ─── Legal/Impressum (NICHT öffentlich, nur für Admin) ──────
    private String legalName;
    private String legalForm;
    private String authorizedRepresentative;
    private String commercialRegister;
    private String registerNumber;
    private String vatId;
    private LocalDateTime legalResponsibilityAcceptedAt;
    private Long legalResponsibilityAcceptedByUserId;
    private String legalResponsibilityVersion;
    private Boolean imprintComplete;
}
