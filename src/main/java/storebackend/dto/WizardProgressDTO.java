package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO für Wizard-Fortschritt
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WizardProgressDTO {
    private Long id;
    private Long userId;
    private Integer currentStep;
    private String status;
    private WizardDataDTO data;
    private List<Integer> completedSteps;
    private LocalDateTime lastUpdated;
    private Boolean storeCreated;
    private Long createdStoreId;

    /**
     * Verschachtelte Wizard-Daten
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WizardDataDTO {
        private String storeName;
        private String storeSlug;
        private String description;
        private List<String> selectedCategories;
        private ContactInfoDTO contactInfo;
    }

    /**
     * Kontaktinformationen
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContactInfoDTO {
        private String email;
        private String phone;
        private String address;
        private String city;
        private String postalCode;
    }
}

