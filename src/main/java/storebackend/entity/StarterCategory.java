package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Vorlagen-Kategorie innerhalb eines {@link StarterPack}.
 * Wird beim Klonen 1:1 in eine echte {@code Category} des neuen Stores übernommen.
 */
@Entity
@Table(name = "starter_category")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StarterCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pack_id", nullable = false)
    private StarterPack pack;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;
}

