package storebackend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.BusinessType;

/**
 * App Provisioning Phase 1 (Platform Administration) - minimale Store-Sicht
 * für die Context-Auswahl (STORE-scoped Apps). Bewusst KEINE neue
 * Tenant-/Context-Abstraktion - nur eine schlanke Projektion der
 * bestehenden {@code Store}-Entity für den Admin-Picker.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminStoreSummaryDTO {
    private Long id;
    private String name;
    private String slug;
    private String ownerEmail;
    private BusinessType businessType;
}
