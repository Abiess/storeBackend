package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.SupplierInvoiceDocumentDTO;
import storebackend.entity.Store;
import storebackend.entity.SupplierInvoiceDocument;
import storebackend.entity.User;
import storebackend.enums.SupplierInvoiceUploadStatus;
import storebackend.repository.SupplierInvoiceDocumentRepository;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SupplierInvoiceDocumentService {

    private final SupplierInvoiceDocumentRepository documentRepository;
    private final SupplierInvoiceDocumentValidator validator;
    private final MinioService minioService;

    /**
     * Upload einer Lieferantenrechnung (PDF oder Bild)
     */
    @Transactional
    public SupplierInvoiceDocumentDTO uploadDocument(
            MultipartFile file,
            Store store,
            User uploadedBy
    ) throws IOException {
        // 1. Validierung
        validator.validateDocument(file);

        // 2. Eindeutigen Storage-Namen generieren
        String extension = validator.getFileExtension(file.getOriginalFilename());
        String storageObjectName = String.format(
                "stores/%d/supplier-invoices/%s%s",
                store.getId(),
                UUID.randomUUID().toString(),
                extension
        );

        // 3. Upload in PRIVATEN MinIO-Bucket
        try (InputStream inputStream = file.getInputStream()) {
            String privateBucket = minioService.getPrivateBucket();
            if (privateBucket == null || privateBucket.isEmpty()) {
                throw new RuntimeException("Privater Bucket nicht konfiguriert");
            }

            minioService.uploadToPrivateBucket(
                    inputStream,
                    file.getSize(),
                    file.getContentType(),
                    storageObjectName
            );

            log.info("✅ Dokument hochgeladen in PRIVATEN Bucket: {}", storageObjectName);
        } catch (Exception e) {
            log.error("Fehler beim Upload in MinIO", e);
            throw new RuntimeException("Fehler beim Hochladen der Datei: " + e.getMessage());
        }

        // 4. PDF-Seitenzahl ermitteln (falls PDF)
        Integer pageCount = null;
        if (file.getContentType().equals("application/pdf")) {
            try (InputStream pdfStream = file.getInputStream();
                 PDDocument doc = PDDocument.load(pdfStream)) {
                pageCount = doc.getNumberOfPages();
                log.info("PDF hat {} Seiten", pageCount);
            } catch (Exception e) {
                log.warn("Konnte PDF-Seitenzahl nicht ermitteln: {}", e.getMessage());
            }
        }

        // 5. Datenbank-Eintrag erstellen
        SupplierInvoiceDocument document = new SupplierInvoiceDocument();
        document.setStore(store);
        document.setOriginalFilename(file.getOriginalFilename());
        document.setStorageObjectName(storageObjectName);
        document.setMimeType(file.getContentType());
        document.setFileSize(file.getSize());
        document.setPageCount(pageCount);
        document.setUploadStatus(SupplierInvoiceUploadStatus.UPLOADED);
        document.setUploadedBy(uploadedBy);

        document = documentRepository.save(document);

        log.info("✅ Lieferantenrechnung gespeichert: ID={}, Store={}, Datei={}",
                document.getId(), store.getId(), file.getOriginalFilename());

        return convertToDTO(document);
    }

    /**
     * Alle Dokumente eines Stores abrufen
     */
    @Transactional(readOnly = true)
    public List<SupplierInvoiceDocumentDTO> getDocumentsByStore(Long storeId) {
        List<SupplierInvoiceDocument> documents = documentRepository.findByStoreId(storeId);
        return documents.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Einzelnes Dokument abrufen (mit Multi-Tenant-Prüfung)
     */
    @Transactional(readOnly = true)
    public SupplierInvoiceDocument getDocument(Long documentId, Long storeId) {
        return documentRepository.findByIdAndStoreId(documentId, storeId)
                .orElseThrow(() -> new RuntimeException("Dokument nicht gefunden"));
    }

    /**
     * Dokument-Inhalt als InputStream abrufen (für Download)
     */
    public InputStream getDocumentContent(Long documentId, Long storeId) {
        SupplierInvoiceDocument document = getDocument(documentId, storeId);
        try {
            return minioService.getFileFromPrivateBucket(document.getStorageObjectName());
        } catch (Exception e) {
            log.error("Fehler beim Abrufen des Dokuments aus MinIO", e);
            throw new RuntimeException("Fehler beim Laden der Datei");
        }
    }

    /**
     * Dokument löschen (DB + MinIO)
     */
    @Transactional
    public void deleteDocument(Long documentId, Long storeId) {
        SupplierInvoiceDocument document = getDocument(documentId, storeId);

        // 1. Aus MinIO löschen
        try {
            minioService.deleteFileFromPrivateBucket(document.getStorageObjectName());
            log.info("✅ Dokument aus MinIO gelöscht: {}", document.getStorageObjectName());
        } catch (Exception e) {
            log.error("⚠️  Fehler beim Löschen aus MinIO: {}", e.getMessage());
            // Trotzdem weitermachen, damit DB-Eintrag entfernt wird
        }

        // 2. Aus DB löschen
        documentRepository.delete(document);
        log.info("✅ Dokument aus DB gelöscht: ID={}, Store={}", documentId, storeId);
    }

    /**
     * Anzahl Dokumente für einen Store
     */
    public long countDocumentsByStore(Long storeId) {
        return documentRepository.countByStoreId(storeId);
    }

    /**
     * Entity zu DTO konvertieren
     */
    private SupplierInvoiceDocumentDTO convertToDTO(SupplierInvoiceDocument document) {
        SupplierInvoiceDocumentDTO dto = new SupplierInvoiceDocumentDTO();
        dto.setId(document.getId());
        dto.setStoreId(document.getStore().getId());
        dto.setOriginalFilename(document.getOriginalFilename());
        dto.setMimeType(document.getMimeType());
        dto.setFileSize(document.getFileSize());
        dto.setPageCount(document.getPageCount());
        dto.setUploadStatus(document.getUploadStatus().name());
        dto.setUploadedByUsername(document.getUploadedBy().getEmail());
        dto.setCreatedAt(document.getCreatedAt());
        dto.setUpdatedAt(document.getUpdatedAt());
        return dto;
    }
}
