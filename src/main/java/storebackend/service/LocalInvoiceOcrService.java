package storebackend.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import storebackend.enums.InvoiceParseStatus;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/**
 * Lokaler OCR-Service für gescannte Rechnungen.
 * 
 * Verwendet Tesseract CLI (falls installiert) zur Text-Extraktion aus Scans.
 * KEINE externen APIs, KEINE Cloud-Services.
 * 
 * Phase 2B: Rohtext-Extraktion aus CamScanner-PDFs
 */
@Service
@Slf4j
public class LocalInvoiceOcrService {
    
    @Value("${invoice.ocr.tesseract-command:tesseract}")
    private String tesseractCommand;
    
    @Value("${invoice.ocr.languages:deu+eng}")
    private String languages;
    
    @Value("${invoice.ocr.dpi:300}")
    private int dpi;
    
    @Value("${invoice.ocr.timeout-seconds:60}")
    private long timeoutSeconds;
    
    @Value("${invoice.ocr.max-pages:20}")
    private int maxPages;
    
    @Value("${invoice.ocr.psm-mode:6}")
    private int psmMode;
    
    @Value("${invoice.ocr.max-concurrent-jobs:1}")
    private int maxConcurrentJobs;
    
    private Semaphore ocrSemaphore;
    
    /**
     * Initialisiert Semaphore nach Property-Injection.
     */
    public void init() {
        if (ocrSemaphore == null) {
            ocrSemaphore = new Semaphore(maxConcurrentJobs);
            log.info("✅ OCR-Service initialisiert: maxJobs={}, dpi={}, psm={}, languages={}", 
                maxConcurrentJobs, dpi, psmMode, languages);
        }
    }
    
