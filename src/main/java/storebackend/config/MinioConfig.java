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

            // Check if bucket exists, if not create it
            boolean exists = minioClient.bucketExists(
                    BucketExistsArgs.builder()
                            .bucket(minioProperties.getBucket())
                            .build()
            );

            if (!exists) {
                log.info("Creating MinIO bucket: {}", minioProperties.getBucket());
                minioClient.makeBucket(
                        MakeBucketArgs.builder()
                                .bucket(minioProperties.getBucket())
                                .build()
                );
                log.info("MinIO bucket created successfully");
            } else {
                log.info("MinIO bucket already exists: {}", minioProperties.getBucket());
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
