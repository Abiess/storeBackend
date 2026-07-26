package storebackend.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import storebackend.dto.ParsedInvoiceLine;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service für PaddleOCR-basierte Rechnungserkennung.
 * 
 * Ruft internen FastAPI-Mikroservice auf.
 */
@Service
public class PaddleOcrService {
    
    private final RestTemplate restTemplate;
    private final String ocrServiceUrl;
    
    public PaddleOcrService(
        RestTemplate restTemplate,
        @Value("${ocr.service.url:http://localhost:8001}") String ocrServiceUrl
    ) {
        this.restTemplate = restTemplate;
        this.ocrServiceUrl = ocrServiceUrl;
    }
    
    /**
     * Parst PDF-Rechnung mit PaddleOCR.
     * 
     * @param pdfBytes PDF-Datei als Byte-Array
     * @return Liste von ParsedInvoiceLines
     * @throws OcrServiceException bei Fehler
     */
    public List<ParsedInvoiceLine> parseInvoice(byte[] pdfBytes) {
        try {
            // Multipart-Request bauen
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new ByteArrayResource(pdfBytes) {
                @Override
                public String getFilename() {
                    return "invoice.pdf";
                }
            });
            
            HttpEntity<MultiValueMap<String, Object>> requestEntity = 
                new HttpEntity<>(body, headers);
            
            // POST zu FastAPI
            ResponseEntity<PaddleOcrResponse> response = restTemplate.exchange(
                ocrServiceUrl + "/ocr/parse",
                HttpMethod.POST,
                requestEntity,
                PaddleOcrResponse.class
            );
            
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new OcrServiceException("OCR-Service lieferte keinen Response");
            }
            
            PaddleOcrResponse ocrResult = response.getBody();
            
            // PaddleOCR Lines → ParsedInvoiceLine konvertieren
            return ocrResult.getLines().stream()
                .map(this::convertToInvoiceLine)
                .collect(Collectors.toList());
            
        } catch (Exception e) {
            throw new OcrServiceException("Fehler beim OCR-Service-Aufruf: " + e.getMessage(), e);
        }
    }
    
    /**
     * Health Check des OCR-Service.
     */
    public boolean isHealthy() {
        try {
            ResponseEntity<HealthResponse> response = restTemplate.getForEntity(
                ocrServiceUrl + "/health",
                HealthResponse.class
            );
            return response.getStatusCode().is2xxSuccessful() 
                && response.getBody() != null 
                && response.getBody().isEngineLoaded();
        } catch (Exception e) {
            return false;
        }
    }
    
    private ParsedInvoiceLine convertToInvoiceLine(PaddleOcrLine line) {
        return new ParsedInvoiceLine(
            line.getPositionNumber(),
            line.getSupplierArticleNumber(),
            line.getDescription(),
            line.getQuantity(),
            line.getUnit(),
            line.getPackagingUnit(),
            line.getUnitPrice(),
            line.getLineTotal(),
            line.getTaxRate(),
            line.getConfidence() != null ? line.getConfidence() : 0.9,
            line.getWarnings(),
            "PaddleOCR"
        );
    }
    
    // DTOs
    @Data
    public static class PaddleOcrResponse {
        private boolean success;
        private int pages;
        @JsonProperty("tables_detected")
        private int tablesDetected;
        private List<PaddleOcrLine> lines;
        @JsonProperty("processing_time_seconds")
        private double processingTimeSeconds;
        @JsonProperty("memory_peak_mb")
        private double memoryPeakMb;
    }
    
    @Data
    public static class PaddleOcrLine {
        @JsonProperty("positionNumber")
        private Integer positionNumber;
        @JsonProperty("supplierArticleNumber")
        private String supplierArticleNumber;
        private String description;
        private Double quantity;
        private String unit;
        @JsonProperty("packagingUnit")
        private Double packagingUnit;
        @JsonProperty("unitPrice")
        private Double unitPrice;
        @JsonProperty("lineTotal")
        private Double lineTotal;
        @JsonProperty("taxRate")
        private Double taxRate;
        private Double confidence;
        private List<String> warnings;
    }
    
    @Data
    public static class HealthResponse {
        private String status;
        @JsonProperty("engine_loaded")
        private boolean engineLoaded;
    }
    
    public static class OcrServiceException extends RuntimeException {
        public OcrServiceException(String message) {
            super(message);
        }
        
        public OcrServiceException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