    /**
     * Prüft ob Tesseract installiert ist.
     */
    public boolean isTesseractAvailable() {
        try {
            Process process = new ProcessBuilder(tesseractCommand, "--version")
                .redirectErrorStream(true)
                .start();
            boolean finished = process.waitFor(5, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return false;
            }
            return process.exitValue() == 0;
        } catch (Exception e) {
            log.debug("Tesseract nicht verfügbar: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Extrahiert Text aus gescannter PDF mittels OCR.
     * 
     * @param inputStream PDF-InputStream
     * @return OCR-Ergebnis mit Rohtext pro Seite
     */
    public OcrExtractionResult extractTextWithOcr(InputStream inputStream) {
        return extractTextWithOcr(inputStream, psmMode);
    }
    
    /**
     * Extrahiert Text aus gescannter PDF mittels OCR.
     * 
     * @param inputStream PDF-InputStream
     * @param customPsmMode Tesseract PSM-Modus (3, 4, 6, etc.)
     * @return OCR-Ergebnis mit Rohtext pro Seite
     */
    public OcrExtractionResult extractTextWithOcr(InputStream inputStream, int customPsmMode) {
        init(); // Semaphore sicherstellen
        
        long startTime = System.currentTimeMillis();
        
        // Tesseract-Verfügbarkeit prüfen
        if (!isTesseractAvailable()) {
            log.error("❌ Tesseract ist nicht installiert oder nicht im PATH");
            return new OcrExtractionResult(
                "",
                List.of(),
                0,
                tesseractCommand,
                List.of(languages),
                customPsmMode,
                System.currentTimeMillis() - startTime,
                InvoiceParseStatus.FAILED,
                "Tesseract ist nicht installiert. Bitte installieren: sudo apt-get install tesseract-ocr tesseract-ocr-deu tesseract-ocr-eng"
            );
        }
        
        // Parallele Jobs begrenzen
        boolean acquired = false;
        try {
            acquired = ocrSemaphore.tryAcquire(10, TimeUnit.SECONDS);
            if (!acquired) {
                log.warn("⚠️ OCR-Warteschlange voll, Request abgelehnt");
                return new OcrExtractionResult(
                    "",
                    List.of(),
                    0,
                    tesseractCommand,
                    List.of(languages),
                    customPsmMode,
                    System.currentTimeMillis() - startTime,
                    InvoiceParseStatus.FAILED,
                    "OCR-Service ausgelastet. Maximal " + maxConcurrentJobs + " parallele Jobs erlaubt."
                );
            }
            
            return performOcr(inputStream, customPsmMode, startTime);
            
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new OcrExtractionResult(
                "",
                List.of(),
                0,
                tesseractCommand,
                List.of(languages),
                customPsmMode,
                System.currentTimeMillis() - startTime,
                InvoiceParseStatus.FAILED,
                "OCR unterbrochen"
            );
        } finally {
            if (acquired) {
                ocrSemaphore.release();
            }
        }
    }
    
    /**
     * Führt OCR-Verarbeitung durch (intern, nach Semaphore-Acquire).
     */
    private OcrExtractionResult performOcr(InputStream inputStream, int customPsmMode, long startTime) {
        
        try (PDDocument document = PDDocument.load(inputStream)) {
            
            int pageCount = document.getNumberOfPages();
            if (pageCount > maxPages) {
                return new OcrExtractionResult(
                    "",
                    List.of(),
                    pageCount,
                    tesseractCommand,
                    List.of(languages),
                    customPsmMode,
                    System.currentTimeMillis() - startTime,
                    InvoiceParseStatus.FAILED,
                    "Zu viele Seiten: " + pageCount + " (Maximum: " + maxPages + ")"
                );
            }
            
            log.info("🔍 OCR-Analyse gestartet: {} Seiten @ {} DPI, PSM {}", pageCount, dpi, customPsmMode);
            
            PDFRenderer renderer = new PDFRenderer(document);
            List<String> textPerPage = new ArrayList<>();
            StringBuilder fullText = new StringBuilder();
            
            for (int i = 0; i < pageCount; i++) {
                log.info("  📄 Verarbeite Seite {}...", i + 1);
                
                // Seite als Bild rendern
                BufferedImage image = renderer.renderImageWithDPI(i, dpi);
                
                // OCR ausführen
                String pageText = performOcrOnImage(image, customPsmMode);
                textPerPage.add(pageText);
                fullText.append(pageText).append("\n\n");
                
                int pageChars = pageText.length();
                long pageLines = pageText.lines().filter(s -> !s.trim().isEmpty()).count();
                log.info("    ✅ {} Zeichen, {} Zeilen", pageChars, pageLines);
            }
            
            long duration = System.currentTimeMillis() - startTime;
            String rawText = fullText.toString();
            
            log.info("✅ OCR abgeschlossen: {} Zeichen in {} ms", rawText.length(), duration);
            
            return new OcrExtractionResult(
                rawText,
                textPerPage,
                pageCount,
                tesseractCommand,
                List.of(languages),
                customPsmMode,
                duration,
                InvoiceParseStatus.OCR_COMPLETED,  // ✅ Korrigiert: OCR_COMPLETED statt TEXT_EXTRACTED
                null
            );
            
        } catch (IOException e) {
            log.error("❌ OCR-Fehler", e);
            return new OcrExtractionResult(
                "",
                List.of(),
                0,
                tesseractCommand,
                List.of(languages),
                customPsmMode,
                System.currentTimeMillis() - startTime,
                InvoiceParseStatus.FAILED,
                "Fehler bei OCR-Verarbeitung: " + e.getMessage()
            );
        }
    }
    
    /**
     * Führt OCR auf einem Bild aus.
     * 
     * Verwendet Tesseract CLI mit sicherem ProcessBuilder.
     */
    private String performOcrOnImage(BufferedImage image, int customPsmMode) throws IOException {
        // Temporäres Verzeichnis (wird in finally gelöscht)
        Path tempDir = null;
        
        try {
            // Eindeutiges temporäres Verzeichnis mit UUID
            String uuid = UUID.randomUUID().toString();
            tempDir = Files.createTempDirectory("invoice-ocr-" + uuid);
            
            // Dateien im temp-Verzeichnis
            Path inputImage = tempDir.resolve("page.png");
            Path outputBase = tempDir.resolve("output");
            
            // Bild speichern
            ImageIO.write(image, "PNG", inputImage.toFile());
            
            // Tesseract aufrufen (SICHER: ProcessBuilder mit Argumentliste)
            ProcessBuilder pb = new ProcessBuilder(
                tesseractCommand,
                inputImage.toString(),
                outputBase.toString(),
                "-l", languages,
                "--psm", String.valueOf(customPsmMode)
            );
            pb.redirectErrorStream(true);
            
            Process process = pb.start();
            
            // Timeout setzen
            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new IOException("Tesseract-Timeout nach " + timeoutSeconds + " Sekunden");
            }
            
            // Exit-Code prüfen
            int exitCode = process.exitValue();
            if (exitCode != 0) {
                // Fehlerausgabe lesen (begrenzt)
                String error = readProcessOutput(process.getInputStream(), 500);
                throw new IOException("Tesseract Exit-Code " + exitCode + ": " + error);
            }
            
            // Text aus Output-Datei lesen (Tesseract fügt .txt an)
            Path outputFile = Path.of(outputBase.toString() + ".txt");
            if (Files.exists(outputFile)) {
                return Files.readString(outputFile);
            } else {
                return "";
            }
            
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("OCR unterbrochen", e);
        } finally {
            // Temporäres Verzeichnis IMMER rekursiv löschen
            if (tempDir != null) {
                deleteDirectoryRecursively(tempDir);
            }
        }
    }
    
    /**
     * Löscht Verzeichnis rekursiv.
     */
    private void deleteDirectoryRecursively(Path directory) {
        try {
            if (Files.exists(directory)) {
                Files.walk(directory)
                    .sorted((a, b) -> b.compareTo(a)) // Dateien vor Verzeichnissen
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException e) {
                            log.warn("Konnte nicht löschen: {}", path);
                        }
                    });
            }
        } catch (IOException e) {
            log.warn("Temp-Verzeichnis konnte nicht gelöscht werden: {}", directory);
        }
    }
    
    /**
     * Liest Process-Output begrenzt (verhindert Memory-Overflow).
     */
    private String readProcessOutput(InputStream inputStream, int maxChars) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {
            StringBuilder sb = new StringBuilder();
            int read = 0;
            int c;
            while ((c = reader.read()) != -1 && read < maxChars) {
                sb.append((char) c);
                read++;
            }
            return sb.toString();
        } catch (IOException e) {
            return "";
        }
    }
    
    /**
     * OCR-Extraktionsergebnis.
     * 
     * @param rawText Gesamter extrahierter Text
     * @param textPerPage Text pro Seite
     * @param pageCount Anzahl Seiten
     * @param engine Verwendete OCR-Engine (z.B. "tesseract")
     * @param languages Verwendete Sprachen
     * @param psmMode Verwendeter PSM-Modus
     * @param durationMs Laufzeit in Millisekunden
     * @param status Parse-Status (OCR_COMPLETED oder FAILED)
     * @param errorMessage Fehlermeldung (falls status == FAILED)
     */
    public record OcrExtractionResult(
        String rawText,
        List<String> textPerPage,
        int pageCount,
        String engine,
        List<String> languages,
        int psmMode,
        long durationMs,
        InvoiceParseStatus status,
        String errorMessage
    ) {}
}
