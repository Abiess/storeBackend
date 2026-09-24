package storebackend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Service
@Slf4j
public class SupplierInvoiceDocumentValidator {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    // Erlaubte MIME-Types für Lieferantenrechnungen
    private static final List<String> ALLOWED_MIME_TYPES = Arrays.asList(
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
    );

    // Magic Bytes für Dateityp-Validierung
    private static final byte[] PDF_MAGIC = new byte[]{0x25, 0x50, 0x44, 0x46}; // %PDF
    private static final byte[] JPEG_MAGIC = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_MAGIC = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47};
    private static final byte[] WEBP_MAGIC = new byte[]{0x52, 0x49, 0x46, 0x46}; // RIFF

    /**
     * Validiert eine Lieferantenrechnungs-Datei
     */
    public void validateDocument(MultipartFile file) throws IOException {
        // 1. Leere Datei prüfen
        if (file.isEmpty() || file.getSize() == 0) {
            throw new RuntimeException("Die Datei ist leer");
        }

        // 2. Dateigröße prüfen
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("Die Datei ist zu groß. Maximum: 10 MB");
        }

        // 3. Original-Dateiname prüfen
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new RuntimeException("Kein Dateiname angegeben");
        }

        // 4. Doppelendungen verhindern (z.B. rechnung.pdf.exe)
        String lowerFilename = originalFilename.toLowerCase();
        if (lowerFilename.contains(".exe") || lowerFilename.contains(".bat") || 
            lowerFilename.contains(".cmd") || lowerFilename.contains(".com") ||
            lowerFilename.contains(".scr") || lowerFilename.contains(".vbs")) {
            throw new RuntimeException("Verdächtige Dateiendung erkannt");
        }

        // 5. MIME-Type prüfen
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            throw new RuntimeException("Ungültiger Dateityp. Erlaubt: PDF, JPEG, PNG, WEBP");
        }

        // 6. Magic Bytes prüfen (tatsächlichen Dateityp verifizieren)
        byte[] fileBytes = file.getBytes();
        if (fileBytes.length < 4) {
            throw new RuntimeException("Datei zu klein oder beschädigt");
        }

        boolean validMagicBytes = false;

        if (contentType.equals("application/pdf")) {
            validMagicBytes = startsWithMagicBytes(fileBytes, PDF_MAGIC);
            if (!validMagicBytes) {
                throw new RuntimeException("Datei ist keine gültige PDF-Datei");
            }
        } else if (contentType.startsWith("image/jpeg") || contentType.startsWith("image/jpg")) {
            validMagicBytes = startsWithMagicBytes(fileBytes, JPEG_MAGIC);
            if (!validMagicBytes) {
                throw new RuntimeException("Datei ist kein gültiges JPEG-Bild");
            }
        } else if (contentType.equals("image/png")) {
            validMagicBytes = startsWithMagicBytes(fileBytes, PNG_MAGIC);
            if (!validMagicBytes) {
                throw new RuntimeException("Datei ist kein gültiges PNG-Bild");
            }
        } else if (contentType.equals("image/webp")) {
            validMagicBytes = startsWithMagicBytes(fileBytes, WEBP_MAGIC);
            if (!validMagicBytes) {
                throw new RuntimeException("Datei ist kein gültiges WEBP-Bild");
            }
        }

        log.info("✅ Dokument-Validierung erfolgreich: {} ({} bytes, {})", 
                originalFilename, file.getSize(), contentType);
    }

    /**
     * Prüft ob Datei mit erwarteten Magic Bytes beginnt
     */
    private boolean startsWithMagicBytes(byte[] fileBytes, byte[] magicBytes) {
        if (fileBytes.length < magicBytes.length) {
            return false;
        }
        for (int i = 0; i < magicBytes.length; i++) {
            if (fileBytes[i] != magicBytes[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Extrahiert Dateierweiterung aus Filename
     */
    public String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".")).toLowerCase();
    }
}
