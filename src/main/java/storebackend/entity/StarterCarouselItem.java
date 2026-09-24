package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Carousel-/Hero-Bild innerhalb eines {@link StarterPack}.
 * Wird beim Klonen in eine {@code StoreSliderImage} des neuen Stores übernommen.
 */
@Entity
@Table(name = "starter_carousel_item")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StarterCarouselItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pack_id", nullable = false)
    private StarterPack pack;

    /** Feste Bild-URL (z.B. MinIO-hosted default-assets). */
    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "alt_text")
    private String altText;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;
}

