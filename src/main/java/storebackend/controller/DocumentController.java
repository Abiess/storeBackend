package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import storebackend.dto.DocumentCreateRequest;
import storebackend.dto.DocumentDTO;
import storebackend.dto.DocumentShareDTO;
import storebackend.dto.DocumentUpdateRequest;
import storebackend.dto.ShareDocumentRequest;
import storebackend.entity.User;
import storebackend.enums.AppKey;
import storebackend.enums.AppScopeSource;
import storebackend.security.RequiresApp;
import storebackend.service.DocumentService;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

/**
 * DOCUMENTS-App (Phase 1) - persönlicher Dokumenten-Tresor.
 *
 * GLOBAL-Scope (siehe {@code storebackend.enums.AppKey#DOCUMENTS}): kein
 * {@code storeId} in irgendeinem Pfad, deshalb {@code scope = AppScopeSource.NONE}
 * (analog zu {@link MaritimeController}). Die Daten selbst bleiben trotzdem
 * strikt user-privat (Owner-or-Shared, siehe {@link DocumentService}).
 */
@RestController
@RequestMapping("/api/documents")
@Tag(name = "Documents", description = "Persönlicher Dokumenten-Tresor (GLOBAL-App, user-privat)")
@RequiresApp(value = AppKey.DOCUMENTS, scope = AppScopeSource.NONE)
@RequiredArgsConstructor
@Slf4j
public class DocumentController {

    private final DocumentService documentService;

    @Operation(summary = "Dokument manuell anlegen (ohne Datei)")
    @PostMapping
    public ResponseEntity<DocumentDTO> createManual(
            @RequestBody DocumentCreateRequest request,
            @AuthenticationPrincipal User user) {
        requireUser(user);
        return ResponseEntity.ok(documentService.createManual(user, request));
    }

    @Operation(summary = "Dokument fotografieren/hochladen (Datei + Metadaten)")
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentDTO> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String note,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate documentDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate expiryDate,
            @AuthenticationPrincipal User user) throws IOException {
        requireUser(user);

        DocumentCreateRequest request = new DocumentCreateRequest();
        request.setTitle(title);
        request.setCategory(category);
        request.setNote(note);
        request.setDocumentDate(documentDate);
        request.setExpiryDate(expiryDate);

        return ResponseEntity.ok(documentService.uploadNew(user, file, request));
    }

    @Operation(summary = "Datei zu einem bestehenden Dokument hinzufügen/ersetzen (nur Owner)")
    @PostMapping(value = "/{id}/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentDTO> attachFile(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) throws IOException {
        requireUser(user);
        return ResponseEntity.ok(documentService.attachFile(id, user, file));
    }

    @Operation(summary = "Meine eigenen Dokumente")
    @GetMapping
    public ResponseEntity<List<DocumentDTO>> listMine(@AuthenticationPrincipal User user) {
        requireUser(user);
        return ResponseEntity.ok(documentService.listMine(user));
    }

    @Operation(summary = "Mit mir geteilte Dokumente")
    @GetMapping("/shared")
    public ResponseEntity<List<DocumentDTO>> listSharedWithMe(@AuthenticationPrincipal User user) {
        requireUser(user);
        return ResponseEntity.ok(documentService.listSharedWithMe(user));
    }

    @Operation(summary = "Einzelnes Dokument (Owner oder geteilt)")
    @GetMapping("/{id}")
    public ResponseEntity<DocumentDTO> getById(@PathVariable Long id, @AuthenticationPrincipal User user) {
        requireUser(user);
        return ResponseEntity.ok(documentService.getById(id, user));
    }

    @Operation(summary = "Dokument herunterladen/anzeigen (Owner oder geteilt)")
    @GetMapping("/{id}/download")
    public ResponseEntity<InputStreamResource> download(@PathVariable Long id, @AuthenticationPrincipal User user) {
        requireUser(user);
        DocumentService.DownloadResult result = documentService.getContent(id, user);

        MediaType mediaType = result.mimeType() != null
                ? MediaType.parseMediaType(result.mimeType())
                : MediaType.APPLICATION_OCTET_STREAM;

        ContentDisposition disposition = ContentDisposition.inline()
                .filename(result.filename() != null ? result.filename() : "document")
                .build();

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(new InputStreamResource(result.stream()));
    }

    @Operation(summary = "Titel/Kategorie/Notiz/Datum ändern (nur Owner)")
    @PutMapping("/{id}")
    public ResponseEntity<DocumentDTO> update(
            @PathVariable Long id,
            @RequestBody DocumentUpdateRequest request,
            @AuthenticationPrincipal User user) {
        requireUser(user);
        return ResponseEntity.ok(documentService.update(id, user, request));
    }

    @Operation(summary = "Dokument löschen (nur Owner)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal User user) {
        requireUser(user);
        documentService.delete(id, user);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Mit einem anderen markt.ma-User teilen (nur Owner)")
    @PostMapping("/{id}/shares")
    public ResponseEntity<DocumentShareDTO> share(
            @PathVariable Long id,
            @RequestBody ShareDocumentRequest request,
            @AuthenticationPrincipal User user) {
        requireUser(user);
        return ResponseEntity.ok(documentService.share(id, user, request));
    }

    @Operation(summary = "Freigaben eines Dokuments auflisten (nur Owner)")
    @GetMapping("/{id}/shares")
    public ResponseEntity<List<DocumentShareDTO>> listShares(@PathVariable Long id, @AuthenticationPrincipal User user) {
        requireUser(user);
        return ResponseEntity.ok(documentService.listShares(id, user));
    }

    @Operation(summary = "Freigabe entfernen (nur Owner)")
    @DeleteMapping("/{id}/shares/{shareId}")
    public ResponseEntity<Void> unshare(
            @PathVariable Long id,
            @PathVariable Long shareId,
            @AuthenticationPrincipal User user) {
        requireUser(user);
        documentService.unshare(id, shareId, user);
        return ResponseEntity.noContent().build();
    }

    private void requireUser(User user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Nicht angemeldet");
        }
    }
}
