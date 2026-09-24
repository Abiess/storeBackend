package storebackend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.AppAccessMode;

/**
 * App Provisioning Phase 1 (Platform Administration) - schlanke
 * Benutzer-Projektion für die Admin-Suche ({@code GET
 * /api/admin/app-provisioning/users?query=...}). Bewusst OHNE sensible
 * Felder (kein Passwort-Hash, keine Tokens, keine Adressen etc.) - nur was
 * die Platform-Admin-UI zur Auswahl eines Users tatsächlich benötigt.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserSummaryDTO {
    private Long id;
    private String email;
    private String name;
    /** Aktueller, userweiter Zugriffsmodus (LEGACY oder MANAGED) - siehe {@code AppAccessChecker}. */
    private AppAccessMode appAccessMode;
}
