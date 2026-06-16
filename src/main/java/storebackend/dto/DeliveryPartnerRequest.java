package storebackend.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request DTO für Anlegen/Bearbeiten eines Delivery-Partner-Profils
 */
@Data
public class DeliveryPartnerRequest {

    @NotBlank
    private String type; // COMPANY | INDIVIDUAL

    private String companyName;

    @NotBlank
    private String contactName;

    @NotBlank @Email
    private String email;

    @NotBlank
    private String phone;

    private String whatsapp;
    private String website;

    // Social Media Links (optional)
    private String instagramUrl;
    private String facebookUrl;
    private String tiktokUrl;
    private String linkedinUrl;
    private String youtubeUrl;
    private String twitterUrl;

    private String ice;
    private String rc;
    private String taxId;

    @NotBlank
    private String description;

    private List<String> services;
    private List<String> vehicleTypes;

    // Abdeckung
    private DeliveryPartnerDTO.CoverageDTO coverage;

    private BigDecimal basePriceLocal;
    private BigDecimal basePriceNational;
    private BigDecimal basePriceInternational;
    private String currency = "MAD";
    private BigDecimal codFeePercent;

    private Integer estimatedLocalHours;
    private Integer estimatedNationalDays;
    private Integer estimatedInternationalDays;
    private BigDecimal maxWeightKg;
}

