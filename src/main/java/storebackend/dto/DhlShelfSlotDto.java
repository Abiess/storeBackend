package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DHL Shelf Slot DTO (Phase 3A.5)
 * 
 * Simple Slot ohne Layout-Information
 * Für Fachverwaltung / Liste
 * 
 * Enthält:
 * - Fach-Stammdaten
 * - Belegungsinformation (occupiedCount)
 * - KEINE Grid-Position (das ist DhlShelfSlotLayoutDto)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlShelfSlotDto {
    
    private Long id;
    private Long storeId;
    private String code;
    private Integer capacity;
    private Integer sortOrder;
    private Boolean active;
    private String description;
    
    /**
     * Anzahl eingelagerter Pakete
     * 
     * Berechnet: COUNT(DhlParcel WHERE shelfSlot.id = X AND status = 'STORED')
     */
    private Long occupiedCount;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
