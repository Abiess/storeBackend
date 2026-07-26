package storebackend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Request to split an invoice line at a text position.
 */
public class SplitLineRequest {
    @NotNull
    @Min(0)
    private Integer splitPosition; // Character index in description where to split
    
    public Integer getSplitPosition() {
        return splitPosition;
    }
    
    public void setSplitPosition(Integer splitPosition) {
        this.splitPosition = splitPosition;
    }
}
