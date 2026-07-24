package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.SupplierInvoiceDocumentDTO;
import storebackend.entity.Store;
import storebackend.entity.SupplierInvoiceDocument;
import storebackend.entity.User;
import storebackend.enums.SupplierInvoiceUploadStatus;
import storebackend.repository.SupplierInvoiceDocumentRepository;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SupplierInvoiceDocumentService Tests - Multi-Tenant Security")
class SupplierInvoiceDocumentServiceTest {

    @Mock
    private SupplierInvoiceDocumentRepository documentRepository;

    @Mock
    private SupplierInvoiceDocumentValidator validator;

    @Mock
    private MinioService minioService;

    @InjectMocks
    private SupplierInvoiceDocumentService documentService;

    private Store storeA;
    private Store storeB;
    private User ownerA;
    private User ownerB;

    @BeforeEach
    void setUp() {
        // Store A
        storeA = new Store();
        storeA.setId(1L);
        storeA.setName("Store A");

        ownerA = new User();
        ownerA.setId(10L);
        ownerA.setEmail("owner-a@example.com");

        // Store B
        storeB = new Store();
        storeB.setId(2L);
        storeB.setName("Store B");

        ownerB = new User();
        ownerB.setId(20L);
        ownerB.setEmail("owner-b@example.com");
    }

    @Test
    @DisplayName("✅ Owner lädt gültige PDF hoch - Erfolg")
    void testOwnerUploadValidPdf() throws IOException {
        // Arrange
        byte[] pdfContent = createMockPdfContent();
        MultipartFile file = new MockMultipartFile(
                "file",
                "rechnung.pdf",
                "application/pdf",
                pdfContent
        );

        when(minioService.getPrivateBucket()).thenReturn("store-private-documents");
        doNothing().when(minioService).uploadToPrivateBucket(any(), anyLong(), anyString(), anyString());
        doNothing().when(validator).validateDocument(any());

        SupplierInvoiceDocument savedDoc = new SupplierInvoiceDocument();
        savedDoc.setId(100L);
        savedDoc.setStore(storeA);
        savedDoc.setOriginalFilename("rechnung.pdf");
        savedDoc.setMimeType("application/pdf");
        savedDoc.setFileSize((long) pdfContent.length);
        savedDoc.setUploadStatus(SupplierInvoiceUploadStatus.UPLOADED);
        savedDoc.setUploadedBy(ownerA);

        when(documentRepository.save(any(SupplierInvoiceDocument.class))).thenReturn(savedDoc);

        // Act
        SupplierInvoiceDocumentDTO result = documentService.uploadDocument(file, storeA, ownerA);

        // Assert
        assertNotNull(result);
        assertEquals(100L, result.getId());
        assertEquals("rechnung.pdf", result.getOriginalFilename());
        assertEquals("application/pdf", result.getMimeType());
        verify(validator, times(1)).validateDocument(file);
        verify(minioService, times(1)).uploadToPrivateBucket(any(), anyLong(), eq("application/pdf"), anyString());
        verify(documentRepository, times(1)).save(any(SupplierInvoiceDocument.class));
    }

    @Test
    @DisplayName("✅ Owner lädt gültiges JPEG hoch - Erfolg")
    void testOwnerUploadValidJpeg() throws IOException {
        // Arrange
        byte[] jpegContent = createMockJpegContent();
        MultipartFile file = new MockMultipartFile(
                "file",
                "rechnung.jpg",
                "image/jpeg",
                jpegContent
        );

        when(minioService.getPrivateBucket()).thenReturn("store-private-documents");
        doNothing().when(minioService).uploadToPrivateBucket(any(), anyLong(), anyString(), anyString());
        doNothing().when(validator).validateDocument(any());

        SupplierInvoiceDocument savedDoc = new SupplierInvoiceDocument();
        savedDoc.setId(101L);
        savedDoc.setStore(storeA);
        savedDoc.setOriginalFilename("rechnung.jpg");
        savedDoc.setMimeType("image/jpeg");
        savedDoc.setFileSize((long) jpegContent.length);
        savedDoc.setUploadStatus(SupplierInvoiceUploadStatus.UPLOADED);
        savedDoc.setUploadedBy(ownerA);

        when(documentRepository.save(any(SupplierInvoiceDocument.class))).thenReturn(savedDoc);

        // Act
        SupplierInvoiceDocumentDTO result = documentService.uploadDocument(file, storeA, ownerA);

        // Assert
        assertNotNull(result);
        assertEquals("rechnung.jpg", result.getOriginalFilename());
        assertEquals("image/jpeg", result.getMimeType());
    }

