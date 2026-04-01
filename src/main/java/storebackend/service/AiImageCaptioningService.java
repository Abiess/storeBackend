package storebackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.AiProductSuggestionDTO;
import storebackend.exception.AiServiceException;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;

@Service
@Slf4j
public class AiImageCaptioningService {

    // Using Hugging Face Router API with external image URLs (not base64)
    private static final String HUGGINGFACE_API_URL = "https://router.huggingface.co/v1/responses";
    // Using router-compatible vision model - tested and working with curl
    private static final String MODEL_NAME = "zai-org/GLM-4.5V";

    // Image compression settings - aggressive to reduce payload
    private static final int MAX_IMAGE_WIDTH = 768;
    private static final int MAX_IMAGE_HEIGHT = 768;
    private static final float JPEG_QUALITY = 0.65f;

    @Value("${huggingface.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final MinioService minioService;

    public AiImageCaptioningService(RestTemplate restTemplate, ObjectMapper objectMapper, MinioService minioService) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.minioService = minioService;
        log.info("🤖 AiImageCaptioningService initialized");
        log.info("🔑 API Key configured: {}", apiKey != null && !apiKey.isBlank() ? "YES" : "NO");
    }

    /**
     * Generates product suggestions from an uploaded image using Hugging Face AI
     */
    public AiProductSuggestionDTO generateProductSuggestion(MultipartFile imageFile) throws IOException {
        log.info("=== AI GENERATION START ===");
        log.info("Image: {} ({} bytes)", imageFile.getOriginalFilename(), imageFile.getSize());
        log.info("API Key present: {}", apiKey != null && !apiKey.isBlank());
        
        if (apiKey == null || apiKey.isBlank()) {
            log.error("❌ Hugging Face API key is not configured!");
            throw new AiServiceException("Hugging Face API key is not configured. Please set HUGGINGFACE_API_KEY environment variable.");
        }

        log.info("Generating AI product suggestion for image: {}", imageFile.getOriginalFilename());

        // Convert and compress image to optimized JPEG
        byte[] imageBytes = imageFile.getBytes();
        byte[] optimizedImageBytes = compressAndResizeImage(imageBytes);
        
        log.info("Image optimized: {} bytes → {} bytes", imageBytes.length, optimizedImageBytes.length);

        // Call Hugging Face API
        String caption = callHuggingFaceApi(optimizedImageBytes);

        log.info("AI generated caption: {}", caption);

        // Generate product title and description from caption
        AiProductSuggestionDTO suggestion = new AiProductSuggestionDTO();
        suggestion.setGeneratedCaption(caption);
        suggestion.setTitle(generateTitle(caption));
        suggestion.setDescription(generateDescription(caption));

        return suggestion;
    }

