package storebackend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.AppKey;
import storebackend.enums.AppScope;

import java.time.LocalDateTime;

/**
 * App Provisioning Phase 1 (Platform Administration) - vollständige Sicht
 * auf einen einzelnen {@code UserAppEntitlement}-Datensatz für die
 * Platform-Admin-UI (inkl. {@code id} für das gezielte PATCH/enable-toggle
 * und {@code scope}, damit das Frontend nicht erneut hart codieren muss, ob
 * eine App STORE- oder GLOBAL-scoped ist - das kommt 1:1 aus {@link AppKey#getScope()}).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminEntitlementDTO {
    private Long id;
    private AppKey app;
    private AppScope scope;
    /** null bei GLOBAL-Scope-Apps. */
    private Long storeId;
    private String storeName;
    private boolean enabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
