package storebackend.service;

import io.minio.*;
import io.minio.http.Method;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import storebackend.config.MinioProperties;

import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class MinioService {

    private final MinioClient minioClient;
    private final MinioProperties minioProperties;

    @Autowired
    public MinioService(@Autowired(required = false) MinioClient minioClient, MinioProperties minioProperties) {
        this.minioClient = minioClient;
        this.minioProperties = minioProperties;
        if (minioClient == null) {
            log.warn("MinIO client is not available. File upload features will be disabled.");
        }
    }

    private void checkMinioAvailable() {
        if (minioClient == null) {
            throw new RuntimeException("MinIO is not configured. Please enable MinIO in application.yml");
        }
    }

    /**
     * Upload file to MinIO
     */
    public String uploadFile(MultipartFile file, Long storeId, String folder) throws IOException {
        checkMinioAvailable();
        String objectName = generateObjectName(storeId, folder, file.getOriginalFilename());

        try (InputStream inputStream = file.getInputStream()) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(minioProperties.getBucket())
                            .object(objectName)
                            .stream(inputStream, file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );

            log.info("File uploaded successfully to MinIO: {}", objectName);
            return objectName;
        } catch (Exception e) {
            log.error("Error uploading file to MinIO", e);
            throw new RuntimeException("Failed to upload file to MinIO", e);
        }
    }

    /**
     * Delete file from MinIO
     */
    public void deleteFile(String objectName) {
        checkMinioAvailable();
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(minioProperties.getBucket())
                            .object(objectName)
                            .build()
            );
            log.info("File deleted successfully from MinIO: {}", objectName);
        } catch (Exception e) {
            log.error("Error deleting file from MinIO", e);
            throw new RuntimeException("Failed to delete file from MinIO", e);
        }
    }

    /**
     * Get presigned URL for file access
     * Max expiry: 7 days (10080 minutes)
     */
    public String getPresignedUrl(String objectName, int expiryMinutes) {
        checkMinioAvailable();
        
        // Validate expiry time (MinIO max is 7 days)
        final int MAX_EXPIRY_MINUTES = 10080; // 7 days
        if (expiryMinutes > MAX_EXPIRY_MINUTES) {
            log.warn("Requested expiry {} minutes exceeds maximum {}. Using maximum.", expiryMinutes, MAX_EXPIRY_MINUTES);
            expiryMinutes = MAX_EXPIRY_MINUTES;
        }
        
        if (expiryMinutes < 1) {
            log.warn("Invalid expiry {} minutes. Using default 60 minutes.", expiryMinutes);
            expiryMinutes = 60;
        }
        
        try {
            String presignedUrl = minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(minioProperties.getBucket())
                            .object(objectName)
                            .expiry(expiryMinutes, TimeUnit.MINUTES)
                            .build()
            );

            // Wenn ein öffentlicher Endpoint konfiguriert ist, ersetze localhost damit
            if (minioProperties.getPublicEndpoint() != null && !minioProperties.getPublicEndpoint().isEmpty()) {
                presignedUrl = presignedUrl.replace(minioProperties.getEndpoint(), minioProperties.getPublicEndpoint());
                log.debug("Replaced internal endpoint with public endpoint in URL");
            }

            log.debug("Generated presigned URL for {} with expiry {} minutes", objectName, expiryMinutes);
            return presignedUrl;
        } catch (Exception e) {
            log.error("Error generating presigned URL for object: {} with expiry: {} minutes", objectName, expiryMinutes, e);
            throw new RuntimeException("Failed to generate presigned URL: " + e.getMessage(), e);
        }
    }

    /**
     * Get file as InputStream
     */
    public InputStream getFile(String objectName) {
        checkMinioAvailable();
        try {
            return minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(minioProperties.getBucket())
                            .object(objectName)
                            .build()
            );
        } catch (Exception e) {
            log.error("Error getting file from MinIO", e);
            throw new RuntimeException("Failed to get file from MinIO", e);
        }
    }

    /**
     * Generate unique object name
     */
    private String generateObjectName(Long storeId, String folder, String originalFilename) {
        String uuid = UUID.randomUUID().toString();
        String extension = "";

        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }

        return String.format("stores/%d/%s/%s%s", storeId, folder, uuid, extension);
    }
}
