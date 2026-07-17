package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import storebackend.dto.CreateTeamInvitationRequest;
import storebackend.dto.TeamInvitationDTO;
import storebackend.dto.TeamInvitationResponse;
import storebackend.entity.Store;
import storebackend.entity.StoreRole;
import storebackend.entity.TeamInvitation;
import storebackend.entity.User;
import storebackend.exception.EmailDeliveryException;
import storebackend.repository.StoreRepository;
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
    private final StoreRepository storeRepository;

    /**
     * Neue Team-Einladung erstellen
     * Nur Owner oder Admin erlaubt
     * 
     * Response enthält echten E-Mail-Versandstatus:
     * - emailSent=true  → "Einladung versendet" ✅
     * - emailSent=false → "Einladung erstellt, E-Mail fehlgeschlagen" ⚠️
     */
    @PostMapping("/stores/{storeId}/team-invitations")
    public ResponseEntity<TeamInvitationResponse> createInvitation(
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
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "STORE_OWNER kann nicht über Einladung vergeben werden"
            );
        }

        // Einladung erstellen (gibt strukturierte Response mit Email-Status zurück)
        TeamInvitationResponse response = invitationService.createInvitation(storeId, request, user);
        
        if (response.emailSent()) {
            log.info("✅ Invitation created and email sent: id={}, store={}, email={}", 
                    response.invitation().id, storeId, request.email);
        } else {
            log.warn("⚠️ Invitation created but email failed: id={}, store={}, email={}, errorCode={}",
                    response.invitation().id, storeId, request.email, response.emailErrorCode());
        }
        
        return ResponseEntity.ok(response);
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
        log.info("📋 Team invitations access: storeId={}, userId={}",
                storeId, user != null ? user.getId() : null);
        log.debug("Team invitations access detail: email={}", 
                user != null ? user.getEmail() : null);

        // Berechtigung prüfen
        requireOwnerOrAdmin(storeId, user);

        List<TeamInvitationDTO> invitations = invitationService.getInvitations(storeId);
        log.info("✅ Returned {} invitations for store {}", invitations.size(), storeId);
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
     * 
     * Response enthält echten E-Mail-Versandstatus:
     * - emailSent=true  → "E-Mail versendet" ✅
     * - emailSent=false → "E-Mail fehlgeschlagen" ⚠️
     */
    @PostMapping("/stores/{storeId}/team-invitations/{invitationId}/resend")
    public ResponseEntity<TeamInvitationResponse> resendInvitation(
            @PathVariable Long storeId,
            @PathVariable Long invitationId,
            @AuthenticationPrincipal User user
    ) {
        log.info("🔄 Resend invitation: store={}, invitation={}, by={}", 
                storeId, invitationId, user.getId());

        // Berechtigung prüfen
        requireOwnerOrAdmin(storeId, user);

        // Einladung erneut senden (gibt strukturierte Response mit Email-Status zurück)
        TeamInvitationResponse response = invitationService.resendInvitation(invitationId, user);
        
        if (response.emailSent()) {
            log.info("✅ Invitation resent and email sent: id={}", invitationId);
        } else {
            log.warn("⚠️ Invitation resent but email failed: id={}, errorCode={}", 
                    invitationId, response.emailErrorCode());
        }
        
        return ResponseEntity.ok(response);
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
     * 
     * Priorität:
     * 1. Store Owner (über stores.owner_id) = immer erlaubt
     * 2. STORE_ADMIN Rolle (über store_roles) = erlaubt
     * 3. Alle anderen = verboten
     * 
     * HTTP Status Codes:
     * - 401 Unauthorized: Nicht angemeldet
     * - 404 Not Found: Store existiert nicht
     * - 403 Forbidden: Keine Berechtigung für diesen Store
     * - 200 OK: Zugriff erlaubt
     */
    private void requireOwnerOrAdmin(Long storeId, User user) {
        // 1. Authentifizierung prüfen → 401
        if (user == null) {
            log.warn("⚠️ Unauthorized access attempt: storeId={}, user is null", storeId);
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Nicht angemeldet"
            );
        }

        // 2. Store laden → 404 wenn nicht gefunden
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> {
                    log.warn("⚠️ Store not found: storeId={}", storeId);
                    return new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Store nicht gefunden"
                    );
                });

        // 3. Prüfen ob Benutzer der Store Owner ist
        Long ownerId = store.getOwner() != null ? store.getOwner().getId() : null;
        
        if (ownerId != null && ownerId.equals(user.getId())) {
            log.debug("✅ Access granted: user={} is owner of store={}", user.getId(), storeId);
            return;
        }

        // 4. Prüfen ob Benutzer STORE_ADMIN Rolle hat
        boolean isAdmin = storeRoleRepository
                .findByStoreIdAndUserId(storeId, user.getId())
                .map(role -> "STORE_ADMIN".equals(role.getRole()))
                .orElse(false);

        if (isAdmin) {
            log.debug("✅ Access granted: user={} is STORE_ADMIN of store={}", user.getId(), storeId);
            return;
        }

        // 5. Zugriff verweigert → 403
        log.warn("⚠️ Access denied: storeId={}, userId={}, isOwner={}, isAdmin={}", 
                storeId, user.getId(), false, false);
        throw new AccessDeniedException("Zugriff verweigert: Keine Berechtigung für diesen Store");
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