    /**
     * Calls Hugging Face Router API with external image URL (not base64)
     * Router API does not support base64 images, only external URLs
     * @throws AiServiceException if API call fails or response cannot be parsed
     */
    private String callHuggingFaceApi(byte[] imageBytes) {
        String tempImageUrl = null;
        try {
            log.info("Calling Hugging Face Router API: {}", HUGGINGFACE_API_URL);
            log.info("Model: {}", MODEL_NAME);
            
            // Upload image to MinIO temporarily and get public URL
            // Router API requires external URL, not base64
            log.info("Uploading compressed image to MinIO for AI processing...");
            tempImageUrl = minioService.uploadTemporaryFile(imageBytes, "image/jpeg", 60); // 60 minutes expiry
            log.info("Image uploaded to temporary URL: {}", tempImageUrl.substring(0, Math.min(100, tempImageUrl.length())) + "...");
            
            // Create headers for JSON request
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            // Build request body with correct Hugging Face Responses API multimodal format
            // Use external image URL instead of base64 data URI
            Map<String, Object> requestBody = Map.of(
                "model", MODEL_NAME,
                "input", java.util.List.of(
                    Map.of(
                        "role", "user",
                        "content", java.util.List.of(
                            Map.of(
                                "type", "input_text",
                                "text", "Describe this product image in detail. Focus on the main item, its features, color, and style. Be concise."
                            ),
                            Map.of(
                                "type", "input_image",
                                "image_url", tempImageUrl  // External URL instead of base64
                            )
                        )
                    )
                )
            );

            // Convert to JSON
            String jsonBody = objectMapper.writeValueAsString(requestBody);
            log.info("Request body size: {} chars", jsonBody.length());
            
            // Create request entity
            HttpEntity<String> requestEntity = new HttpEntity<>(jsonBody, headers);

            // Call API with timeout handling
            ResponseEntity<String> response;
            try {
                response = restTemplate.exchange(
                    HUGGINGFACE_API_URL,
                    HttpMethod.POST,
                    requestEntity,
                    String.class
                );
            } catch (org.springframework.web.client.HttpClientErrorException | org.springframework.web.client.HttpServerErrorException e) {
                // HTTP error responses (4xx, 5xx)
                log.error("API returned HTTP error: {} {}", e.getStatusCode(), e.getStatusText());
                log.error("Response body: {}", e.getResponseBodyAsString());
                
                String errorMessage = e.getStatusText();
                String responseBody = e.getResponseBodyAsString();
                
                // Try to extract error message from response body
                if (responseBody != null && !responseBody.isEmpty()) {
                    try {
                        JsonNode errorNode = objectMapper.readTree(responseBody);
                        if (errorNode.has("error")) {
                            JsonNode error = errorNode.get("error");
                            if (error.isTextual()) {
                                errorMessage = error.asText();
                            } else if (error.has("message") && !error.get("message").isNull()) {
                                errorMessage = error.get("message").asText();
                            } else {
                                errorMessage = error.toString();
                            }
                        } else if (errorNode.has("message")) {
                            errorMessage = errorNode.get("message").asText();
                        }
                    } catch (Exception parseEx) {
                        log.warn("Could not parse error response body", parseEx);
                    }
                }
                
                // Check for specific status codes
                if (e.getStatusCode().value() == 410) {
                    throw new AiServiceException("The AI model is no longer available. Please update to a newer model.");
                }
                
                if (e.getStatusCode().value() == 503) {
                    throw new AiServiceException("AI model is currently loading. Please wait 20-30 seconds and try again.");
                }
                
                if (e.getStatusCode().value() == 401) {
                    throw new AiServiceException("Invalid API key. Please check your HUGGINGFACE_API_KEY configuration.");
                }
                
                if (e.getStatusCode().value() == 429) {
                    throw new AiServiceException("API rate limit exceeded. Please try again later.");
                }
                
                throw new AiServiceException(String.format(
                    "Hugging Face API error (HTTP %d): %s", 
                    e.getStatusCode().value(), 
                    errorMessage
                ));
            } catch (Exception e) {
                log.error("API call failed: {}", e.getMessage(), e);
                throw new AiServiceException("Failed to call Hugging Face Router API: " + e.getMessage(), e);
            }

            // Parse Router API response
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("API response received, parsing Router API format...");
                log.info("Response: {}", response.getBody());
                
                JsonNode jsonNode = objectMapper.readTree(response.getBody());
                
                // 1. CHECK FOR ERRORS FIRST
                if (jsonNode.has("error")) {
                    JsonNode error = jsonNode.get("error");
                    String errorMessage;
                    
                    if (error.isTextual()) {
                        // Simple string error
                        errorMessage = error.asText();
                    } else if (error.isObject()) {
                        // Error object - try multiple fields
                        if (error.has("message") && !error.get("message").isNull()) {
                            errorMessage = error.get("message").asText();
                        } else if (error.has("error") && !error.get("error").isNull()) {
                            errorMessage = error.get("error").asText();
                        } else if (error.has("type") && !error.get("type").isNull()) {
                            errorMessage = "API Error Type: " + error.get("type").asText();
                        } else {
                            errorMessage = "Unknown API error (see logs for details)";
                            log.error("Full error object: {}", error.toString());
                        }
                    } else if (error.isNull()) {
                        errorMessage = "API returned null error";
                    } else {
                        errorMessage = "API error: " + error.toString();
                    }
                    
                    log.error("API returned error: {}", errorMessage);
                    throw new AiServiceException("Hugging Face API error: " + errorMessage);
                }
                
                // 2. PREFER: output_text field (direct output)
                if (jsonNode.has("output_text")) {
                    String caption = jsonNode.get("output_text").asText();
                    log.info("Caption generated from output_text field: {}", caption);
                    return caption;
                }
                
                // 3. SCAN: output[*].content[*] for type == "output_text"
                if (jsonNode.has("output") && jsonNode.get("output").isArray()) {
                    for (JsonNode outputItem : jsonNode.get("output")) {

                        if (outputItem.has("type") && "message".equals(outputItem.get("type").asText())) {

                            JsonNode contentArray = outputItem.get("content");
                            if (contentArray.isArray()) {
                                for (JsonNode contentItem : contentArray) {

                                    if ("output_text".equals(contentItem.path("type").asText())) {
                                        String caption = contentItem.path("text").asText();
                                        log.info("✅ Caption: {}", caption);
                                        return caption;
                                    }
                                }
                            }
                        }
                    }
                }
                
                // FALLBACK 1: Direct text field (legacy)
                if (jsonNode.has("text")) {
                    String caption = jsonNode.get("text").asText();
                    log.info("Caption generated from text field (legacy): {}", caption);
                    return caption;
                }
                
                // FALLBACK 2: generated_text field (legacy)
                if (jsonNode.has("generated_text")) {
                    String caption = jsonNode.get("generated_text").asText();
                    log.info("Caption generated from generated_text field (legacy): {}", caption);
                    return caption;
                }
                
                // FALLBACK 3: outputs array format (legacy)
                if (jsonNode.has("outputs") && jsonNode.get("outputs").isArray()) {
                    JsonNode outputs = jsonNode.get("outputs");
                    if (!outputs.isEmpty() && outputs.get(0).has("text")) {
                        String caption = outputs.get(0).get("text").asText();
                        log.info("Caption generated from outputs[0].text (legacy): {}", caption);
                        return caption;
                    }
                }
                
                log.error("Unexpected Router API response format - no recognized fields found");
                log.error("Response structure: {}", response.getBody());
            } else {
                // Handle non-200 status codes
                HttpStatus statusCode = (HttpStatus) response.getStatusCode();
                String responseBody = response.getBody();
                
                log.error("API returned non-200 status: {} {}", statusCode.value(), statusCode.getReasonPhrase());
                log.error("Response body: {}", responseBody);
                
                // Try to parse error from body
                String errorMessage = statusCode.getReasonPhrase();
                if (responseBody != null && !responseBody.isEmpty()) {
                    try {
                        JsonNode errorNode = objectMapper.readTree(responseBody);
                        if (errorNode.has("error")) {
                            JsonNode error = errorNode.get("error");
                            if (error.isTextual()) {
                                errorMessage = error.asText();
                            } else if (error.has("message")) {
                                errorMessage = error.get("message").asText();
                            }
                        } else if (errorNode.has("message")) {
                            errorMessage = errorNode.get("message").asText();
                        }
                    } catch (Exception e) {
                        log.warn("Could not parse error response body", e);
                    }
                }
                
                throw new AiServiceException(String.format(
                    "Hugging Face API returned error status %d: %s", 
                    statusCode.value(), 
                    errorMessage
                ));
            }

            throw new AiServiceException("Failed to parse Hugging Face Router API response - no text content found");

        } catch (AiServiceException e) {
            // Re-throw AiServiceException as-is
            throw e;
        } catch (IOException e) {
            // Wrap IOException in AiServiceException with context
            log.error("IO error during AI API call: {}", e.getMessage());
            throw new AiServiceException("Failed to communicate with AI service: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Unexpected error calling Hugging Face Router API: {}", e.getMessage(), e);
            throw new AiServiceException("Unexpected error during AI processing: " + e.getMessage(), e);
        }
    }
    
    /**
     * Compresses and resizes image to reduce base64 size
     * Converts to JPEG format with quality optimization
     */
    private byte[] compressAndResizeImage(byte[] originalImageBytes) throws IOException {
        try {
            // Read original image
            BufferedImage originalImage = ImageIO.read(new ByteArrayInputStream(originalImageBytes));
            if (originalImage == null) {
                log.warn("Could not read image, using original bytes");
                return originalImageBytes;
            }
            
            int originalWidth = originalImage.getWidth();
            int originalHeight = originalImage.getHeight();
            log.info("Original image dimensions: {}x{}", originalWidth, originalHeight);
            
            // Calculate new dimensions maintaining aspect ratio
            int newWidth = originalWidth;
            int newHeight = originalHeight;
            
            if (originalWidth > MAX_IMAGE_WIDTH || originalHeight > MAX_IMAGE_HEIGHT) {
                double widthRatio = (double) MAX_IMAGE_WIDTH / originalWidth;
                double heightRatio = (double) MAX_IMAGE_HEIGHT / originalHeight;
                double ratio = Math.min(widthRatio, heightRatio);
                
                newWidth = (int) (originalWidth * ratio);
                newHeight = (int) (originalHeight * ratio);
                log.info("Resizing image to: {}x{}", newWidth, newHeight);
            }
            
            // Create resized image
            BufferedImage resizedImage = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
            Graphics2D graphics = resizedImage.createGraphics();
            
            // Enable high-quality rendering
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            
            graphics.drawImage(originalImage, 0, 0, newWidth, newHeight, null);
            graphics.dispose();
            
            // Compress to JPEG
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            javax.imageio.ImageWriter jpegWriter = ImageIO.getImageWritersByFormatName("jpeg").next();
            javax.imageio.ImageWriteParam jpegWriteParam = jpegWriter.getDefaultWriteParam();
            jpegWriteParam.setCompressionMode(javax.imageio.ImageWriteParam.MODE_EXPLICIT);
            jpegWriteParam.setCompressionQuality(JPEG_QUALITY);
            
            jpegWriter.setOutput(ImageIO.createImageOutputStream(outputStream));
            jpegWriter.write(null, new javax.imageio.IIOImage(resizedImage, null, null), jpegWriteParam);
            jpegWriter.dispose();
            
            byte[] compressedBytes = outputStream.toByteArray();
            log.info("Compression complete: {} bytes → {} bytes ({}% reduction)", 
                originalImageBytes.length, 
                compressedBytes.length,
                100 - (compressedBytes.length * 100 / originalImageBytes.length));
            
            return compressedBytes;
            
        } catch (Exception e) {
            log.error("Error compressing image: {}", e.getMessage());
            log.warn("Falling back to original image bytes");
            return originalImageBytes;
        }
    }

    /**
     * Generates a product title from the AI caption
     */
    private String generateTitle(String caption) {
        // Capitalize first letter and limit length
        String title = caption.trim();
        if (!title.isEmpty()) {
            title = title.substring(0, 1).toUpperCase() + title.substring(1);
        }
        
        // Limit to 80 characters
        if (title.length() > 80) {
            title = title.substring(0, 77) + "...";
        }
        
        return title;
    }

    /**
     * Generates a product description from the AI caption
     */
    private String generateDescription(String caption) {
        // Create a more detailed description
        String description = caption.trim();
        if (!description.isEmpty()) {
            description = description.substring(0, 1).toUpperCase() + description.substring(1);
        }
        
        // Add some standard text
        return description + "\n\nThis product description was generated using AI image analysis. Please review and edit as needed.";
    }
}

