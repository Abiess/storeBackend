package storebackend.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.DocumentCreateRequest;
import storebackend.dto.ShareDocumentRequest;
import storebackend.dto.admin.UpsertEntitlementRequest;
import storebackend.entity.User;
import storebackend.enums.AppKey;
import storebackend.enums.Role;
import storebackend.repository.PlanRepository;
import storebackend.repository.UserRepository;
import storebackend.security.JwtUtil;
import storebackend.service.DocumentService;
import storebackend.service.admin.AppProvisioningService;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * DOCUMENTS-App (Phase 1) - End-to-End-Testmatrix laut Auftrag (echte HTTP-Requests
 * via MockMvc mit echtem JWT, analog zum bestehenden Muster in
 * {@link ProvisioningEndToEndSmokeTest}):
 *
 * <ul>
 *   <li>A erstellt Dokument -> A sieht es</li>
 *   <li>B sieht es NICHT (403)</li>
 *   <li>A teilt mit B -> B sieht es unter "Mit mir geteilt" / per direktem Zugriff</li>
 *   <li>B versucht zu löschen -> 403</li>
 *   <li>A entfernt Share -> B verliert Zugriff</li>
 *   <li>User ohne DOCUMENTS-Entitlement (MANAGED über andere App) -> Backend 403</li>
 *   <li>LEGACY-User -> bestehende LEGACY-Semantik (voller Zugriff)</li>
 * </ul>
 *
 * Datei-Upload/-Download (MinIO) wird bewusst NICHT hier, sondern in
 * {@code DocumentServiceTest} (Mockito, MinioService gemockt) abgedeckt, da
 * MinIO im Test-Profil (H2/ohne echten MinIO-Server) nicht verfügbar ist.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DocumentsAppEndToEndSmokeTest {

    private static final String RAW_PASSWORD = "SmokeTest#12345";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PlanRepository planRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private AppProvisioningService appProvisioningService;
    @Autowired private DocumentService documentService;
    @Autowired private ObjectMapper objectMapper;

    private User userA;
    private User userB;

    @BeforeEach
    void setUp() {
        userA = createUser("doc-a-");
        userB = createUser("doc-b-");
    }

    @Test
    @DisplayName("LEGACY-User: voller Zugriff auf DOCUMENTS ohne jedes Entitlement")
    void legacyUser_hasFullDocumentsAccess() throws Exception {
        mockMvc.perform(post("/api/documents")
                        .header("Authorization", bearer(userA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createRequestJson("Perso", "Ausweis")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Perso"));
    }

    @Test
    @DisplayName("User OHNE DOCUMENTS-Entitlement (MANAGED über andere App) -> Backend 403")
    void managedUserWithoutDocumentsEntitlement_isForbidden() throws Exception {
        // Macht userA per MANAGED (Entitlement für eine andere GLOBAL-App), aber NICHT DOCUMENTS
        appProvisioningService.upsertEntitlement(userA.getId(),
                new UpsertEntitlementRequest(AppKey.MARITIME, null, true));

        mockMvc.perform(post("/api/documents")
                        .header("Authorization", bearer(userA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createRequestJson("Perso", "Ausweis")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("A erstellt Dokument -> A sieht es, B sieht es NICHT (403), Sharing gewährt/entzieht Zugriff, B darf nicht löschen")
    void fullSharingLifecycle() throws Exception {
        // Beide Userinnen MANAGED + DOCUMENTS enabled (deterministisches Setup, unabhängig von LEGACY)
        appProvisioningService.upsertEntitlement(userA.getId(), new UpsertEntitlementRequest(AppKey.DOCUMENTS, null, true));
        appProvisioningService.upsertEntitlement(userB.getId(), new UpsertEntitlementRequest(AppKey.DOCUMENTS, null, true));

        // 1. A erstellt Dokument
        DocumentCreateRequest request = new DocumentCreateRequest();
        request.setTitle("HUK Kfz-Versicherung");
        request.setCategory("Versicherung");
        var created = documentService.createManual(userA, request);
        Long documentId = created.getId();

        // 2. A sieht es
        mockMvc.perform(get("/api/documents/" + documentId).header("Authorization", bearer(userA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("HUK Kfz-Versicherung"));

        // 3. B sieht es NICHT
        mockMvc.perform(get("/api/documents/" + documentId).header("Authorization", bearer(userB)))
                .andExpect(status().isForbidden());

        // 4. A teilt mit B
        ShareDocumentRequest shareRequest = new ShareDocumentRequest();
        shareRequest.setEmail(userB.getEmail());
        mockMvc.perform(post("/api/documents/" + documentId + "/shares")
                        .header("Authorization", bearer(userA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(shareRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sharedWithUserId").value(userB.getId()));

        // 5. B sieht es jetzt (direkt + unter "Mit mir geteilt")
        mockMvc.perform(get("/api/documents/" + documentId).header("Authorization", bearer(userB)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sharedWithMe").value(true));
        mockMvc.perform(get("/api/documents/shared").header("Authorization", bearer(userB)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(documentId));

        // 6. B darf NICHT löschen
        mockMvc.perform(delete("/api/documents/" + documentId).header("Authorization", bearer(userB)))
                .andExpect(status().isForbidden());

        // 7. A entfernt Share -> B verliert Zugriff
        var shares = documentService.listShares(documentId, userA);
        assertEquals(1, shares.size());
        mockMvc.perform(delete("/api/documents/" + documentId + "/shares/" + shares.get(0).getId())
                        .header("Authorization", bearer(userA)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/documents/" + documentId).header("Authorization", bearer(userB)))
                .andExpect(status().isForbidden());
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private String createRequestJson(String title, String category) throws Exception {
        DocumentCreateRequest request = new DocumentCreateRequest();
        request.setTitle(title);
        request.setCategory(category);
        return objectMapper.writeValueAsString(request);
    }

    private String bearer(User user) {
        return "Bearer " + jwtUtil.generateToken(user.getEmail(), user.getId(), user.getRoles());
    }

    private User createUser(String prefix) {
        User user = new User();
        user.setEmail(prefix + System.nanoTime() + "@example.com");
        user.setPasswordHash(passwordEncoder.encode(RAW_PASSWORD));
        user.setName("Smoke Test " + prefix);
        user.setEmailVerified(true);
        Set<Role> roles = new HashSet<>();
        roles.add(Role.USER);
        user.setRoles(roles);
        planRepository.findByName("FREE").ifPresent(user::setPlan);
        return userRepository.save(user);
    }
}
