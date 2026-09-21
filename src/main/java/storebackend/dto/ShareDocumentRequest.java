package storebackend.dto;

import lombok.Data;

/**
 * DOCUMENTS-App (Phase 1). Request-Body für {@code POST
 * /api/documents/{id}/shares}. Teilen erfolgt bewusst über die E-Mail-Adresse
 * eines BESTEHENDEN markt.ma-Users (kein öffentlicher Share-Link, kein neuer
 * Einladungs-Flow) - siehe {@code storebackend.repository.UserRepository#findByEmail}.
 * {@link #permission} ist optional, MVP kennt ohnehin nur VIEW.
 */
@Data
public class ShareDocumentRequest {
    private String email;
    private String permission;
}
