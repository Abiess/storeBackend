package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.CreateTeamInvitationRequest;
import storebackend.dto.TeamInvitationDTO;
import storebackend.entity.StoreRole;
import storebackend.entity.TeamInvitation;
import storebackend.entity.User;
import storebackend.repository.StoreRoleRepository;
import storebackend.repository.TeamInvitationRepository;
import storebackend.service.TeamInvitationService;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class TeamInvitationController {

    private final TeamInvitationService invitationService;
    private final StoreRoleRepository storeRoleRepository;
    private final TeamInvitationRepository invitationRepository;

    /**
     * Neue Team-Einladung erstellen
     * Nur Owner oder Admin erlaubt
     */
    @PostMapping("/stores/{storeId}/team-invitations")
    public ResponseEntity<TeamInvitationDTO> createInvitation(
            @PathVariable Long storeId,
            @RequestBody CreateTeamInvitationRequest request,
            @AuthenticationPrincipal User user
    ) {
        log.info("📨 Create invitation request: store={}, email={}, role={}, by={}",
                storeId, request.email, request.role, user.getId());

        // Berechtigung prüfen
        requireOwnerOrAdmin(storeId, user);

        // STORE_OWNER darf nicht über Einladung vergeben werden
        if ("STORE_OWNER".equals(request.role)) {
            log.warn("⚠️ Attempted to invite as STORE_OWNER: store={}, by={}", storeId, user.getId());
            throw new IllegalArgumentException("STORE_OWNER kann nicht über Einladung vergeben werden");
        }

        // Einladung erstellen
        TeamInvitationDTO invitation = invitationService.createInvitation(storeId, request, user);
        
        log.info("✅ Invitation created: id={}, store={}, email={}", 
                invitation.id, storeId, request.email);
        
        return ResponseEntity.ok(invitation);
    }

    /**
     * Alle Einladungen eines Stores abrufen
     * Nur Owner oder Admin erlaubt
     */
    @GetMapping("/stores/{storeId}/team-invitations")
    public ResponseEntity<List<TeamInvitationDTO>> getInvitations(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user
    ) {
        // Berechtigung prüfen
        requireOwnerOrAdmin(storeId, user);

        List<TeamInvitationDTO> invitations = invitationService.getInvitations(storeId);
        return ResponseEntity.ok(invitations);
    }

    /**
     * Einladung widerrufen
     * Nur Owner oder Admin erlaubt
     */
    @PostMapping("/stores/{storeId}/team-invitations/{invitationId}/revoke")
    public ResponseEntity<Void> revokeInvitation(
            @PathVariable Long storeId,
            @PathVariable Long invitationId,
            @AuthenticationPrincipal User user
    ) {
        log.info("🚫 Revoke invitation: store={}, invitation={}, by={}", 
                storeId, invitationId, user.getId());

        // Berechtigung prüfen
        requireOwnerOrAdmin(storeId, user);

        invitationService.revokeInvitation(invitationId, user);
        
        log.info("✅ Invitation revoked: id={}", invitationId);
        return ResponseEntity.ok().build();
    }

    /**
     * Einladung erneut senden
     * Nur Owner oder Admin erlaubt
     */
    @PostMapping("/stores/{storeId}/team-invitations/{invitationId}/resend")
    public ResponseEntity<Void> resendInvitation(
            @PathVariable Long storeId,
            @PathVariable Long invitationId,
            @AuthenticationPrincipal User user
    ) {
        log.info("🔄 Resend invitation: store={}, invitation={}, by={}", 
                storeId, invitationId, user.getId());

        // Berechtigung prüfen
        requireOwnerOrAdmin(storeId, user);

        invitationService.resendInvitation(invitationId, user);
        
        log.info("✅ Invitation resent: id={}", invitationId);
        return ResponseEntity.ok().build();
    }

    /**
     * Einladung akzeptieren (PUBLIC ENDPOINT!)
     * POST-Methode um Token nicht in URL zu haben
     */
    @PostMapping("/team-invitations/accept")
    public ResponseEntity<Map<String, Object>> acceptInvitation(
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal User user
    ) {
        if (user == null) {
            log.warn("⚠️ Accept invitation without authentication");
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Bitte melden Sie sich an oder registrieren Sie sich"));
        }

        String token = payload.get("token");
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Token fehlt"));
        }

        log.info("✅ Accept invitation: token={}, user={}", 
                token.substring(0, Math.min(8, token.length())), user.getId());

        try {
            invitationService.acceptInvitation(token, user);
            
            log.info("✅ Invitation accepted successfully: user={}", user.getId());
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Einladung erfolgreich angenommen"
            ));
            
        } catch (RuntimeException e) {
            log.error("❌ Accept invitation failed: user={}, error={}", 
                    user.getId(), e.getMessage());
            
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Prüfen ob Benutzer Owner oder Admin des Stores ist
     */
    private void requireOwnerOrAdmin(Long storeId, User user) {
        StoreRole role = storeRoleRepository.findByStoreIdAndUserId(storeId, user.getId())
                .orElseThrow(() -> {
                    log.warn("⚠️ Access denied: store={}, user={} (no role)", storeId, user.getId());
                    return new AccessDeniedException("Keine Berechtigung für diesen Store");
                });

        if (!isOwnerOrAdmin(role.getRole())) {
            log.warn("⚠️ Access denied: store={}, user={}, role={}", 
                    storeId, user.getId(), role.getRole());
            throw new AccessDeniedException("Nur Owner oder Admin dürfen Einladungen verwalten");
        }
    }

    /**
     * Prüfen ob Rolle Owner oder Admin ist
     */
    private boolean isOwnerOrAdmin(String roleStr) {
        return "STORE_OWNER".equals(roleStr) || "STORE_ADMIN".equals(roleStr);
    }

    /**
     * Einladungs-Vorschau für nicht-eingeloggte Benutzer (PUBLIC!)
     */
    @GetMapping("/team-invitations/preview")
    public ResponseEntity<Map<String, Object>> previewInvitation(@RequestParam String token) {
        String tokenHash = hashToken(token);
        
        TeamInvitation invitation = invitationRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new RuntimeException("Ungültiger Einladungslink"));
        
        if (invitation.getStatus() != TeamInvitation.InvitationStatus.PENDING) {
            throw new RuntimeException("Diese Einladung ist nicht mehr gültig");
        }
        
        if (LocalDateTime.now().isAfter(invitation.getExpiresAt())) {
            throw new RuntimeException("Diese Einladung ist abgelaufen");
        }
        
        Map<String, Object> preview = new HashMap<>();
        preview.put("emailMasked", maskEmail(invitation.getEmail()));
        preview.put("storeName", invitation.getStore().getName());
        preview.put("role", invitation.getRole());
        preview.put("expiresAt", invitation.getExpiresAt());
        
        return ResponseEntity.ok(preview);
    }
    
    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        String[] parts = email.split("@");
        String local = parts[0];
        String domain = parts[1];
        
        if (local.length() <= 2) {
            return local.charAt(0) + "***@" + domain;
        }
        return local.charAt(0) + "***" + local.charAt(local.length() - 1) + "@" + domain;
    }
    
    private String hashToken(String plainToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(plainToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
