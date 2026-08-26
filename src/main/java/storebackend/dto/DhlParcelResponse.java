package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.entity.DhlParcel;
import storebackend.enums.DhlParcelStatus;

import java.time.LocalDateTime;

/**
 * Response: DHL Parcel DTO
 * 
 * Wird für alle API-Responses verwendet (store, find, pickup, list)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlParcelResponse {
    private Long id;
    private Long storeId;
    private String trackingCode;
    private String shelfLocation;
    private LocalDateTime receivedAt;
    private LocalDateTime pickedUpAt;
    private DhlParcelStatus status;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    /**
     * Factory: Entity -> DTO
     */
    public static DhlParcelResponse fromEntity(DhlParcel entity) {
        DhlParcelResponse dto = new DhlParcelResponse();
        dto.setId(entity.getId());
        dto.setStoreId(entity.getStore().getId());
        dto.setTrackingCode(entity.getTrackingCode());
        dto.setShelfLocation(entity.getShelfLocation());
        dto.setReceivedAt(entity.getReceivedAt());
        dto.setPickedUpAt(entity.getPickedUpAt());
        dto.setStatus(entity.getStatus());
        dto.setNotes(entity.getNotes());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
}
