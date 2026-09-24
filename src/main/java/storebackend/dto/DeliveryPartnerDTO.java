package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO für Delivery Partner Profile (Response)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryPartnerDTO {
    private Long id;
    private Long userId;
    private String type;

    private String companyName;
    private String contactName;
    private String email;
    private String phone;
    private String whatsapp;
    private String website;
    private String logoUrl;

    // Social Media Links
    private String instagramUrl;
    private String facebookUrl;
    private String tiktokUrl;
    private String linkedinUrl;
    private String youtubeUrl;
    private String twitterUrl;

    private String ice;
    private String rc;
    private String taxId;

    private String description;
    private List<String> services;
    private List<String> vehicleTypes;

    private CoverageDTO coverage;

    private BigDecimal basePriceLocal;
    private BigDecimal basePriceNational;
    private BigDecimal basePriceInternational;
    private String currency;
    private BigDecimal codFeePercent;

    private Integer estimatedLocalHours;
    private Integer estimatedNationalDays;
    private Integer estimatedInternationalDays;
    private BigDecimal maxWeightKg;

    private BigDecimal averageRating;
    private Integer totalReviews;
    private Integer completedDeliveries;

    private Boolean verified;
    private Boolean active;
    private Boolean featured;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CoverageDTO {
        private Boolean morocco;
        private List<String> moroccoRegions;
        private Boolean international;
        private List<String> internationalCountries;
    }
}

