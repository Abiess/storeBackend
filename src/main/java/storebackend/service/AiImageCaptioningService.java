package storebackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.AiProductSuggestionDTO;
import storebackend.exception.AiServiceException;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class AiImageCaptioningService {

    private static final String HUGGINGFACE_API_URL = "https://router.huggingface.co/v1/responses";
    private static final String MODEL_NAME = "zai-org/GLM-4.5V";

    private static final int MAX_IMAGE_WIDTH = 768;
    private static final int MAX_IMAGE_HEIGHT = 768;
    private static final float JPEG_QUALITY = 0.65f;

    @Value("${huggingface.api.key:${HUGGINGFACE_API_KEY:}}")
    private String apiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final MinioService minioService;

    public AiImageCaptioningService(
            RestTemplate restTemplate,
            ObjectMapper objectMapper,
            MinioService minioService
    ) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.minioService = minioService;
        log.info("🤖 AiImageCaptioningService initialized");
    }

    public AiProductSuggestionDTO generateProductSuggestion(MultipartFile imageFile) throws IOException {
        log.info("=== AI GENERATION START ===");
        log.info("Image: {} ({} bytes)", imageFile.getOriginalFilename(), imageFile.getSize());
        log.info("API Key present: {}", apiKey != null && !apiKey.isBlank());

        if (apiKey == null || apiKey.isBlank()) {
            throw new AiServiceException(
                    "Hugging Face API key is not configured. Please set HUGGINGFACE_API_KEY environment variable."
            );
        }

        byte[] imageBytes = imageFile.getBytes();
        byte[] optimizedImageBytes = compressAndResizeImage(imageBytes);

        log.info("Image optimized: {} bytes → {} bytes", imageBytes.length, optimizedImageBytes.length);

        String caption = callHuggingFaceApi(optimizedImageBytes);

        AiProductSuggestionDTO suggestion = new AiProductSuggestionDTO();
        suggestion.setGeneratedCaption(caption);
        suggestion.setTitle(generateTitle(caption));
        suggestion.setDescription(generateDescription(caption));

        return suggestion;
    }

    private String callHuggingFaceApi(byte[] imageBytes) {
        try {
            log.info("Calling Hugging Face Router API: {}", HUGGINGFACE_API_URL);
            log.info("Model: {}", MODEL_NAME);

            log.info("Uploading compressed image to MinIO for AI processing...");
            String tempImageUrl = minioService.uploadTemporaryFile(imageBytes, "image/jpeg", 60);
            log.info(
                    "Image uploaded to temporary URL: {}",
                    tempImageUrl.substring(0, Math.min(100, tempImageUrl.length())) + "..."
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> requestBody = Map.of(
                    "model", MODEL_NAME,
                    "temperature", 0.2,
                    "top_p", 0.9,
                    "max_output_tokens", 160,
                    "input", List.of(
                            Map.of(
                                    "role", "user",
                                    "content", List.of(
                                            Map.of(
                                                    "type", "input_text",
                                                    "text", "Generate a short ecommerce product description. Focus on the item, color, and style. No filler words."
                                            ),
                                            Map.of(
                                                    "type", "input_image",
                                                    "image_url", tempImageUrl
                                            )
                                    )
                            )
                    )
            );

            String jsonBody = objectMapper.writeValueAsString(requestBody);
            log.info("Request body size: {} chars", jsonBody.length());

            HttpEntity<String> requestEntity = new HttpEntity<>(jsonBody, headers);

            ResponseEntity<String> response;
            try {
                response = restTemplate.exchange(
                        HUGGINGFACE_API_URL,
                        HttpMethod.POST,
                        requestEntity,
                        String.class
                );
            } catch (HttpClientErrorException | HttpServerErrorException e) {
                log.error("API returned HTTP error: {} {}", e.getStatusCode(), e.getStatusText());
                log.error("Response body: {}", e.getResponseBodyAsString());

                String errorMessage = extractErrorMessage(e.getResponseBodyAsString(), e.getStatusText());
                int status = e.getStatusCode().value();

                if (status == 410) {
                    throw new AiServiceException("The AI model is no longer available. Please update to a newer model.");
                }
                if (status == 503) {
                    throw new AiServiceException("AI model is currently loading. Please wait 20-30 seconds and try again.");
                }
                if (status == 401) {
                    throw new AiServiceException("Invalid API key. Please check your HUGGINGFACE_API_KEY configuration.");
                }
                if (status == 429) {
                    throw new AiServiceException("API rate limit exceeded. Please try again later.");
                }

                throw new AiServiceException("Hugging Face API error (HTTP " + status + "): " + errorMessage);
            } catch (Exception e) {
                log.error("API call failed: {}", e.getMessage(), e);
                throw new AiServiceException("Failed to call Hugging Face Router API: " + e.getMessage(), e);
            }

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null || response.getBody().isBlank()) {
                throw new AiServiceException("Hugging Face API returned an empty or non-success response.");
            }

            log.info("API response received, parsing Router API format...");
            log.info("Response: {}", response.getBody());

            return parseRouterResponse(response.getBody());

        } catch (AiServiceException e) {
            throw e;
        } catch (IOException e) {
            log.error("IO error during AI API call: {}", e.getMessage(), e);
            throw new AiServiceException("Failed to communicate with AI service: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Unexpected error calling Hugging Face Router API: {}", e.getMessage(), e);
            throw new AiServiceException("Unexpected error during AI processing: " + e.getMessage(), e);
        }
    }

    private String parseRouterResponse(String responseBody) throws IOException {
        JsonNode jsonNode = objectMapper.readTree(responseBody);

        if (jsonNode.has("error") && !jsonNode.get("error").isNull()) {
            String errorMessage = extractErrorNodeMessage(jsonNode.get("error"));
            log.error("API returned error: {}", errorMessage);
            throw new AiServiceException("Hugging Face API error: " + errorMessage);
        }

        if (jsonNode.has("output_text") && !jsonNode.get("output_text").isNull()) {
            String caption = jsonNode.get("output_text").asText();
            if (!caption.isBlank()) {
                log.info("Caption generated from output_text field: {}", caption);
                return caption;
            }
        }

        if (jsonNode.has("output") && jsonNode.get("output").isArray()) {
            for (JsonNode outputItem : jsonNode.get("output")) {
                if ("message".equals(outputItem.path("type").asText())) {
                    JsonNode contentArray = outputItem.get("content");
                    if (contentArray != null && contentArray.isArray()) {
                        for (JsonNode contentItem : contentArray) {
                            if ("output_text".equals(contentItem.path("type").asText())) {
                                String caption = contentItem.path("text").asText();
                                if (!caption.isBlank()) {
                                    log.info("Caption generated from output[*].content[*].text: {}", caption);
                                    return caption;
                                }
                            }
                        }
                    }
                }
            }
        }

        if (jsonNode.has("text") && !jsonNode.get("text").isNull()) {
            String caption = jsonNode.get("text").asText();
            if (!caption.isBlank()) {
                return caption;
            }
        }

        if (jsonNode.has("generated_text") && !jsonNode.get("generated_text").isNull()) {
            String caption = jsonNode.get("generated_text").asText();
            if (!caption.isBlank()) {
                return caption;
            }
        }

        if (jsonNode.has("outputs") && jsonNode.get("outputs").isArray()) {
            JsonNode outputs = jsonNode.get("outputs");
            if (!outputs.isEmpty() && outputs.get(0).has("text")) {
                String caption = outputs.get(0).get("text").asText();
                if (!caption.isBlank()) {
                    return caption;
                }
            }
        }

        log.error("Unexpected Router API response format - no recognized text fields found");
        log.error("Response structure: {}", responseBody);
        throw new AiServiceException("Failed to parse Hugging Face Router API response - no text content found");
    }

    private String extractErrorMessage(String responseBody, String fallback) {
        if (responseBody == null || responseBody.isBlank()) {
            return fallback;
        }

        try {
            JsonNode errorNode = objectMapper.readTree(responseBody);

            if (errorNode.has("error") && !errorNode.get("error").isNull()) {
                return extractErrorNodeMessage(errorNode.get("error"));
            }

            if (errorNode.has("message") && !errorNode.get("message").isNull()) {
                return errorNode.get("message").asText();
            }
        } catch (Exception e) {
            log.warn("Could not parse error response body", e);
        }

        return fallback;
    }

    private String extractErrorNodeMessage(JsonNode error) {
        if (error == null || error.isNull()) {
            return "Unknown API error";
        }
        if (error.isTextual()) {
            return error.asText();
        }
        if (error.isObject()) {
            if (error.has("message") && !error.get("message").isNull()) {
                return error.get("message").asText();
            }
            if (error.has("error") && !error.get("error").isNull()) {
                return error.get("error").asText();
            }
            if (error.has("type") && !error.get("type").isNull()) {
                return "API Error Type: " + error.get("type").asText();
            }
            return error.toString();
        }
        return error.toString();
    }

    private byte[] compressAndResizeImage(byte[] originalImageBytes) throws IOException {
        try {
            BufferedImage originalImage = ImageIO.read(new ByteArrayInputStream(originalImageBytes));
            if (originalImage == null) {
                log.warn("Could not read image, using original bytes");
                return originalImageBytes;
            }

            int originalWidth = originalImage.getWidth();
            int originalHeight = originalImage.getHeight();
            log.info("Original image dimensions: {}x{}", originalWidth, originalHeight);

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

            BufferedImage resizedImage = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
            Graphics2D graphics = resizedImage.createGraphics();
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            graphics.drawImage(originalImage, 0, 0, newWidth, newHeight, null);
            graphics.dispose();

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            ImageWriter jpegWriter = ImageIO.getImageWritersByFormatName("jpeg").next();
            ImageWriteParam jpegWriteParam = jpegWriter.getDefaultWriteParam();
            jpegWriteParam.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            jpegWriteParam.setCompressionQuality(JPEG_QUALITY);

            jpegWriter.setOutput(ImageIO.createImageOutputStream(outputStream));
            jpegWriter.write(null, new IIOImage(resizedImage, null, null), jpegWriteParam);
            jpegWriter.dispose();

            byte[] compressedBytes = outputStream.toByteArray();
            log.info(
                    "Compression complete: {} bytes → {} bytes ({}% reduction)",
                    originalImageBytes.length,
                    compressedBytes.length,
                    100 - (compressedBytes.length * 100 / originalImageBytes.length)
            );

            return compressedBytes;

        } catch (Exception e) {
            log.error("Error compressing image: {}", e.getMessage(), e);
            log.warn("Falling back to original image bytes");
            return originalImageBytes;
        }
    }

    private String generateTitle(String caption) {
        String title = caption.trim();
        if (!title.isEmpty()) {
            title = title.substring(0, 1).toUpperCase() + title.substring(1);
        }
        if (title.length() > 80) {
            title = title.substring(0, 77) + "...";
        }
        return title;
    }

    private String generateDescription(String caption) {
        String description = caption.trim();
        if (!description.isEmpty()) {
            description = description.substring(0, 1).toUpperCase() + description.substring(1);
        }
        return description + "\n\nThis product description was generated using AI image analysis. Please review and edit as needed.";
    }
}
