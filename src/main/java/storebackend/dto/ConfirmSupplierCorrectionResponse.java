package storebackend.dto;

import lombok.Data;
import storebackend.enums.SupplierCorrectionFieldType;

/**
 * Response for confirmed field correction (Phase 3A).
 */
@Data
public class ConfirmSupplierCorrectionResponse {
    private SupplierCorrectionFieldType fieldType;
    private String rawValue;
    private String correctedValue;
    private Integer confirmationCount;
    private Boolean active;
}
