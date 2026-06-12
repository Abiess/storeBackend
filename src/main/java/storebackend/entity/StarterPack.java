package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.BusinessType;

import java.util.ArrayList;
import java.util.List;

/**
 * Vordefinierter Starter-Content ("Starter Pack") für einen Geschäftstyp.
 *
 * Wird beim Store-Erstellen optional in echte Store-Kategorien/Produkte/Carousel-Daten
 * kopiert (siehe {@code StarterPackService}). Reine Seed-/Vorlagen-Daten – keine
 * Verknüpfung zu einem konkreten Store.
 *
 * Default-Packs: RESTAURANT_MOROCCAN, RIAD_MOROCCAN.
 */
@Entity
@Table(name = "starter_pack")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StarterPack {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Eindeutiger Code, z.B. RESTAURANT_MOROCCAN. */
    @Column(nullable = false, unique = true, length = 100)
    private String code;

    /** Geschäftstyp, für den dieser Pack gedacht ist. */
    @Enumerated(EnumType.STRING)
    @Column(name = "business_type", nullable = false, length = 20)
    private BusinessType businessType;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @OneToMany(mappedBy = "pack", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<StarterCategory> categories = new ArrayList<>();

    @OneToMany(mappedBy = "pack", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<StarterProduct> products = new ArrayList<>();

    @OneToMany(mappedBy = "pack", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<StarterCarouselItem> carouselItems = new ArrayList<>();
}

