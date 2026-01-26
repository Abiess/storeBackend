package storebackend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "minio")
@Data
public class MinioProperties {
    private String endpoint;
    private String publicEndpoint; // Öffentliche URL für Browser-Zugriff
    private String accessKey;
    private String secretKey;
    private String bucket;
    private String region = "us-east-1";
    private boolean secure = false;

    // Explizite Getter für Lombok-Kompatibilität
    public String getEndpoint() {
        return endpoint;
    }

    public String getPublicEndpoint() {
        return publicEndpoint;
    }

    public String getAccessKey() {
        return accessKey;
    }

    public String getSecretKey() {
        return secretKey;
    }

    public String getBucket() {
        return bucket;
    }

    public String getRegion() {
        return region;
    }

    public boolean isSecure() {
        return secure;
    }
}
