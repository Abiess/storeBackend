package storebackend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * App Provisioning Phase 1 (Platform Administration) - Request-Body für
 * {@code PATCH /api/admin/app-provisioning/users/{userId}/entitlements/{id}}
 * (nur das enabled-Flag togglen - Soft-Disable statt physischem DELETE,
 * konsistent mit dem bestehenden Soft-Delete-Pattern der Entity).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PatchEntitlementRequest {
    private boolean enabled;
}
