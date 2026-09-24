package storebackend.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DOCUMENTS-App (Phase 1). Repräsentiert ein {@code UserDocument} in
 * API-Responses, egal ob es aus "Meine Dokumente" oder "Mit mir geteilt"
 * stammt (siehe {@link #sharedWithMe} / {@link #permission}).
 */
@Data
public class DocumentDTO {
    private Long id;
    private Long ownerUserId;
    private String ownerEmail;
    private String title;
    private String category;
    private String note;
    private LocalDate documentDate;
    private LocalDate expiryDate;
    private boolean hasFile;
    private String originalFilename;
    private String mimeType;
    private Long size;
    private String extractedText;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** true, wenn der aufrufende User NICHT der Owner ist (Tab "Mit mir geteilt"). */
    private boolean sharedWithMe;

    /** Berechtigung des aufrufenden Users, falls {@link #sharedWithMe}=true (MVP: immer VIEW). */
    private String permission;
}
