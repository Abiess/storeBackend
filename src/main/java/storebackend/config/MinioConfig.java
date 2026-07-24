package storebackend.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class MinioConfig {

    private final MinioProperties minioProperties;

    @Bean
    @ConditionalOnProperty(name = "minio.enabled", havingValue = "true")
    public MinioClient minioClient() {
        try {
            log.info("Initializing MinIO client with endpoint: {}", minioProperties.getEndpoint());

            MinioClient minioClient = MinioClient.builder()
                    .endpoint(minioProperties.getEndpoint())
                    .credentials(minioProperties.getAccessKey(), minioProperties.getSecretKey())
                    .build();

            // Check if public bucket exists, if not create it
            boolean publicBucketExists = minioClient.bucketExists(
                    BucketExistsArgs.builder()
                            .bucket(minioProperties.getBucket())
                            .build()
            );

            if (!publicBucketExists) {
                log.info("Creating MinIO public bucket: {}", minioProperties.getBucket());
                minioClient.makeBucket(
                        MakeBucketArgs.builder()
                                .bucket(minioProperties.getBucket())
                                .build()
                );
                log.info("MinIO public bucket created successfully");
            } else {
                log.info("MinIO public bucket already exists: {}", minioProperties.getBucket());
            }

            // Check if private bucket exists, if not create it
            if (minioProperties.getPrivateBucket() != null && !minioProperties.getPrivateBucket().isEmpty()) {
                boolean privateBucketExists = minioClient.bucketExists(
                        BucketExistsArgs.builder()
                                .bucket(minioProperties.getPrivateBucket())
                                .build()
                );

                if (!privateBucketExists) {
                    log.info("Creating MinIO PRIVATE bucket: {}", minioProperties.getPrivateBucket());
                    minioClient.makeBucket(
                            MakeBucketArgs.builder()
                                    .bucket(minioProperties.getPrivateBucket())
                                    .build()
                    );
                    log.info("✅ MinIO PRIVATE bucket created successfully - NO public-read policy!");
                } else {
                    log.info("MinIO private bucket already exists: {}", minioProperties.getPrivateBucket());
                }
            } else {
                log.warn("⚠️  No private bucket configured. Sensitive documents cannot be stored securely!");
            }

            log.info("MinIO client initialized successfully");
            return minioClient;
        } catch (Exception e) {
            log.error("Error initializing MinIO client: {}", e.getMessage());
            log.warn("MinIO will not be available. Media upload features will be disabled.");
            return null;
        }
    }
}
