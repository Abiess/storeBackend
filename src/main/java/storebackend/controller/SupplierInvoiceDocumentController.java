package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.SupplierInvoiceDocumentDTO;
import storebackend.entity.Store;
import storebackend.entity.SupplierInvoiceDocument;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.service.SupplierInvoiceDocumentService;
import storebackend.util.StoreAccessChecker;

import java.io.InputStream;
import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/supplier-invoices")
@Tag(name = "Supplier Invoice Documents", description = "Secure upload and management of supplier invoices (PDF and images)")
@RequiredArgsConstructor
@Slf4j
public class SupplierInvoiceDocumentController {

    private final SupplierInvoiceDocumentService documentService;
    private final StoreRepository storeRepository;

    /**
     * Upload einer Lieferantenrechnung (PDF oder Bild)
     */
    @Operation(summary = "Upload supplier invoice", description = "Upload a supplier invoice document (PDF, JPEG, PNG, WEBP). Max 10MB. Stored in PRIVATE bucket.")
    @PostMapping(value = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> uploadDocument(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Parameter(description = "Document file (PDF or image)", required = true)
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).body("Unauthorized");
            }

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));

            // Zusätzliche Sicherheitsprüfung (PreAuthorize sollte das schon gemacht haben)
            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).body("Not authorized to upload documents to this store");
            }

            SupplierInvoiceDocumentDTO document = documentService.uploadDocument(file, store, user);

            log.info("✅ Lieferantenrechnung hochgeladen: Store={}, User={}, Datei={}",
                    storeId, user.getEmail(), file.getOriginalFilename());

            return ResponseEntity.ok(document);

        } catch (Exception e) {
            log.error("Fehler beim Upload von Lieferantenrechnung", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Liste aller Dokumente eines Stores
     */
    @Operation(summary = "List all supplier invoice documents")
    @GetMapping("/documents")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> listDocuments(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).build();
            }

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));

            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).build();
            }

            List<SupplierInvoiceDocumentDTO> documents = documentService.getDocumentsByStore(storeId);
            return ResponseEntity.ok(documents);

        } catch (Exception e) {
            log.error("Fehler beim Abrufen der Dokumentenliste", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Einzelnes Dokument-Metadaten abrufen
     */
    @Operation(summary = "Get single document metadata")
    @GetMapping("/documents/{documentId}")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> getDocument(
            @PathVariable Long storeId,
            @PathVariable Long documentId,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).build();
            }

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));

            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).build();
            }

            SupplierInvoiceDocument document = documentService.getDocument(documentId, storeId);
            // TODO: Convert to DTO
            return ResponseEntity.ok(document);

        } catch (Exception e) {
            log.error("Fehler beim Abrufen des Dokuments", e);
            return ResponseEntity.status(404).body(e.getMessage());
        }
    }

    /**
     * Dokument-Inhalt herunterladen (authentifiziert, aus privatem Bucket)
     */
    @Operation(summary = "Download document content", description = "Download file from PRIVATE bucket. Requires authentication and store ownership.")
    @GetMapping("/documents/{documentId}/content")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> downloadDocument(
            @PathVariable Long storeId,
            @PathVariable Long documentId,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).body("Unauthorized");
            }

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));

            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).body("Not authorized");
            }

            // Dokument abrufen (mit Multi-Tenant-Prüfung)
            SupplierInvoiceDocument document = documentService.getDocument(documentId, storeId);

            // Datei-Inhalt aus privatem Bucket laden
            InputStream fileStream = documentService.getDocumentContent(documentId, storeId);

            // HTTP-Response vorbereiten
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(document.getMimeType()));
            headers.setContentLength(document.getFileSize());
            headers.setContentDispositionFormData("inline", document.getOriginalFilename());

            log.info("✅ Dokument wird heruntergeladen: Store={}, User={}, Dokument={}",
                    storeId, user.getEmail(), document.getOriginalFilename());

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(new InputStreamResource(fileStream));

        } catch (Exception e) {
            log.error("Fehler beim Download des Dokuments", e);
            return ResponseEntity.status(500).body("Error downloading document: " + e.getMessage());
        }
    }

    /**
     * Dokument löschen
     */
    @Operation(summary = "Delete document")
    @DeleteMapping("/documents/{documentId}")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> deleteDocument(
            @PathVariable Long storeId,
            @PathVariable Long documentId,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).body("Unauthorized");
            }

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));

            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).body("Not authorized");
            }

            documentService.deleteDocument(documentId, storeId);

            log.info("✅ Dokument gelöscht: Store={}, User={}, DokumentID={}",
                    storeId, user.getEmail(), documentId);

            return ResponseEntity.ok().body("Document deleted successfully");

        } catch (Exception e) {
            log.error("Fehler beim Löschen des Dokuments", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Anzahl Dokumente für einen Store
     */
    @Operation(summary = "Count documents")
    @GetMapping("/documents/count")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> countDocuments(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).build();
            }

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));

            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).build();
            }

            long count = documentService.countDocumentsByStore(storeId);
            return ResponseEntity.ok().body(new CountResponse(count));

        } catch (Exception e) {
            log.error("Fehler beim Zählen der Dokumente", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    record CountResponse(long count) {}
}
