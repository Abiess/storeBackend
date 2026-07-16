package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.CreateTeamInvitationRequest;
import storebackend.dto.TeamInvitationDTO;
import storebackend.entity.Store;
import storebackend.entity.StoreRole;
import storebackend.entity.TeamInvitation;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.repository.StoreRoleRepository;
import storebackend.repository.TeamInvitationRepository;
import storebackend.repository.UserRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeamInvitationService {

    private final TeamInvitationRepository invitationRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final StoreRoleRepository storeRoleRepository;
    private final EmailService emailService;

    private static final int TOKEN_LENGTH = 32;  // 32 Bytes = 256 Bit
    private static final int EXPIRY_DAYS = 7;

    /** Alle Einladungen eines Stores abrufen */
    public List<TeamInvitationDTO> getInvitations(Long storeId) {
        return invitationRepository.findByStoreId(storeId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /** Neue Einladung erstellen */
    @Transactional
    public TeamInvitationDTO createInvitation(Long storeId, CreateTeamInvitationRequest req, User inviter) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found: " + storeId));

        // 1. Prüfen ob bereits aktive Einladung existiert
        invitationRepository.findByStoreIdAndEmailAndStatus(
                storeId,
                req.email.toLowerCase(),
                TeamInvitation.InvitationStatus.PENDING
        ).ifPresent(existing -> {
            throw new RuntimeException("Aktive Einladung für " + req.email + " existiert bereits");
        });

        // 2. Prüfen ob User bereits Mitglied ist
        User existingUser = userRepository.findByEmail(req.email).orElse(null);
        if (existingUser != null) {
            boolean alreadyMember = storeRoleRepository
                    .findByStoreIdAndUserId(storeId, existingUser.getId())
                    .isPresent();
            if (alreadyMember) {
                throw new RuntimeException("Benutzer ist bereits Mitglied dieses Stores");
            }
        }

        // 3. Token generieren (Klartext)
        String plainToken = generateSecureToken();

        // 4. Token hashen (SHA-256)
        String tokenHash = hashToken(plainToken);

        // 5. Einladung speichern
        TeamInvitation invitation = new TeamInvitation();
        invitation.setStore(store);
        invitation.setEmail(req.email.toLowerCase());
        invitation.setRole(req.role);
        invitation.setTokenHash(tokenHash);
        invitation.setStatus(TeamInvitation.InvitationStatus.PENDING);
        invitation.setInvitedBy(inviter);
        invitation.setExpiresAt(LocalDateTime.now().plusDays(EXPIRY_DAYS));

        invitation = invitationRepository.save(invitation);
        log.info("✅ Team-Einladung erstellt: store={}, email={}, role={}, expires={}",
                storeId, req.email, req.role, invitation.getExpiresAt());

        // 6. E-Mail versenden (mit Klartext-Token!)
        emailService.sendTeamInvitationEmail(
                req.email,
                plainToken,
                store.getName(),
                req.role
        );

        return toDTO(invitation);
    }

    /** Einladung per Token akzeptieren */
    @Transactional
    public void acceptInvitation(String plainToken, User acceptingUser) {
        // 1. Token hashen
        String tokenHash = hashToken(plainToken);

        // 2. Einladung finden
        TeamInvitation invitation = invitationRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new RuntimeException("Ungültiger oder abgelaufener Einladungslink"));

        // 3. Status prüfen
        if (invitation.getStatus() != TeamInvitation.InvitationStatus.PENDING) {
            throw new RuntimeException("Diese Einladung wurde bereits verwendet oder widerrufen");
        }

        // 4. Ablaufzeit prüfen
        if (LocalDateTime.now().isAfter(invitation.getExpiresAt())) {
            invitation.markExpired();
            invitationRepository.save(invitation);
            throw new RuntimeException("Diese Einladung ist abgelaufen");
        }

        // 5. E-Mail-Match prüfen (Sicherheit!)
        if (!acceptingUser.getEmail().equalsIgnoreCase(invitation.getEmail())) {
            log.warn("⚠️ E-Mail-Mismatch bei Einladung: token={}, expected={}, actual={}",
                    tokenHash.substring(0, 8), invitation.getEmail(), acceptingUser.getEmail());
            throw new RuntimeException("Diese Einladung ist für eine andere E-Mail-Adresse bestimmt");
        }

        // 6. Prüfen ob User bereits Mitglied ist
        storeRoleRepository.findByStoreIdAndUserId(
                invitation.getStore().getId(),
                acceptingUser.getId()
        ).ifPresent(existing -> {
            throw new RuntimeException("Sie sind bereits Mitglied dieses Stores");
        });

        // 7. Store-Rolle anlegen
        StoreRole role = new StoreRole();
        role.setStore(invitation.getStore());
        role.setUser(acceptingUser);
        role.setRole(invitation.getRole());
        // Permissions aus Rolle ableiten (serverseitig!)
        role.setPermissionList(determinePermissions(invitation.getRole()));

        storeRoleRepository.save(role);
        log.info("✅ Store-Rolle erstellt: store={}, user={}, role={}",
                invitation.getStore().getId(), acceptingUser.getId(), invitation.getRole());

        // 8. Einladung als akzeptiert markieren
        invitation.accept(acceptingUser);
        invitationRepository.save(invitation);
        log.info("✅ Einladung akzeptiert: id={}, email={}", invitation.getId(), invitation.getEmail());
    }

    /** Einladung widerrufen */
    @Transactional
    public void revokeInvitation(Long invitationId, User revoker) {
        TeamInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new RuntimeException("Einladung nicht gefunden"));

        if (invitation.getStatus() != TeamInvitation.InvitationStatus.PENDING) {
            throw new RuntimeException("Nur ausstehende Einladungen können widerrufen werden");
        }

        invitation.revoke();
        invitationRepository.save(invitation);
        log.info("✅ Einladung widerrufen: id={}, email={}, by={}", 
                invitationId, invitation.getEmail(), revoker.getId());
    }

    /** Einladung erneut senden */
    @Transactional
    public void resendInvitation(Long invitationId, User inviter) {
        TeamInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new RuntimeException("Einladung nicht gefunden"));

        if (invitation.getStatus() != TeamInvitation.InvitationStatus.PENDING) {
            throw new RuntimeException("Nur ausstehende Einladungen können erneut versendet werden");
        }

        if (LocalDateTime.now().isAfter(invitation.getExpiresAt())) {
            throw new RuntimeException("Diese Einladung ist abgelaufen. Bitte erstellen Sie eine neue.");
        }

        // Neuen Token generieren
        String newPlainToken = generateSecureToken();
        String newTokenHash = hashToken(newPlainToken);

        invitation.setTokenHash(newTokenHash);
        // Optional: Ablaufzeit verlängern
        invitation.setExpiresAt(LocalDateTime.now().plusDays(EXPIRY_DAYS));
        invitationRepository.save(invitation);

        // E-Mail erneut senden
        emailService.sendTeamInvitationEmail(
                invitation.getEmail(),
                newPlainToken,
                invitation.getStore().getName(),
                invitation.getRole()
        );

        log.info("✅ Einladung erneut versendet: id={}, email={}", invitationId, invitation.getEmail());
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ══════════════════════════════════════════════════════════════════════════

    /** Kryptografisch sicheren Token generieren (32 Bytes = 256 Bit) */
    private String generateSecureToken() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[TOKEN_LENGTH];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** Token per SHA-256 hashen */
    private String hashToken(String plainToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(plainToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    /** Permissions aus Rolle ableiten (serverseitig!) */
    private List<String> determinePermissions(String role) {
        // TODO: Mit ROLE_PERMISSIONS_MAP im Backend synchronisieren
        return switch (role) {
            case "STORE_OWNER" -> List.of("*");  // Alle
            case "STORE_ADMIN" -> List.of("PRODUCT_CREATE", "PRODUCT_READ", "PRODUCT_UPDATE", "ORDER_READ", "ORDER_UPDATE");
            case "STORE_MANAGER" -> List.of("PRODUCT_READ", "PRODUCT_UPDATE", "ORDER_READ");
            case "STORE_STAFF" -> List.of("PRODUCT_READ", "ORDER_READ");
            default -> List.of("PRODUCT_READ");
        };
    }

    /** Entity → DTO */
    private TeamInvitationDTO toDTO(TeamInvitation inv) {
        TeamInvitationDTO dto = new TeamInvitationDTO();
        dto.id = inv.getId();
        dto.storeId = inv.getStore().getId();
        dto.storeName = inv.getStore().getName();
        dto.email = inv.getEmail();
        dto.role = inv.getRole();
        dto.status = inv.getStatus().name();
        dto.invitedByUserId = inv.getInvitedBy().getId();
        dto.invitedByUserName = inv.getInvitedBy().getName();
        dto.createdAt = inv.getCreatedAt();
        dto.expiresAt = inv.getExpiresAt();
        dto.acceptedAt = inv.getAcceptedAt();
        dto.revokedAt = inv.getRevokedAt();
        return dto;
    }
}
