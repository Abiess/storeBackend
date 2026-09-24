package storebackend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.AppKey;

/**
 * App Provisioning Phase 1 (Platform Administration) - Request-Body für
 * {@code PUT /api/admin/app-provisioning/users/{userId}/entitlements}
 * (Upsert eines einzelnen Entitlements). Scope-Konsistenz (STORE-Apps
 * benötigen storeId, GLOBAL-Apps dürfen keine haben) wird serverseitig in
 * {@code AppProvisioningService} geprüft (siehe dortige Validierung -
 * bewusst NICHT über {@code AppAccessChecker}, der bleibt unangetastet).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpsertEntitlementRequest {
    private AppKey app;
    /** Erforderlich bei STORE-Scope-Apps, MUSS null sein bei GLOBAL-Scope-Apps. */
    private Long storeId;
    private boolean enabled;
}
