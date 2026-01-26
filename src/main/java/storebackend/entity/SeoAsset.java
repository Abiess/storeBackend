package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "seo_assets", indexes = {
    @Index(name = "idx_seo_asset_store", columnList = "store_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeoAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private AssetType type;

    @Column(name = "path", nullable = false, length = 500)
    private String path;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum AssetType {
        OG_IMAGE,
        FAVICON,
        APPLE_TOUCH_ICON
    }
}