    @Test
    @DisplayName("❌ Privater Bucket nicht konfiguriert - Fehler")
    void testUploadWithoutPrivateBucket() throws IOException {
        MultipartFile file = new MockMultipartFile(
                "file",
                "rechnung.pdf",
                "application/pdf",
                createMockPdfContent()
        );

        when(minioService.getPrivateBucket()).thenReturn(null);
        doNothing().when(validator).validateDocument(any());

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> documentService.uploadDocument(file, storeA, ownerA));
        assertTrue(exception.getMessage().contains("Privater Bucket nicht konfiguriert"));
    }

    @Test
    @DisplayName("✅ Store A kann eigene Dokumente abrufen")
    void testStoreACanReadOwnDocuments() {
        // Arrange
        SupplierInvoiceDocument doc1 = createMockDocument(100L, storeA, ownerA);
        SupplierInvoiceDocument doc2 = createMockDocument(101L, storeA, ownerA);

        when(documentRepository.findByStoreId(1L)).thenReturn(Arrays.asList(doc1, doc2));

        // Act
        List<SupplierInvoiceDocumentDTO> result = documentService.getDocumentsByStore(1L);

        // Assert
        assertNotNull(result);
        assertEquals(2, result.size());
        verify(documentRepository, times(1)).findByStoreId(1L);
    }

    @Test
    @DisplayName("✅ Store A kann eigenes Dokument lesen")
    void testStoreACanReadOwnDocument() {
        // Arrange
        SupplierInvoiceDocument doc = createMockDocument(100L, storeA, ownerA);
        when(documentRepository.findByIdAndStoreId(100L, 1L)).thenReturn(Optional.of(doc));

        // Act
        SupplierInvoiceDocument result = documentService.getDocument(100L, 1L);

        // Assert
        assertNotNull(result);
        assertEquals(100L, result.getId());
        assertEquals(1L, result.getStore().getId());
        verify(documentRepository, times(1)).findByIdAndStoreId(100L, 1L);
    }

    @Test
    @DisplayName("❌ Store B kann Dokument von Store A NICHT lesen")
    void testStoreBCannotReadStoreADocument() {
        // Arrange
        when(documentRepository.findByIdAndStoreId(100L, 2L)).thenReturn(Optional.empty());

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> documentService.getDocument(100L, 2L));
        assertTrue(exception.getMessage().contains("nicht gefunden"));
        verify(documentRepository, times(1)).findByIdAndStoreId(100L, 2L);
        // WICHTIG: Repository-Query muss IMMER storeId einbeziehen!
    }

    @Test
    @DisplayName("❌ Store B kann Dokument von Store A NICHT herunterladen")
    void testStoreBCannotDownloadStoreADocument() {
        // Arrange
        when(documentRepository.findByIdAndStoreId(100L, 2L)).thenReturn(Optional.empty());

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> documentService.getDocumentContent(100L, 2L));
        assertTrue(exception.getMessage().contains("nicht gefunden"));
    }

    @Test
    @DisplayName("✅ Store A kann eigenes Dokument löschen")
    void testStoreACanDeleteOwnDocument() {
        // Arrange
        SupplierInvoiceDocument doc = createMockDocument(100L, storeA, ownerA);
        doc.setStorageObjectName("stores/1/supplier-invoices/uuid.pdf");

        when(documentRepository.findByIdAndStoreId(100L, 1L)).thenReturn(Optional.of(doc));
        doNothing().when(minioService).deleteFileFromPrivateBucket(anyString());
        doNothing().when(documentRepository).delete(any());

        // Act
        assertDoesNotThrow(() -> documentService.deleteDocument(100L, 1L));

        // Assert
        verify(minioService, times(1)).deleteFileFromPrivateBucket("stores/1/supplier-invoices/uuid.pdf");
        verify(documentRepository, times(1)).delete(doc);
    }

    @Test
    @DisplayName("❌ Store B kann Dokument von Store A NICHT löschen")
    void testStoreBCannotDeleteStoreADocument() {
        // Arrange
        when(documentRepository.findByIdAndStoreId(100L, 2L)).thenReturn(Optional.empty());

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> documentService.deleteDocument(100L, 2L));
        assertTrue(exception.getMessage().contains("nicht gefunden"));
        verify(minioService, never()).deleteFileFromPrivateBucket(anyString());
        verify(documentRepository, never()).delete(any());
    }

    @Test
    @DisplayName("✅ MinIO-Löschung schlägt fehl - DB-Eintrag wird trotzdem gelöscht")
    void testDeleteWithMinioFailure() {
        // Arrange
        SupplierInvoiceDocument doc = createMockDocument(100L, storeA, ownerA);
        doc.setStorageObjectName("stores/1/supplier-invoices/uuid.pdf");

        when(documentRepository.findByIdAndStoreId(100L, 1L)).thenReturn(Optional.of(doc));
        doThrow(new RuntimeException("MinIO error")).when(minioService).deleteFileFromPrivateBucket(anyString());
        doNothing().when(documentRepository).delete(any());

        // Act
        assertDoesNotThrow(() -> documentService.deleteDocument(100L, 1L));

        // Assert
        verify(minioService, times(1)).deleteFileFromPrivateBucket(anyString());
        verify(documentRepository, times(1)).delete(doc); // Wird trotzdem gelöscht
    }

    @Test
    @DisplayName("✅ Anzahl Dokumente für Store korrekt")
    void testCountDocumentsByStore() {
        // Arrange
        when(documentRepository.countByStoreId(1L)).thenReturn(5L);

        // Act
        long count = documentService.countDocumentsByStore(1L);

        // Assert
        assertEquals(5L, count);
        verify(documentRepository, times(1)).countByStoreId(1L);
    }

    // Helper-Methoden

    private SupplierInvoiceDocument createMockDocument(Long id, Store store, User uploadedBy) {
        SupplierInvoiceDocument doc = new SupplierInvoiceDocument();
        doc.setId(id);
        doc.setStore(store);
        doc.setOriginalFilename("rechnung.pdf");
        doc.setStorageObjectName("stores/" + store.getId() + "/supplier-invoices/uuid.pdf");
        doc.setMimeType("application/pdf");
        doc.setFileSize(1024L);
        doc.setPageCount(3);
        doc.setUploadStatus(SupplierInvoiceUploadStatus.UPLOADED);
        doc.setUploadedBy(uploadedBy);
        return doc;
    }

    private byte[] createMockPdfContent() {
        byte[] magic = new byte[]{0x25, 0x50, 0x44, 0x46}; // %PDF
        byte[] content = new byte[1024];
        System.arraycopy(magic, 0, content, 0, magic.length);
        return content;
    }

    private byte[] createMockJpegContent() {
        byte[] magic = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
        byte[] content = new byte[1024];
        System.arraycopy(magic, 0, content, 0, magic.length);
        return content;
    }
}
