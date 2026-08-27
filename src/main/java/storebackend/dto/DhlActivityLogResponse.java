package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.entity.DhlActivityLog;
import storebackend.enums.DhlActivityAction;

import java.time.LocalDateTime;

/**
 * DHL Activity Log Response DTO
 * 
 * Phase 3A.2 - Audit Log
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlActivityLogResponse {
    private Long id;
    private Long storeId;
    private Long parcelId;
    private String trackingCode;
    private DhlActivityAction action;
    private String slotSnapshot;
    private Long userId;
    private String userEmail;
    private Long durationMs;
    private LocalDateTime createdAt;
    private String failureReason;
    
    /**
     * Factory: Entity -> DTO
     */
    public static DhlActivityLogResponse fromEntity(DhlActivityLog entity) {
        DhlActivityLogResponse dto = new DhlActivityLogResponse();
        dto.setId(entity.getId());
        dto.setStoreId(entity.getStoreId());
        dto.setParcelId(entity.getParcelId());
        dto.setTrackingCode(entity.getTrackingCode());
        dto.setAction(entity.getAction());
        dto.setSlotSnapshot(entity.getSlotSnapshot());
        dto.setUserId(entity.getUserId());
        dto.setUserEmail(entity.getUserEmail());
        dto.setDurationMs(entity.getDurationMs());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setFailureReason(entity.getFailureReason());
        return dto;
    }
}
