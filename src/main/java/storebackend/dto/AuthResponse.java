package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.AppAccessMode;

import java.util.List;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private UserDTO user;

    @Data
    @NoArgsConstructor
    public static class UserDTO {
        private Long id;
        private String email;
        private String name;
        private String role;
        private List<String> roles;

        /**
         * App-Entitlement-Konzept (Phase 1) - additive Felder, siehe
         * {@code storebackend.util.AppAccessChecker} und {@code AppEntitlementDTO}.
         * LEGACY/MANAGED wird userweit (nicht pro App) ermittelt.
         * "apps" ist bewusst nur die Rohliste der EXPLIZITEN Entitlement-Einträge
         * (keine implizite Auffüllung).
         */
        private AppAccessMode appAccessMode;
        private List<AppEntitlementDTO> apps;

        /**
         * Additive Felder, die zuvor NUR von `GET /api/auth/me` (separates,
         * mittlerweile entferntes {@code UserInfoResponse}-DTO) geliefert
         * wurden. Damit `/me` beim Umstieg auf dieses gemeinsame DTO
         * (siehe {@code AuthService#buildUserDTO}) keine bestehenden Felder
         * verliert, stehen sie hier ebenfalls zur Verfuegung (bei `/login`
         * ebenfalls befuellt - rein additiv, aendert das Verhalten
         * bestehender Konsumenten nicht).
         */
        private String createdAt;
        private String updatedAt;

        /**
         * Bestehender Konstruktor (VOR Phase 1) - bleibt unverändert erhalten,
         * damit bestehende Aufrufstellen (z.B. PhoneAuthController), die nur
         * die ursprünglichen 5 Felder kennen, ohne Anpassung weiter kompilieren.
         * appAccessMode/apps bleiben in diesem Fall null (additiv, kein
         * Verhaltensunterschied für diese Aufrufstellen).
         */
        public UserDTO(Long id, String email, String name, String role, List<String> roles) {
            this(id, email, name, role, roles, null, null);
        }

        /**
         * Erweiterter Konstruktor inkl. App-Entitlement-Konzept (Phase 1),
         * verwendet von {@code AuthService#login}.
         */
        public UserDTO(Long id, String email, String name, String role, List<String> roles,
                       AppAccessMode appAccessMode, List<AppEntitlementDTO> apps) {
            this.id = id;
            this.email = email;
            this.name = name;
            this.role = role;
            this.roles = roles;
            this.appAccessMode = appAccessMode;
            this.apps = apps;
        }
    }
}
