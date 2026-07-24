package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("SupplierInvoiceDocumentValidator Tests")
class SupplierInvoiceDocumentValidatorTest {

    private SupplierInvoiceDocumentValidator validator;

    // Magic Bytes
    private static final byte[] PDF_MAGIC = new byte[]{0x25, 0x50, 0x44, 0x46}; // %PDF
    private static final byte[] JPEG_MAGIC = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_MAGIC = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] WEBP_MAGIC = new byte[]{0x52, 0x49, 0x46, 0x46}; // RIFF

    @BeforeEach
    void setUp() {
        validator = new SupplierInvoiceDocumentValidator();
    }

    @Test
    @DisplayName("✅ Gültiges PDF wird akzeptiert")
    void testValidPdf() throws IOException {
        byte[] pdfContent = createMockPdfContent();
        MultipartFile file = new MockMultipartFile(
                "file",
                "rechnung.pdf",
                "application/pdf",
                pdfContent
        );

        assertDoesNotThrow(() -> validator.validateDocument(file));
    }

    @Test
    @DisplayName("✅ Gültiges JPEG wird akzeptiert")
    void testValidJpeg() throws IOException {
        byte[] jpegContent = createMockJpegContent();
        MultipartFile file = new MockMultipartFile(
                "file",
                "rechnung.jpg",
                "image/jpeg",
                jpegContent
        );

        assertDoesNotThrow(() -> validator.validateDocument(file));
    }

    @Test
    @DisplayName("✅ Gültiges PNG wird akzeptiert")
    void testValidPng() throws IOException {
        byte[] pngContent = createMockPngContent();
        MultipartFile file = new MockMultipartFile(
                "file",
                "rechnung.png",
                "image/png",
                pngContent
        );

        assertDoesNotThrow(() -> validator.validateDocument(file));
    }

    @Test
    @DisplayName("✅ Gültiges WEBP wird akzeptiert")
    void testValidWebp() throws IOException {
        byte[] webpContent = createMockWebpContent();
        MultipartFile file = new MockMultipartFile(
                "file",
                "rechnung.webp",
                "image/webp",
                webpContent
        );

        assertDoesNotThrow(() -> validator.validateDocument(file));
    }

    @Test
    @DisplayName("❌ Leere Datei wird abgelehnt")
    void testEmptyFile() {
        MultipartFile file = new MockMultipartFile(
                "file",
                "rechnung.pdf",
                "application/pdf",
                new byte[0]
        );

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> validator.validateDocument(file));
        assertTrue(exception.getMessage().contains("leer"));
    }

    @Test
    @DisplayName("❌ Datei über 10 MB wird abgelehnt")
    void testFileTooLarge() {
        byte[] largeContent = new byte[11 * 1024 * 1024]; // 11 MB
        System.arraycopy(PDF_MAGIC, 0, largeContent, 0, PDF_MAGIC.length);

        MultipartFile file = new MockMultipartFile(
                "file",
                "rechnung.pdf",
                "application/pdf",
                largeContent
        );

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> validator.validateDocument(file));
        assertTrue(exception.getMessage().contains("zu groß"));
    }

    @Test
    @DisplayName("❌ Ungültiger MIME-Type wird abgelehnt")
    void testInvalidMimeType() throws IOException {
        MultipartFile file = new MockMultipartFile(
                "file",
                "rechnung.zip",  // ZIP hat keine verdächtige Endung wie .exe
                "application/zip",
                new byte[100]
        );

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> validator.validateDocument(file));
        String message = exception.getMessage();
        assertTrue(message.contains("Ungültiger Dateityp") || message.contains("Dateityp"),
                "Expected error message about invalid file type, but got: " + message);
    }

    @Test
    @DisplayName("❌ Verdächtige Dateiendung wird abgelehnt")
    void testSuspiciousFileExtension() {
        MultipartFile file = new MockMultipartFile(
                "file",
                "rechnung.pdf.exe",
                "application/pdf",
                createMockPdfContent()
        );

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> validator.validateDocument(file));
        assertTrue(exception.getMessage().contains("Verdächtige Dateiendung"));
    }

    @Test
    @DisplayName("❌ PDF mit falschen Magic Bytes wird abgelehnt")
    void testPdfWithWrongMagicBytes() {
        byte[] fakeContent = "NOT A PDF".getBytes();

        MultipartFile file = new MockMultipartFile(
                "file",
                "rechnung.pdf",
                "application/pdf",
                fakeContent
        );

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> validator.validateDocument(file));
        assertTrue(exception.getMessage().contains("keine gültige PDF-Datei"));
    }

    @Test
    @DisplayName("❌ JPEG mit falschen Magic Bytes wird abgelehnt")
    void testJpegWithWrongMagicBytes() {
        byte[] fakeContent = "NOT A JPEG".getBytes();

        MultipartFile file = new MockMultipartFile(
                "file",
                "rechnung.jpg",
                "image/jpeg",
                fakeContent
        );

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> validator.validateDocument(file));
        assertTrue(exception.getMessage().contains("kein gültiges JPEG-Bild"));
    }

    @Test
    @DisplayName("❌ PNG mit falschen Magic Bytes wird abgelehnt")
    void testPngWithWrongMagicBytes() {
        byte[] fakeContent = "NOT A PNG".getBytes();

        MultipartFile file = new MockMultipartFile(
                "file",
                "rechnung.png",
                "image/png",
                fakeContent
        );

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> validator.validateDocument(file));
        assertTrue(exception.getMessage().contains("kein gültiges PNG-Bild"));
    }

    @Test
    @DisplayName("❌ Datei zu klein / beschädigt")
    void testFileTooSmall() {
        MultipartFile file = new MockMultipartFile(
                "file",
                "rechnung.pdf",
                "application/pdf",
                new byte[]{0x25} // Nur 1 Byte
        );

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> validator.validateDocument(file));
        assertTrue(exception.getMessage().contains("zu klein") ||
                   exception.getMessage().contains("beschädigt") ||
                   exception.getMessage().contains("keine gültige PDF"));
    }

    @Test
    @DisplayName("✅ Dateiendung wird korrekt extrahiert")
    void testGetFileExtension() {
        assertEquals(".pdf", validator.getFileExtension("rechnung.pdf"));
        assertEquals(".jpg", validator.getFileExtension("rechnung.jpg"));
        assertEquals(".png", validator.getFileExtension("image.PNG"));
        assertEquals("", validator.getFileExtension("noextension"));
        assertEquals("", validator.getFileExtension(null));
    }

    // Helper-Methoden zum Erstellen von Mock-Dateien mit korrekten Magic Bytes

    private byte[] createMockPdfContent() {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try {
            baos.write(PDF_MAGIC);
            baos.write("-1.4\n".getBytes());
            baos.write("%%EOF\n".getBytes());
            // Minimal-PDF (nicht vollständig gültig, aber Magic Bytes korrekt)
            byte[] padding = new byte[1000];
            baos.write(padding);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        return baos.toByteArray();
    }

    private byte[] createMockJpegContent() {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try {
            baos.write(JPEG_MAGIC);
            byte[] padding = new byte[1000];
            baos.write(padding);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        return baos.toByteArray();
    }

    private byte[] createMockPngContent() {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try {
            baos.write(PNG_MAGIC);
            byte[] padding = new byte[1000];
            baos.write(padding);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        return baos.toByteArray();
    }

    private byte[] createMockWebpContent() {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try {
            baos.write(WEBP_MAGIC);
            byte[] padding = new byte[1000];
            baos.write(padding);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        return baos.toByteArray();
    }
}
