package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import storebackend.dto.DocumentCreateRequest;
import storebackend.dto.DocumentDTO;
import storebackend.dto.DocumentShareDTO;
import storebackend.dto.DocumentUpdateRequest;
import storebackend.dto.ShareDocumentRequest;
import storebackend.entity.DocumentShare;
import storebackend.entity.User;
import storebackend.entity.UserDocument;
import storebackend.enums.DocumentSharePermission;
import storebackend.repository.DocumentShareRepository;
import storebackend.repository.UserDocumentRepository;
import storebackend.repository.UserRepository;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * DOCUMENTS-App (Phase 1, persönlicher Dokumenten-Tresor).
 *
 * Zugriffsmodell (siehe Auftrag):
 * <pre>
 * Zugriff erlaubt wenn: currentUser == owner  ODER  ein DocumentShare existiert.
 * </pre>
 * App-Zugriff ({@code @RequiresApp(DOCUMENTS)}) wird bereits VOR dieser Klasse
 * durch {@code AppAccessInterceptor} geprüft (siehe {@code DocumentController}).
 * Diese Klasse prüft NUR noch die Dokument-Ebene (Owner-or-Shared), analog zum
 * bewusst getrennten Muster von {@code StoreAccessChecker} für Stores.
 *
 * Storage: private MinIO-Bucket, exakt wie {@link SupplierInvoiceDocumentService}
 * (siehe dortiges Vorbild) - Dateien werden NIE öffentlich abgelegt.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private static final String OBJECT_KEY_PREFIX = "documents";

    private final UserDocumentRepository documentRepository;
    private final DocumentShareRepository shareRepository;
    private final UserRepository userRepository;
    private final MinioService minioService;

    // ────────────────────────────────────────────────────────────────
    // Anlegen
    // ────────────────────────────────────────────────────────────────

    /** Manuelles Anlegen OHNE Datei (z.B. Vertrag nur mit Notiz erfasst). */
    @Transactional
    public DocumentDTO createManual(User owner, DocumentCreateRequest request) {
        requireTitle(request.getTitle());

        UserDocument document = new UserDocument();
        document.setOwner(owner);
        applyMetadata(document, request);

        document = documentRepository.save(document);
        log.info("✅ Dokument manuell angelegt: id={}, owner={}", document.getId(), owner.getId());
        return toDTO(document, owner);
    }

    /** Anlegen MIT Datei (Foto/Kamera oder Datei-/PDF-Upload - technisch identisch). */
    @Transactional
    public DocumentDTO uploadNew(User owner, MultipartFile file, DocumentCreateRequest request) throws IOException {
        requireTitle(request.getTitle());
        requireFile(file);

        UserDocument document = new UserDocument();
        document.setOwner(owner);
        applyMetadata(document, request);
        storeFile(document, owner, file);

        document = documentRepository.save(document);
        log.info("✅ Dokument mit Datei hochgeladen: id={}, owner={}, datei={}, contentType={}, size={}",
                document.getId(), owner.getId(), file.getOriginalFilename(), file.getContentType(), file.getSize());
        return toDTO(document, owner);
    }

    /** Datei zu einem bestehenden (bisher dateilosen oder zu ersetzenden) Dokument hinzufügen. Nur Owner. */
    @Transactional
    public DocumentDTO attachFile(Long documentId, User owner, MultipartFile file) throws IOException {
        requireFile(file);
        UserDocument document = requireOwnedDocument(documentId, owner);

        String previousObjectKey = document.getObjectKey();
        storeFile(document, owner, file);
        document = documentRepository.save(document);

        if (previousObjectKey != null && !previousObjectKey.equals(document.getObjectKey())) {
            deleteFileQuietly(previousObjectKey);
        }

        log.info("✅ Datei an Dokument angehängt/ersetzt: id={}, owner={}", document.getId(), owner.getId());
        return toDTO(document, owner);
    }

    // ────────────────────────────────────────────────────────────────
    // Lesen
    // ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<DocumentDTO> listMine(User owner) {
        return documentRepository.findByOwnerId(owner.getId()).stream()
                .map(d -> toDTO(d, owner))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DocumentDTO> listSharedWithMe(User user) {
        return shareRepository.findSharedDocumentsForUser(user.getId()).stream()
                .map(d -> toDTO(d, user))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DocumentDTO getById(Long documentId, User user) {
        UserDocument document = requireAccessibleDocument(documentId, user);
        return toDTO(document, user);
    }

    /** Liefert Datei-Inhalt + Metadaten für den Download-Endpunkt. Owner-or-Shared. */
    @Transactional(readOnly = true)
    public DownloadResult getContent(Long documentId, User user) {
        UserDocument document = requireAccessibleDocument(documentId, user);
        if (document.getObjectKey() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dieses Dokument hat keine Datei");
        }
        InputStream stream = minioService.getFileFromPrivateBucket(document.getObjectKey());
        return new DownloadResult(stream, document.getMimeType(), document.getOriginalFilename());
    }

    // ────────────────────────────────────────────────────────────────
    // Ändern / Löschen (nur Owner)
    // ────────────────────────────────────────────────────────────────

    @Transactional
    public DocumentDTO update(Long documentId, User owner, DocumentUpdateRequest request) {
        UserDocument document = requireOwnedDocument(documentId, owner);
        if (request.getTitle() != null) {
            requireTitle(request.getTitle());
            document.setTitle(request.getTitle());
        }
        document.setCategory(request.getCategory());
        document.setNote(request.getNote());
        document.setDocumentDate(request.getDocumentDate());
        document.setExpiryDate(request.getExpiryDate());

        document = documentRepository.save(document);
        return toDTO(document, owner);
    }

    @Transactional
    public void delete(Long documentId, User owner) {
        UserDocument document = requireOwnedDocument(documentId, owner);

        shareRepository.findByDocumentId(documentId)
                .forEach(share -> shareRepository.deleteById(share.getId()));

        if (document.getObjectKey() != null) {
            deleteFileQuietly(document.getObjectKey());
        }

        documentRepository.delete(document);
        log.info("✅ Dokument gelöscht: id={}, owner={}", documentId, owner.getId());
    }

    // ────────────────────────────────────────────────────────────────
    // Sharing (nur Owner darf teilen/entfernen)
    // ────────────────────────────────────────────────────────────────

    @Transactional
    public DocumentShareDTO share(Long documentId, User owner, ShareDocumentRequest request) {
        UserDocument document = requireOwnedDocument(documentId, owner);

        String email = request.getEmail() == null ? "" : request.getEmail().trim();
        if (email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "E-Mail-Adresse ist erforderlich");
        }

        User target = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Kein markt.ma-Benutzer mit dieser E-Mail-Adresse gefunden"));

        if (target.getId().equals(owner.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ein Dokument kann nicht mit sich selbst geteilt werden");
        }

        DocumentSharePermission permission = DocumentSharePermission.VIEW; // MVP: ausschließlich VIEW

        DocumentShare share = shareRepository.findByDocumentIdAndSharedWithUserId(documentId, target.getId())
                .orElseGet(DocumentShare::new);
        share.setDocument(document);
        share.setSharedWithUser(target);
        share.setPermission(permission);
        share = shareRepository.save(share);

        log.info("✅ Dokument geteilt: id={}, owner={}, mit={}", documentId, owner.getId(), target.getId());
        return toShareDTO(share);
    }

    @Transactional(readOnly = true)
    public List<DocumentShareDTO> listShares(Long documentId, User owner) {
        requireOwnedDocument(documentId, owner);
        return shareRepository.findByDocumentId(documentId).stream()
                .map(this::toShareDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void unshare(Long documentId, Long shareId, User owner) {
        requireOwnedDocument(documentId, owner);
        DocumentShare share = shareRepository.findById(shareId)
                .filter(s -> s.getDocument().getId().equals(documentId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Freigabe nicht gefunden"));
        shareRepository.delete(share);
        log.info("✅ Freigabe entfernt: document={}, share={}, owner={}", documentId, shareId, owner.getId());
    }

    // ────────────────────────────────────────────────────────────────
    // Interne Helfer
    // ────────────────────────────────────────────────────────────────

    private void applyMetadata(UserDocument document, DocumentCreateRequest request) {
        document.setTitle(request.getTitle().trim());
        document.setCategory(request.getCategory());
        document.setNote(request.getNote());
        document.setDocumentDate(request.getDocumentDate());
        document.setExpiryDate(request.getExpiryDate());
    }

    private void storeFile(UserDocument document, User owner, MultipartFile file) throws IOException {
        String extension = extractExtension(file.getOriginalFilename());
        String objectKey = String.format("%s/%d/%s%s", OBJECT_KEY_PREFIX, owner.getId(), UUID.randomUUID(), extension);

        try (InputStream inputStream = file.getInputStream()) {
            minioService.uploadToPrivateBucket(inputStream, file.getSize(), file.getContentType(), objectKey);
        }

        document.setObjectKey(objectKey);
        document.setOriginalFilename(file.getOriginalFilename());
        document.setMimeType(file.getContentType());
        document.setSize(file.getSize());
    }

    private void deleteFileQuietly(String objectKey) {
        try {
            minioService.deleteFileFromPrivateBucket(objectKey);
        } catch (Exception e) {
            log.warn("⚠️ Konnte Datei nicht aus MinIO löschen: {} ({})", objectKey, e.getMessage());
        }
    }

    private String extractExtension(String originalFilename) {
        if (originalFilename != null && originalFilename.contains(".")) {
            return originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        return "";
    }

    private void requireTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Titel ist erforderlich");
        }
    }

    private void requireFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Datei ist erforderlich");
        }
    }

    /** Owner-or-Shared - für lesende Zugriffe (Anzeigen, Herunterladen). */
    private UserDocument requireAccessibleDocument(Long documentId, User user) {
        UserDocument document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dokument nicht gefunden"));

        boolean isOwner = document.getOwner().getId().equals(user.getId());
        if (isOwner) {
            return document;
        }

        boolean isShared = shareRepository.existsByDocumentIdAndSharedWithUserId(documentId, user.getId());
        if (!isShared) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Kein Zugriff auf dieses Dokument");
        }
        return document;
    }

    /** Nur Owner - für schreibende Zugriffe (Ändern, Löschen, Teilen). */
    private UserDocument requireOwnedDocument(Long documentId, User owner) {
        return documentRepository.findByIdAndOwnerId(documentId, owner.getId())
                .orElseGet(() -> {
                    // Existiert das Dokument überhaupt (nur für ein präziseres 403 vs. 404)?
                    if (documentRepository.existsById(documentId)) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nur der Eigentümer darf diese Aktion ausführen");
                    }
                    throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dokument nicht gefunden");
                });
    }

    private DocumentDTO toDTO(UserDocument document, User requestingUser) {
        DocumentDTO dto = new DocumentDTO();
        dto.setId(document.getId());
        dto.setOwnerUserId(document.getOwner().getId());
        dto.setOwnerEmail(document.getOwner().getEmail());
        dto.setTitle(document.getTitle());
        dto.setCategory(document.getCategory());
        dto.setNote(document.getNote());
        dto.setDocumentDate(document.getDocumentDate());
        dto.setExpiryDate(document.getExpiryDate());
        dto.setHasFile(document.getObjectKey() != null);
        dto.setOriginalFilename(document.getOriginalFilename());
        dto.setMimeType(document.getMimeType());
        dto.setSize(document.getSize());
        dto.setExtractedText(document.getExtractedText());
        dto.setCreatedAt(document.getCreatedAt());
        dto.setUpdatedAt(document.getUpdatedAt());

        boolean sharedWithMe = !document.getOwner().getId().equals(requestingUser.getId());
        dto.setSharedWithMe(sharedWithMe);
        if (sharedWithMe) {
            Optional<DocumentShare> share = shareRepository.findByDocumentIdAndSharedWithUserId(document.getId(), requestingUser.getId());
            dto.setPermission(share.map(s -> s.getPermission().name()).orElse(null));
        }
        return dto;
    }

    private DocumentShareDTO toShareDTO(DocumentShare share) {
        DocumentShareDTO dto = new DocumentShareDTO();
        dto.setId(share.getId());
        dto.setDocumentId(share.getDocument().getId());
        dto.setSharedWithUserId(share.getSharedWithUser().getId());
        dto.setSharedWithUserEmail(share.getSharedWithUser().getEmail());
        dto.setPermission(share.getPermission().name());
        dto.setCreatedAt(share.getCreatedAt());
        return dto;
    }

    /** Ergebnis eines Datei-Downloads (Stream + Metadaten für Content-Disposition/-Type). */
    public record DownloadResult(InputStream stream, String mimeType, String filename) {
    }
}
