package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import storebackend.dto.DocumentCreateRequest;
import storebackend.dto.DocumentDTO;
import storebackend.dto.DocumentUpdateRequest;
import storebackend.dto.ShareDocumentRequest;
import storebackend.entity.DocumentShare;
import storebackend.entity.User;
import storebackend.entity.UserDocument;
import storebackend.enums.DocumentSharePermission;
import storebackend.repository.DocumentShareRepository;
import storebackend.repository.UserDocumentRepository;
import storebackend.repository.UserRepository;

import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * DOCUMENTS-App (Phase 1) - deckt die im Auftrag geforderte Testmatrix ab:
 * Owner-Sichtbarkeit, Fremdzugriff verboten, Sharing gewährt Zugriff,
 * Nicht-Owner darf nicht löschen (403), Entfernen der Freigabe entzieht
 * Zugriff wieder.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("DocumentService Tests - Owner-or-Shared Zugriffsmodell")
class DocumentServiceTest {

    @Mock
    private UserDocumentRepository documentRepository;
    @Mock
    private DocumentShareRepository shareRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private MinioService minioService;

    @InjectMocks
    private DocumentService documentService;

    private User userA;
    private User userB;
    private UserDocument documentOfA;

    @BeforeEach
    void setUp() {
        userA = new User();
        userA.setId(1L);
        userA.setEmail("a@example.com");

        userB = new User();
        userB.setId(2L);
        userB.setEmail("b@example.com");

        documentOfA = new UserDocument();
        documentOfA.setId(100L);
        documentOfA.setOwner(userA);
        documentOfA.setTitle("HUK Kfz-Versicherung");
        documentOfA.setCreatedAt(LocalDateTime.now());
        documentOfA.setUpdatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("A legt Dokument manuell an -> A sieht es in listMine()")
    void userA_createsDocument_andSeesItInOwnList() {
        when(documentRepository.save(any(UserDocument.class))).thenAnswer(inv -> {
            UserDocument d = inv.getArgument(0);
            d.setId(100L);
            d.setCreatedAt(LocalDateTime.now());
            d.setUpdatedAt(LocalDateTime.now());
            return d;
        });

        DocumentCreateRequest request = new DocumentCreateRequest();
        request.setTitle("Vertrag Vodafone");
        request.setCategory("Vertrag");

        DocumentDTO dto = documentService.createManual(userA, request);

        assertEquals("Vertrag Vodafone", dto.getTitle());
        assertEquals(userA.getId(), dto.getOwnerUserId());
        assertFalse(dto.isSharedWithMe());
    }

    @Test
    @DisplayName("B sieht Dokument von A NICHT (weder in listMine noch per direktem Zugriff)")
    void userB_cannotAccessUnsharedDocumentOfA() {
        when(documentRepository.findByOwnerId(userB.getId())).thenReturn(List.of());
        assertTrue(documentService.listMine(userB).isEmpty());

        when(documentRepository.findById(100L)).thenReturn(Optional.of(documentOfA));
        when(shareRepository.existsByDocumentIdAndSharedWithUserId(100L, userB.getId())).thenReturn(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> documentService.getById(100L, userB));
        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    @DisplayName("A teilt mit B -> B sieht es unter 'Mit mir geteilt' und darf es anzeigen")
    void userA_sharesWithB_bIsGrantedViewAccess() {
        when(documentRepository.findByIdAndOwnerId(100L, userA.getId())).thenReturn(Optional.of(documentOfA));
        when(userRepository.findByEmail("b@example.com")).thenReturn(Optional.of(userB));
        when(shareRepository.findByDocumentIdAndSharedWithUserId(100L, userB.getId())).thenReturn(Optional.empty());
        when(shareRepository.save(any(DocumentShare.class))).thenAnswer(inv -> {
            DocumentShare s = inv.getArgument(0);
            s.setId(500L);
            s.setCreatedAt(LocalDateTime.now());
            return s;
        });

        ShareDocumentRequest request = new ShareDocumentRequest();
        request.setEmail("b@example.com");
        var shareDto = documentService.share(100L, userA, request);

        assertEquals(DocumentSharePermission.VIEW.name(), shareDto.getPermission());
        assertEquals(userB.getId(), shareDto.getSharedWithUserId());

        // "Mit mir geteilt"
        when(shareRepository.findSharedDocumentsForUser(userB.getId())).thenReturn(List.of(documentOfA));
        List<DocumentDTO> sharedWithB = documentService.listSharedWithMe(userB);
        assertEquals(1, sharedWithB.size());
        assertTrue(sharedWithB.get(0).isSharedWithMe());

        // Direkter Zugriff (Anzeigen) ist jetzt erlaubt
        when(documentRepository.findById(100L)).thenReturn(Optional.of(documentOfA));
        when(shareRepository.existsByDocumentIdAndSharedWithUserId(100L, userB.getId())).thenReturn(true);
        when(shareRepository.findByDocumentIdAndSharedWithUserId(100L, userB.getId()))
                .thenReturn(Optional.of(buildShare(documentOfA, userB)));
        DocumentDTO viewed = documentService.getById(100L, userB);
        assertTrue(viewed.isSharedWithMe());
    }

    @Test
    @DisplayName("B (nur geteilt) darf NICHT löschen -> 403")
    void sharedUserB_cannotDeleteDocument_forbidden() {
        when(documentRepository.findByIdAndOwnerId(100L, userB.getId())).thenReturn(Optional.empty());
        when(documentRepository.existsById(100L)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> documentService.delete(100L, userB));
        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(documentRepository, never()).delete(any());
    }

    @Test
    @DisplayName("A entfernt Share -> B verliert Zugriff")
    void ownerRemovesShare_bLosesAccess() {
        DocumentShare share = buildShare(documentOfA, userB);
        share.setId(500L);

        when(documentRepository.findByIdAndOwnerId(100L, userA.getId())).thenReturn(Optional.of(documentOfA));
        when(shareRepository.findById(500L)).thenReturn(Optional.of(share));

        documentService.unshare(100L, 500L, userA);
        verify(shareRepository).delete(share);

        // Nach Entfernen: B hat keinen Zugriff mehr
        when(documentRepository.findById(100L)).thenReturn(Optional.of(documentOfA));
        when(shareRepository.existsByDocumentIdAndSharedWithUserId(100L, userB.getId())).thenReturn(false);
        assertThrows(ResponseStatusException.class, () -> documentService.getById(100L, userB));
    }

    @Test
    @DisplayName("Datei-Upload wird in MinIO (privater Bucket) gespeichert")
    void uploadNew_storesFileInPrivateBucket() throws Exception {
        when(documentRepository.save(any(UserDocument.class))).thenAnswer(inv -> {
            UserDocument d = inv.getArgument(0);
            d.setId(100L);
            return d;
        });

        MockMultipartFile file = new MockMultipartFile(
                "file", "versicherung.pdf", "application/pdf", "dummy-content".getBytes());

        DocumentCreateRequest request = new DocumentCreateRequest();
        request.setTitle("HUK Kfz");
        request.setCategory("Versicherung");

        DocumentDTO dto = documentService.uploadNew(userA, file, request);

        verify(minioService).uploadToPrivateBucket(any(), eq((long) file.getBytes().length), eq("application/pdf"), anyString());
        assertTrue(dto.isHasFile());
        assertEquals("versicherung.pdf", dto.getOriginalFilename());
    }

    @Test
    @DisplayName("Update: nur Owner darf Titel/Kategorie/Notiz ändern")
    void update_onlyOwnerAllowed() {
        when(documentRepository.findByIdAndOwnerId(100L, userA.getId())).thenReturn(Optional.of(documentOfA));
        when(documentRepository.save(any(UserDocument.class))).thenAnswer(inv -> inv.getArgument(0));

        DocumentUpdateRequest request = new DocumentUpdateRequest();
        request.setTitle("Neuer Titel");
        request.setCategory("Sonstiges");

        DocumentDTO dto = documentService.update(100L, userA, request);
        assertEquals("Neuer Titel", dto.getTitle());
        assertEquals("Sonstiges", dto.getCategory());
    }

    private DocumentShare buildShare(UserDocument document, User target) {
        DocumentShare share = new DocumentShare();
        share.setDocument(document);
        share.setSharedWithUser(target);
        share.setPermission(DocumentSharePermission.VIEW);
        share.setCreatedAt(LocalDateTime.now());
        return share;
    }
}
