package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.*;
import storebackend.enums.BusinessType;
import storebackend.enums.ProductStatus;
import storebackend.enums.SliderImageType;
import storebackend.repository.CategoryRepository;
import storebackend.repository.ProductRepository;
import storebackend.repository.StarterPackRepository;
import storebackend.repository.StoreSliderImageRepository;

import java.util.HashMap;
import java.util.Map;

/**
 * Klont einen {@link StarterPack} in die echten Store-Daten
 * (Kategorien, Produkte, Carousel-/Slider-Bilder).
 *
 * Reuse-First: Nutzt ausschließlich die bestehenden Entities
 * {@code Category}, {@code Product}, {@code StoreSliderImage}.
 * Läuft in der Transaktion des Aufrufers (StoreService.createStore).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StarterPackService {

    private final StarterPackRepository starterPackRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final StoreSliderImageRepository sliderImageRepository;

    /** Default-Lagerbestand für geklonte Produkte (Menü-Items immer verfügbar). */
    private static final int DEFAULT_STOCK = 99;

    /**
     * Klont den passenden Default-Pack für den Geschäftstyp.
     * SHOP oder kein passender Pack → keine Aktion.
     */
    @Transactional
    public void cloneForBusinessType(Store store, BusinessType businessType) {
        if (businessType == null || businessType == BusinessType.SHOP) {
            return;
        }
        starterPackRepository.findByBusinessTypeAndActiveTrue(businessType)
            .ifPresentOrElse(
                pack -> cloneInto(store, pack),
                () -> log.warn("Kein aktiver Starter-Pack für businessType={} gefunden", businessType)
            );
    }

    /** Klont einen Pack anhand seines Codes. */
    @Transactional
    public void cloneByCode(Store store, String packCode) {
        starterPackRepository.findByCode(packCode)
            .ifPresentOrElse(
                pack -> cloneInto(store, pack),
                () -> log.warn("Starter-Pack '{}' nicht gefunden", packCode)
            );
    }

    private void cloneInto(Store store, StarterPack pack) {
        log.info("📦 Klone Starter-Pack '{}' in Store {} ({})",
            pack.getCode(), store.getId(), store.getName());

        // 1) Kategorien klonen → Map slug → echte Category
        Map<String, Category> categoryBySlug = new HashMap<>();
        for (StarterCategory sc : pack.getCategories()) {
            Category category = new Category();
            category.setStore(store);
            category.setName(sc.getName());
            category.setSlug(sc.getSlug());
            category.setDescription(sc.getDescription());
            category.setSortOrder(sc.getSortOrder() != null ? sc.getSortOrder() : 0);
            Category saved = categoryRepository.save(category);
            categoryBySlug.put(sc.getSlug(), saved);
        }

        // 2) Produkte klonen
        for (StarterProduct sp : pack.getProducts()) {
            Product product = new Product();
            product.setStore(store);
            product.setCategory(categoryBySlug.get(sp.getCategorySlug()));
            product.setTitle(sp.getTitle());
            product.setDescription(sp.getDescription());
            product.setBasePrice(sp.getBasePrice());
            product.setImageUrl(sp.getImageUrl());
            product.setStatus(ProductStatus.ACTIVE); // direkt sichtbar im Storefront
            product.setIsFeatured(sp.isFeatured());
            product.setFeaturedOrder(sp.getSortOrder() != null ? sp.getSortOrder() : 0);
            product.setStock(DEFAULT_STOCK);
            productRepository.save(product);
        }

        // 3) Carousel-/Hero-Bilder klonen → StoreSliderImage
        for (StarterCarouselItem item : pack.getCarouselItems()) {
            StoreSliderImage slider = new StoreSliderImage();
            slider.setStore(store);
            slider.setImageUrl(item.getImageUrl());
            slider.setImageType(SliderImageType.DEFAULT);
            slider.setDisplayOrder(item.getSortOrder() != null ? item.getSortOrder() : 0);
            slider.setIsActive(true);
            slider.setAltText(item.getAltText());
            sliderImageRepository.save(slider);
        }

        log.info("✅ Starter-Pack '{}' geklont: {} Kategorien, {} Produkte, {} Carousel-Bilder",
            pack.getCode(), pack.getCategories().size(), pack.getProducts().size(),
            pack.getCarouselItems().size());
    }
}

