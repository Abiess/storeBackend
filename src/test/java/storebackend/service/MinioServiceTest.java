package storebackend.service;

import org.junit.jupiter.api.Test;
import storebackend.config.MinioProperties;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MinioServiceTest {

    @Test
    void getPublicUrlBuildsPermanentUrlFromExplicitBucketAndPath() {
        MinioProperties properties = new MinioProperties();
        properties.setEndpoint("http://minio:9000");
        properties.setPublicEndpoint("https://minio.markt.ma/");
        properties.setBucket("store-assets");

        MinioService minioService = new MinioService(null, properties);

        assertEquals(
            "https://minio.markt.ma/store-assets/stores/121/telegram/produkt.jpg",
            minioService.getPublicUrl("store-assets", "stores/121/telegram/produkt.jpg")
        );
    }

    @Test
    void getPublicUrlDelegatesToConfiguredPublicBucket() {
        MinioProperties properties = new MinioProperties();
        properties.setEndpoint("https://internal-minio");
        properties.setPublicEndpoint("https://minio.markt.ma");
        properties.setBucket("store-assets");

        MinioService minioService = new MinioService(null, properties);

        assertEquals(
            "https://minio.markt.ma/store-assets/stores/9/telegram/demo.png",
            minioService.getPublicUrl("stores/9/telegram/demo.png")
        );
    }
}
