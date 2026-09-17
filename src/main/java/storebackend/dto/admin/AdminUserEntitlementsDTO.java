package storebackend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.AppAccessMode;

/**
 * App Provisioning Phase 1 (Platform Administration) - Ergebnis-Wrapper für
 * "alle Entitlements eines Users" inkl. des userweiten AppAccessMode. Der
 * Modus wird explizit mitgeliefert, damit die Platform-Admin-UI den
 * LEGACY-Warnhinweis anzeigen kann, BEVOR das erste Entitlement gespeichert
 * wird (siehe ARCHITECTURE_APP_FACTORY.md Abschnitt 14).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserEntitlementsDTO {
    private Long userId;
    private String userEmail;
    private AppAccessMode appAccessMode;
    private java.util.List<AdminEntitlementDTO> entitlements;
}
