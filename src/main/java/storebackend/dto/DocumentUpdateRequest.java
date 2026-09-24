package storebackend.dto;

import lombok.Data;

import java.time.LocalDate;

/**
 * DOCUMENTS-App (Phase 1). Request-Body für {@code PUT /api/documents/{id}}
 * (Titel/Kategorie/Notiz/Datum/Ablaufdatum ändern - nur Owner).
 */
@Data
public class DocumentUpdateRequest {
    private String title;
    private String category;
    private String note;
    private LocalDate documentDate;
    private LocalDate expiryDate;
}
