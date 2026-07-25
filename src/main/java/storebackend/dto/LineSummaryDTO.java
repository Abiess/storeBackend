package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Phase 3B-1B: Summary of invoice lines status.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class LineSummaryDTO {
    private int detected;      // Total lines detected
    private int confirmed;     // Lines with status CONFIRMED or MAPPED
    private int mapped;        // Lines with status MAPPED
    private int needsReview;   // Lines with status REVIEW_REQUIRED
}
