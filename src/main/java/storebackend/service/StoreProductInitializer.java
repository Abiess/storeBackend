package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.Product;
import storebackend.entity.Store;
import storebackend.enums.BusinessType;
import storebackend.enums.ProductStatus;
import storebackend.repository.ProductRepository;
import storebackend.repository.StoreRepository;

import java.math.BigDecimal;
import java.util.*;

/**
 * Initialisiert Sample-Produkte für neue Stores basierend auf Kategorie und BusinessType.
 * Läuft in separater REQUIRES_NEW Transaction.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StoreProductInitializer {

    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final UnsplashImageService unsplashService;
    private final MediaService mediaService;

    /**
     * Erstellt 3-4 Sample-Produkte mit Unsplash-Bildern basierend auf Kategorie.
     * Läuft in eigener Transaction - Fehler beeinflussen Store-Erstellung nicht.
     *
     * @param storeId  Store ID
     * @param category Kategorie (z.B. "fashion", "moroccan", "traditional")
     * @return true wenn erfolgreich
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean initializeProducts(Long storeId, String category) {
        try {
            log.info("🔄 Initializing sample products for store ID: {} with category: {}", storeId, category);

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found: " + storeId));

            // Produkte basierend auf BusinessType und Kategorie generieren
            List<ProductTemplate> templates = getProductTemplates(store.getBusinessType(), category);
            
            int successCount = 0;
            for (ProductTemplate template : templates) {
                try {
                    // Unsplash-Bild für Produkt suchen
                    var images = unsplashService.searchPhotos(
                        store.getBusinessType(),
                        template.searchQuery,
                        1 // Nur 1 Seite
                    );

                    if (!images.isEmpty()) {
                        var unsplashImage = images.get(0);
                        try {
                            // Bild von Unsplash herunterladen und in MinIO speichern
                            var media = mediaService.uploadFromUrl(
                                store,
                                unsplashImage.getRegularUrl(),
                                "Product: " + template.name
                            );
                            
                            // Produkt erstellen mit MinIO-gespeichertem Bild
                            Product product = new Product();
                            product.setStore(store);
                            product.setTitle(template.name);
                            product.setDescription(template.description);
                            product.setBasePrice(template.price);
                            product.setStock(template.stock);
                            product.setStatus(ProductStatus.ACTIVE);
                            
                            // URL wird später vom Frontend über /media/{id}/url abgerufen
                            // oder wir speichern eine MinIO-URL
                            String mediaUrl = mediaService.getMediaUrl(media.getId());
                            product.setImageUrl(mediaUrl);

                            productRepository.save(product);
                            successCount++;
                            log.debug("✅ Created product: {} with stored image from MinIO", template.name);

                        } catch (Exception e) {
                            log.warn("⚠️ Failed to download Unsplash image for {}, creating product without image: {}", 
                                template.name, e.getMessage());
                            
                            // Fallback: Produkt ohne Bild erstellen
                            Product product = new Product();
                            product.setStore(store);
                            product.setTitle(template.name);
                            product.setDescription(template.description);
                            product.setBasePrice(template.price);
                            product.setStock(template.stock);
                            product.setStatus(ProductStatus.ACTIVE);
                            
                            productRepository.save(product);
                            successCount++;
                            log.debug("✅ Created product: {} without image", template.name);
                        }
                    } else {
                        // Kein Unsplash-Bild gefunden - Produkt ohne Bild erstellen
                        Product product = new Product();
                        product.setStore(store);
                        product.setTitle(template.name);
                        product.setDescription(template.description);
                        product.setBasePrice(template.price);
                        product.setStock(template.stock);
                        product.setStatus(ProductStatus.ACTIVE);
                        
                        productRepository.save(product);
                        successCount++;
                        log.debug("✅ Created product: {} without image (no Unsplash result)", template.name);
                    }

                } catch (Exception e) {
                    log.warn("⚠️ Failed to create product {}: {}", template.name, e.getMessage());
                }
            }

            log.info("✅ Initialized {} sample products for store {}", successCount, storeId);
            return successCount > 0;

        } catch (Exception e) {
            log.error("❌ Failed to initialize products for store {}: {}", storeId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Produkt-Templates basierend auf BusinessType und Kategorie.
     */
    private List<ProductTemplate> getProductTemplates(BusinessType businessType, String category) {
        if (businessType == BusinessType.RESTAURANT) {
            return getRestaurantProducts(category);
        } else if (businessType == BusinessType.RIAD) {
            return getRiadProducts(category);
        } else {
            return getShopProducts(category);
        }
    }

    private List<ProductTemplate> getRestaurantProducts(String category) {
        return switch (category != null ? category.toLowerCase() : "general") {
            case "moroccan" -> Arrays.asList(
                new ProductTemplate("Tajine mit Lamm", "Traditioneller marokkanischer Tajine mit zartem Lammfleisch, Pflaumen und Mandeln", 
                    "moroccan tagine lamb", new BigDecimal("85.00"), 999),
                new ProductTemplate("Couscous Royal", "Hausgemachter Couscous mit Gemüse und Fleisch nach traditionellem Rezept", 
                    "moroccan couscous", new BigDecimal("75.00"), 999),
                new ProductTemplate("Pastilla", "Süß-salzige Pastete mit Hühnchen, Mandeln und Zimt", 
                    "moroccan pastilla", new BigDecimal("65.00"), 999),
                new ProductTemplate("Harira-Suppe", "Reichhaltige marokkanische Suppe mit Kichererbsen und Linsen", 
                    "moroccan harira soup", new BigDecimal("35.00"), 999)
            );
            case "fastfood" -> Arrays.asList(
                new ProductTemplate("Classic Burger", "Saftiger Beef-Burger mit Salat, Tomate und hausgemachter Sauce", 
                    "hamburger burger", new BigDecimal("45.00"), 999),
                new ProductTemplate("Crispy Chicken Wings", "12 knusprige Chicken Wings mit BBQ-Sauce", 
                    "chicken wings", new BigDecimal("55.00"), 999),
                new ProductTemplate("French Fries", "Goldene Pommes Frites mit Ketchup und Mayo", 
                    "french fries", new BigDecimal("25.00"), 999)
            );
            case "pizza" -> Arrays.asList(
                new ProductTemplate("Pizza Margherita", "Klassische Pizza mit Tomatensauce, Mozzarella und Basilikum", 
                    "pizza margherita", new BigDecimal("60.00"), 999),
                new ProductTemplate("Pizza Quattro Formaggi", "Vier verschiedene Käsesorten auf dünnem Teig", 
                    "pizza quattro formaggi cheese", new BigDecimal("75.00"), 999),
                new ProductTemplate("Pizza Diavola", "Scharfe Pizza mit Salami, Peperoni und Chili", 
                    "pizza pepperoni spicy", new BigDecimal("70.00"), 999)
            );
            default -> Arrays.asList(
                new ProductTemplate("Tagesmenü", "Wechselndes 3-Gänge-Menü mit Vorspeise, Hauptgang und Dessert", 
                    "restaurant meal plated", new BigDecimal("120.00"), 999),
                new ProductTemplate("Gegrilltes Hähnchen", "Halbes Hähnchen vom Grill mit Beilagen", 
                    "grilled chicken", new BigDecimal("85.00"), 999),
                new ProductTemplate("Vegetarischer Teller", "Gemischter Gemüseteller mit hausgemachten Dips", 
                    "vegetarian platter", new BigDecimal("65.00"), 999)
            );
        };
    }

    private List<ProductTemplate> getRiadProducts(String category) {
        return switch (category != null ? category.toLowerCase() : "general") {
            case "traditional" -> Arrays.asList(
                new ProductTemplate("Traditionelles Doppelzimmer", "Authentisch eingerichtetes Zimmer mit marokkanischer Dekoration", 
                    "moroccan traditional bedroom riad", new BigDecimal("450.00"), 10),
                new ProductTemplate("Innenhof-Suite", "Großzügige Suite mit Blick auf den traditionellen Innenhof", 
                    "riad courtyard suite", new BigDecimal("650.00"), 5),
                new ProductTemplate("Dachterrasse-Zimmer", "Zimmer mit Zugang zur Dachterrasse mit Stadtblick", 
                    "riad rooftop terrace", new BigDecimal("550.00"), 8)
            );
            case "luxury", "luxus" -> Arrays.asList(
                new ProductTemplate("Royal Suite", "Luxuriöse Suite mit eigenem Salon und Premium-Ausstattung", 
                    "luxury hotel suite morocco", new BigDecimal("1200.00"), 3),
                new ProductTemplate("Spa-Zimmer", "Zimmer mit privatem Hammam und Massage-Bereich", 
                    "luxury spa room hammam", new BigDecimal("950.00"), 4),
                new ProductTemplate("Penthouse-Suite", "Exklusive Suite auf der Dachterrasse mit Panoramablick", 
                    "luxury penthouse terrace morocco", new BigDecimal("1500.00"), 2)
            );
            default -> Arrays.asList(
                new ProductTemplate("Standard Doppelzimmer", "Komfortables Zimmer mit marokkanischem Flair", 
                    "riad room bedroom", new BigDecimal("350.00"), 12),
                new ProductTemplate("Familienzimmer", "Geräumiges Zimmer für bis zu 4 Personen", 
                    "family room hotel", new BigDecimal("550.00"), 6),
                new ProductTemplate("Suite mit Terrasse", "Suite mit privater Terrasse und Sitzbereich", 
                    "hotel suite terrace", new BigDecimal("750.00"), 4)
            );
        };
    }

    private List<ProductTemplate> getShopProducts(String category) {
        return switch (category != null ? category.toLowerCase() : "general") {
            case "fashion" -> Arrays.asList(
                new ProductTemplate("Designer T-Shirt", "Hochwertiges Baumwoll-Shirt in verschiedenen Farben", 
                    "fashion tshirt clothing", new BigDecimal("199.00"), 50),
                new ProductTemplate("Jeans Classic Fit", "Klassische Jeans mit perfekter Passform", 
                    "jeans denim pants", new BigDecimal("399.00"), 30),
                new ProductTemplate("Sneakers Urban Style", "Trendige Sneakers für jeden Tag", 
                    "sneakers shoes fashion", new BigDecimal("599.00"), 25)
            );
            case "electronics" -> Arrays.asList(
                new ProductTemplate("Wireless Kopfhörer", "Premium Bluetooth-Kopfhörer mit Noise Cancelling", 
                    "wireless headphones", new BigDecimal("899.00"), 20),
                new ProductTemplate("Smartphone Hülle", "Schützende Hülle aus hochwertigem Material", 
                    "phone case smartphone", new BigDecimal("149.00"), 100),
                new ProductTemplate("Power Bank 20000mAh", "Leistungsstarke Powerbank für unterwegs", 
                    "power bank portable charger", new BigDecimal("299.00"), 40)
            );
            case "beauty" -> Arrays.asList(
                new ProductTemplate("Gesichtscreme Deluxe", "Feuchtigkeitsspendende Creme für alle Hauttypen", 
                    "face cream skincare", new BigDecimal("249.00"), 50),
                new ProductTemplate("Parfum Eau de Parfum", "Eleganter Duft für besondere Momente", 
                    "perfume fragrance bottle", new BigDecimal("699.00"), 25),
                new ProductTemplate("Make-up Set", "Komplettes Set für das perfekte Make-up", 
                    "makeup cosmetics set", new BigDecimal("499.00"), 30)
            );
            default -> Arrays.asList(
                new ProductTemplate("Bestseller Produkt", "Unser meistverkauftes Produkt in Premium-Qualität", 
                    "product retail display", new BigDecimal("299.00"), 50),
                new ProductTemplate("Geschenkset Deluxe", "Hochwertiges Geschenkset für jeden Anlass", 
                    "gift set box", new BigDecimal("499.00"), 30),
                new ProductTemplate("Sonderangebot", "Limitiertes Angebot - Jetzt zugreifen!", 
                    "sale special offer product", new BigDecimal("199.00"), 100)
            );
        };
    }

    /**
     * Template für Produkt-Generierung.
     */
    private record ProductTemplate(
        String name,
        String description,
        String searchQuery,
        BigDecimal price,
        int stock
    ) {}
}
