package storebackend.dto;

import lombok.Data;

/**
 * Request for confirming a field correction (Phase 3A).
 */
@Data
public class ConfirmSupplierCorrectionRequest {
    private String rawValue;
    private String correctedValue;
    private boolean rememberForFuture = true;
}
