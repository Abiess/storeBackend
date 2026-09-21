package storebackend.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * DOCUMENTS-App (Phase 1). Repräsentiert einen {@code DocumentShare} in
 * API-Responses (Owner-Sicht: "mit wem habe ich dieses Dokument geteilt?").
 */
@Data
public class DocumentShareDTO {
    private Long id;
    private Long documentId;
    private Long sharedWithUserId;
    private String sharedWithUserEmail;
    private String permission;
    private LocalDateTime createdAt;
}
