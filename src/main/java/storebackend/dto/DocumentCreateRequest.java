package storebackend.dto;

import lombok.Data;

import java.time.LocalDate;

/**
 * DOCUMENTS-App (Phase 1). Request-Body für manuelles Anlegen ({@code POST
 * /api/documents}) sowie den Metadaten-Teil von Datei-Uploads ({@code POST
 * /api/documents/upload}, multipart). Alle Felder außer {@link #title} sind
 * optional - "manuell angelegt ohne Datei" ist ein explizit unterstützter Fall.
 */
@Data
public class DocumentCreateRequest {
    private String title;
    private String category;
    private String note;
    private LocalDate documentDate;
    private LocalDate expiryDate;
}
