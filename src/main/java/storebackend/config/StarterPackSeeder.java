package storebackend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.StarterCarouselItem;
import storebackend.entity.StarterCategory;
import storebackend.entity.StarterPack;
import storebackend.entity.StarterProduct;
import storebackend.enums.BusinessType;
import storebackend.repository.StarterPackRepository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Seedet die Starter-Content-Packs beim Start, falls sie noch nicht existieren.
 *
 * Reuse-First & idempotent: Wird ein Pack-Code bereits gefunden, passiert nichts.
 * Bild-URLs sind feste Default-Assets (MinIO-hosted) – keine Laufzeit-Requests.
 *
 * Da {@code spring.sql.init.mode=never} ist (Hibernate erzeugt das Schema aus
 * Entities), übernimmt dieser Java-Seeder die Datenbefüllung. Die SQL-Variante
 * in schema.sql dient der Produktions-/Dokumentationsparität.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(25) // nach ThemeTemplateSeeder (@Order 20)
public class StarterPackSeeder {

    /** Basis-URL der festen Default-Assets (MinIO-hosted). */
    private static final String CDN = "https://cdn.markt.ma/default-assets";

    private final StarterPackRepository repository;

    @EventListener(ContextRefreshedEvent.class)
    @Transactional
    public void seed() {
        int created = 0;
        if (repository.findByCode("RESTAURANT_MOROCCAN").isEmpty()) {
            repository.save(buildRestaurantMoroccan());
            created++;
            log.info("🍽️ Starter-Pack angelegt: RESTAURANT_MOROCCAN");
        }
        if (repository.findByCode("RIAD_MOROCCAN").isEmpty()) {
            repository.save(buildRiadMoroccan());
            created++;
            log.info("🏛️ Starter-Pack angelegt: RIAD_MOROCCAN");
        }

        if (created == 0) {
            log.debug("📦 Starter-Packs bereits vorhanden – kein Seeding nötig.");
        } else {
            log.info("✅ {} Starter-Pack(s) registriert.", created);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // RESTAURANT_MOROCCAN
    // ─────────────────────────────────────────────────────────────
    private StarterPack buildRestaurantMoroccan() {
        StarterPack pack = StarterPack.builder()
            .code("RESTAURANT_MOROCCAN")
            .businessType(BusinessType.RESTAURANT)
            .name("Restaurant Marocain")
            .description("Starter-Content für ein marokkanisches Restaurant: Menü-Kategorien, "
                + "typische Gerichte und Hero-Bilder.")
            .active(true)
            .build();

        // Kategorien
        addCategory(pack, "Petit déjeuner", "petit-dejeuner", "Frühstücks-Spezialitäten", 1);
        addCategory(pack, "Tajines",        "tajines",        "Traditionelle Tajine-Gerichte", 2);
        addCategory(pack, "Couscous",       "couscous",       "Couscous-Variationen", 3);
        addCategory(pack, "Grillades",      "grillades",      "Gegrilltes & Spieße", 4);
        addCategory(pack, "Boissons",       "boissons",       "Getränke & Tee", 5);
        addCategory(pack, "Desserts",       "desserts",       "Süße Spezialitäten", 6);

        // Produkte (Menü-Items)
        addProduct(pack, "petit-dejeuner", "Petit déjeuner Marocain",
            "Msemen, Beghrir, Olivenöl, Amlou, frisches Brot und Minztee.",
            "55.00", CDN + "/restaurant/petit-dejeuner-marocain.jpg", 1, true);
        addProduct(pack, "tajines", "Tajine Poulet Citron",
            "Hähnchen mit eingelegten Zitronen, Oliven und marokkanischen Gewürzen.",
            "75.00", CDN + "/restaurant/tajine-poulet-citron.jpg", 2, true);
        addProduct(pack, "tajines", "Tajine Kefta",
            "Hackbällchen in würziger Tomatensauce mit pochiertem Ei.",
            "70.00", CDN + "/restaurant/tajine-kefta.jpg", 3, false);
        addProduct(pack, "couscous", "Couscous Royal",
            "Couscous mit Lamm, Hähnchen, Merguez und saisonalem Gemüse.",
            "95.00", CDN + "/restaurant/couscous-royal.jpg", 4, true);
        addProduct(pack, "boissons", "Thé à la menthe",
            "Traditioneller marokkanischer Minztee, frisch aufgegossen.",
            "15.00", CDN + "/restaurant/the-a-la-menthe.jpg", 5, false);
        addProduct(pack, "desserts", "Pastilla Poulet",
            "Knusprige Blätterteig-Pastilla mit Hähnchen, Mandeln und Zimt.",
            "65.00", CDN + "/restaurant/pastilla-poulet.jpg", 6, false);

        // Carousel / Hero
        addCarousel(pack, CDN + "/restaurant/hero-1.jpg", "Cuisine marocaine authentique", 1);
        addCarousel(pack, CDN + "/restaurant/hero-2.jpg", "Tajines & Couscous faits maison", 2);
        addCarousel(pack, CDN + "/restaurant/hero-3.jpg", "Ambiance chaleureuse", 3);

        return pack;
    }

    // ─────────────────────────────────────────────────────────────
    // RIAD_MOROCCAN
    // ─────────────────────────────────────────────────────────────
    private StarterPack buildRiadMoroccan() {
        StarterPack pack = StarterPack.builder()
            .code("RIAD_MOROCCAN")
            .businessType(BusinessType.RIAD)
            .name("Riad Marocain")
            .description("Starter-Content für ein marokkanisches Riad: Zimmer, Suiten, "
                + "Services und Hero-Bilder.")
            .active(true)
            .build();

        // Kategorien
        addCategory(pack, "Chambres",        "chambres",        "Zimmer", 1);
        addCategory(pack, "Suites",          "suites",          "Suiten", 2);
        addCategory(pack, "Petit déjeuner",  "petit-dejeuner",  "Frühstück", 3);
        addCategory(pack, "Spa & Hammam",    "spa-hammam",      "Wellness", 4);
        addCategory(pack, "Excursions",      "excursions",      "Ausflüge", 5);
        addCategory(pack, "Services",        "services",        "Weitere Services", 6);

        // Produkte (Angebote)
        addProduct(pack, "chambres", "Chambre Standard",
            "Gemütliches Zimmer im traditionellen Stil mit Blick auf den Innenhof.",
            "650.00", CDN + "/riad/chambre-standard.jpg", 1, true);
        addProduct(pack, "suites", "Suite Familiale",
            "Geräumige Suite für Familien mit separatem Wohnbereich.",
            "1200.00", CDN + "/riad/suite-familiale.jpg", 2, true);
        addProduct(pack, "petit-dejeuner", "Petit déjeuner traditionnel",
            "Marokkanisches Frühstück mit Msemen, Honig, Oliven und Minztee.",
            "85.00", CDN + "/riad/petit-dejeuner-traditionnel.jpg", 3, false);
        addProduct(pack, "spa-hammam", "Hammam Relax",
            "Traditionelles Hammam-Erlebnis mit schwarzer Seife und Gommage.",
            "250.00", CDN + "/riad/hammam-relax.jpg", 4, true);
        addProduct(pack, "spa-hammam", "Massage Argan",
            "Entspannende Ganzkörpermassage mit reinem Arganöl.",
            "350.00", CDN + "/riad/massage-argan.jpg", 5, false);
        addProduct(pack, "excursions", "Excursion Ourika",
            "Tagesausflug ins Ourika-Tal inkl. Transport und Guide.",
            "450.00", CDN + "/riad/excursion-ourika.jpg", 6, false);

        // Carousel / Hero
        addCarousel(pack, CDN + "/riad/hero-1.jpg", "Riad authentique au cœur de la médina", 1);
        addCarousel(pack, CDN + "/riad/hero-2.jpg", "Patio & piscine", 2);
        addCarousel(pack, CDN + "/riad/hero-3.jpg", "Détente & bien-être", 3);

        return pack;
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────
    private void addCategory(StarterPack pack, String name, String slug, String desc, int sort) {
        pack.getCategories().add(StarterCategory.builder()
            .pack(pack).name(name).slug(slug).description(desc).sortOrder(sort).build());
    }

    private void addProduct(StarterPack pack, String categorySlug, String title, String desc,
                            String price, String imageUrl, int sort, boolean featured) {
        pack.getProducts().add(StarterProduct.builder()
            .pack(pack).categorySlug(categorySlug).title(title).description(desc)
            .basePrice(new BigDecimal(price)).imageUrl(imageUrl).sortOrder(sort).featured(featured).build());
    }

    private void addCarousel(StarterPack pack, String imageUrl, String altText, int sort) {
        pack.getCarouselItems().add(StarterCarouselItem.builder()
            .pack(pack).imageUrl(imageUrl).altText(altText).sortOrder(sort).build());
    }
}

