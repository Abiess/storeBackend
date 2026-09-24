package storebackend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Konfiguration für plattformweite Default-Assets (z.B. Starter-Pack-Bilder).
 *
 * Gebunden an den Prefix {@code markt.assets}. Die {@link #defaultBaseUrl}
 * zeigt auf den öffentlich erreichbaren MinIO-/Asset-Basis-Pfad, z.B.:
 * {@code https://markt.minio.ma/store-assets/default-assets}
 *
 * So lassen sich Default-Bilder später zentral austauschen, ohne Code-Änderung.
 */
@Configuration
@ConfigurationProperties(prefix = "markt.assets")
@Data
public class AssetProperties {

    /**
     * Öffentliche Basis-URL für Default-Assets (ohne abschließenden Slash empfohlen,
     * wird aber toleriert). Beispiel:
     * {@code https://markt.minio.ma/store-assets/default-assets}
     */
    private String defaultBaseUrl = "https://markt.minio.ma/store-assets/default-assets";

    /**
     * Baut eine vollständige Asset-URL ohne doppelte Slashes.
     * @param relativePath z.B. {@code "/restaurant/hero-1.jpg"} oder {@code "restaurant/hero-1.jpg"}
     */
    public String url(String relativePath) {
        String base = defaultBaseUrl == null ? "" : defaultBaseUrl.trim();
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        String path = relativePath == null ? "" : relativePath.trim();
        if (!path.startsWith("/")) {
            path = "/" + path;
        }
        return base + path;
    }
}

