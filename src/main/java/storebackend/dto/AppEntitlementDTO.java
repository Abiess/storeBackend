package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.AppKey;

/**
 * App-Entitlement-Konzept (Phase 1) - additive Roh-Abbildung eines
 * {@code UserAppEntitlement}-Eintrags für die Auth-Response.
 *
 * Enthält bewusst NUR die tatsächlich in der DB vorhandenen expliziten
 * Einträge - keine implizite Auffüllung mit "false" für nicht konfigurierte
 * Apps/Stores (das würde LEGACY-User fälschlich wie MANAGED aussehen lassen).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppEntitlementDTO {
    private AppKey app;
    private Long storeId; // null bei GLOBAL-Scope-Apps
    private boolean enabled;
}
