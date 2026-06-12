package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Vorlagen-Produkt (Menü-Item / Angebot) innerhalb eines {@link StarterPack}.
 * Wird beim Klonen in ein echtes {@code Product} des neuen Stores übernommen.
 *
 * {@link #categorySlug} verweist auf den Slug einer {@link StarterCategory}
 * desselben Packs (Mapping erfolgt beim Klonen).
 */
@Entity
@Table(name = "starter_product")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StarterProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pack_id", nullable = false)
    private StarterPack pack;

    /** Slug der zugehörigen {@link StarterCategory} im selben Pack. */
    @Column(name = "category_slug", nullable = false)
    private String categorySlug;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "base_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal basePrice;

    /** Feste Bild-URL (z.B. MinIO-hosted default-assets). */
    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(name = "is_featured", nullable = false)
    @Builder.Default
    private boolean featured = false;
}

