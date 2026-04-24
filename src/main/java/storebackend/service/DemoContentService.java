package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.Category;
import storebackend.entity.Product;
import storebackend.entity.Store;
import storebackend.enums.ProductStatus;
import storebackend.repository.CategoryRepository;
import storebackend.repository.ProductRepository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Befüllt einen frisch erstellten Store mit branchenpassenden Demo-Kategorien
 * und Demo-Produkten. Dadurch sieht der Store-Owner sofort einen "lebendigen"
 * Shop, sobald ein Template angewendet wurde, und muss nicht bei null anfangen.
 *
 * <p><b>Reuse-First:</b> Verwendet ausschließlich die bestehenden
 * {@link CategoryRepository} und {@link ProductRepository}. Keine neue Tabelle,
 * keine neue Spalte. Der Demo-Content lebt in normalen `categories` /
 * `products`-Datensätzen und kann vom User wie jedes andere Produkt
 * bearbeitet oder gelöscht werden.</p>
 *
 * <p><b>Idempotent:</b> Wird nur gefüllt, wenn der Store noch keine eigenen
 * Produkte/Kategorien hat. Schützt vor versehentlichem Überschreiben echter
 * Daten beim erneuten Wechsel des Templates.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DemoContentService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    /**
     * Branchen-Demo-Kataloge.
     * Key   = Template-Code aus {@code ThemeTemplateSeeder}.
     * Value = Liste von Demo-Kategorien mit jeweils 2-3 Demo-Produkten.
     */
    private static final Map<String, List<DemoCategory>> CATALOGS = Map.ofEntries(
        Map.entry("MODERN_GRID", List.of(
            new DemoCategory("Highlights", "Beliebte Produkte für den Einstieg.", List.of(
                new DemoProduct("Starter Bundle", "Sofort startklares Set für neue Kunden.", "19.99"),
                new DemoProduct("Premium-Edition", "Hochwertig verarbeitet, langlebig.", "49.00"),
                new DemoProduct("Geschenk-Set", "Liebevoll verpackt – perfekt zum Verschenken.", "29.50")
            )),
            new DemoCategory("Neu eingetroffen", "Frisch im Sortiment.", List.of(
                new DemoProduct("Modell 2026", "Aktuelles Modell mit allen neuen Features.", "59.90"),
                new DemoProduct("Limited Drop", "Nur in begrenzter Stückzahl verfügbar.", "79.00")
            ))
        )),
        Map.entry("CLASSIC_BOOTSTRAP", List.of(
            new DemoCategory("Bestseller", "Unsere meistverkauften Artikel.", List.of(
                new DemoProduct("Hausmarke Premium", "Bewährte Qualität zum fairen Preis.", "9.95"),
                new DemoProduct("Familien-Pack", "Großpackung mit 12 Stück.", "24.99")
            )),
            new DemoCategory("Angebote", "Aktuelle Aktionen & Rabatte.", List.of(
                new DemoProduct("Wochen-Angebot", "Diese Woche stark reduziert.", "5.99"),
                new DemoProduct("Sparpaket", "Drei für den Preis von zwei.", "14.99")
            ))
        )),
        Map.entry("MINIMAL_DARK", List.of(
            new DemoCategory("Editorial", "Ausgewählt von der Redaktion.", List.of(
                new DemoProduct("Black Series 01", "Reduziertes Design, kompromisslose Qualität.", "129.00"),
                new DemoProduct("Carbon Edition", "Leichtgewicht aus Carbon-Komposit.", "189.00")
            )),
            new DemoCategory("Accessoires", "Komplettiere den Look.", List.of(
                new DemoProduct("Strap Black", "Premium-Lederband, mattschwarz.", "39.00"),
                new DemoProduct("Travel Pouch", "Schutzhülle für unterwegs.", "24.00")
            ))
        )),
        Map.entry("ELECTRONICS_PRO", List.of(
            new DemoCategory("Smartphones", "Aktuelle Top-Modelle.", List.of(
                new DemoProduct("Aurora X12", "OLED, 5G, 256 GB.", "699.00"),
                new DemoProduct("Aurora X12 Pro", "Mit Telezoom-Kamera, 512 GB.", "899.00"),
                new DemoProduct("Aurora Lite", "Solides Mittelklasse-Modell.", "299.00")
            )),
            new DemoCategory("Laptops", "Für Arbeit, Studium & Gaming.", List.of(
                new DemoProduct("ProBook 14", "14\", 16 GB RAM, 512 GB SSD.", "1199.00"),
                new DemoProduct("GameStation 17", "RTX-GPU, 144Hz Display.", "1899.00")
            )),
            new DemoCategory("Audio", "Kopfhörer & Lautsprecher.", List.of(
                new DemoProduct("AirPods Q3", "Active Noise Cancelling.", "249.00"),
                new DemoProduct("SoundBar Mini", "Kompakter Bluetooth-Lautsprecher.", "79.00")
            ))
        )),
        Map.entry("FASHION_EDITORIAL", List.of(
            new DemoCategory("Damen", "Aktuelle Damenkollektion.", List.of(
                new DemoProduct("Silk Blouse Ivory", "Seidenbluse in Elfenbein.", "149.00"),
                new DemoProduct("Wide-Leg Trousers", "Hochgeschnittene Hose mit weitem Bein.", "189.00"),
                new DemoProduct("Cashmere Cardigan", "Reiner Kaschmir, handgefertigt.", "299.00")
            )),
            new DemoCategory("Herren", "Aktuelle Herrenkollektion.", List.of(
                new DemoProduct("Wool Blazer Navy", "Tailliert geschnitten, 100 % Wolle.", "349.00"),
                new DemoProduct("Linen Shirt White", "Leichtes Leinenhemd.", "129.00")
            )),
            new DemoCategory("Accessoires", "Schmuck, Taschen, Schuhe.", List.of(
                new DemoProduct("Leather Tote", "Vollnarbenleder, in Cognac.", "279.00"),
                new DemoProduct("Silver Hoops", "Klassische Creolen aus 925er Silber.", "89.00")
            ))
        )),
        Map.entry("BEAUTY_SOFT", List.of(
            new DemoCategory("Pflege", "Sanfte Pflege für jeden Hauttyp.", List.of(
                new DemoProduct("Rose Hydrating Serum", "Feuchtigkeitsspendend, mit Rosenwasser.", "34.90"),
                new DemoProduct("Aloe Day Cream", "Beruhigende Tagespflege.", "24.90"),
                new DemoProduct("Vitamin-C Booster", "Für strahlenden Teint.", "29.90")
            )),
            new DemoCategory("Make-up", "Naturnahe Looks.", List.of(
                new DemoProduct("Soft Glow Highlighter", "Cremiger Highlighter, vegan.", "19.90"),
                new DemoProduct("Velvet Lipstick Pink", "Mattes Finish, lange Haltbarkeit.", "16.90")
            )),
            new DemoCategory("Wellness", "Für die Sinne.", List.of(
                new DemoProduct("Bath Salt Lavender", "Entspannendes Badesalz.", "12.90"),
                new DemoProduct("Aromaöl Citrus", "Belebendes Aromaöl, 30 ml.", "9.90")
            ))
        )),
        Map.entry("RESTAURANT_WARM", List.of(
            new DemoCategory("Vorspeisen", "Frisch zubereitet.", List.of(
                new DemoProduct("Bruschetta Klassisch", "Mit Tomate, Basilikum, Olivenöl.", "5.90"),
                new DemoProduct("Caprese", "Tomate, Mozzarella, Basilikum.", "7.50")
            )),
            new DemoCategory("Hauptgerichte", "Hausgemacht & saisonal.", List.of(
                new DemoProduct("Pasta della Casa", "Tagesnudeln nach Art des Hauses.", "12.90"),
                new DemoProduct("Steak vom Grill", "200g Rinderhüfte, Kräuterbutter.", "22.50"),
                new DemoProduct("Veggie Bowl", "Quinoa, geröstetes Gemüse, Hummus.", "11.90")
            )),
            new DemoCategory("Dessert & Getränke", "Süßer Abschluss.", List.of(
                new DemoProduct("Tiramisu", "Klassisches Tiramisu, hausgemacht.", "5.90"),
                new DemoProduct("Espresso", "Kräftig und aromatisch.", "2.50")
            ))
        ))
    );

    /**
     * Befüllt den Store mit Demo-Daten passend zum Template-Code.
     *
     * @return Anzahl angelegter Produkte (0 wenn Store nicht leer war oder
     *         der Template-Code keinen Demo-Katalog hat).
     */
    @Transactional
    public int seedDemoContent(Store store, String templateCode) {
        if (store == null || templateCode == null) {
            return 0;
        }

        // Idempotenz: nur seeden, wenn Store leer ist.
        long existingProducts = productRepository.countByStoreId(store.getId());
        long existingCategories = categoryRepository
                .findByStoreIdOrderBySortOrderAsc(store.getId()).size();
        if (existingProducts > 0 || existingCategories > 0) {
            log.info("📦 Demo-Seeding übersprungen für Store {} – bereits {} Produkte / {} Kategorien vorhanden.",
                    store.getId(), existingProducts, existingCategories);
            return 0;
        }

        List<DemoCategory> catalog = CATALOGS.get(templateCode.toUpperCase());
        if (catalog == null || catalog.isEmpty()) {
            log.info("📦 Kein Demo-Katalog für Template '{}' definiert – Store bleibt leer.", templateCode);
            return 0;
        }

        int productsCreated = 0;
        int categoryOrder = 0;
        List<Category> savedCategories = new ArrayList<>();
        for (DemoCategory dc : catalog) {
            Category cat = new Category();
            cat.setStore(store);
            cat.setName(dc.name());
            cat.setDescription(dc.description());
            cat.setSortOrder(categoryOrder++);
            // Slug wird via @PrePersist generiert
            savedCategories.add(categoryRepository.save(cat));
        }

        for (int i = 0; i < catalog.size(); i++) {
            Category persisted = savedCategories.get(i);
            for (DemoProduct dp : catalog.get(i).products()) {
                Product p = new Product();
                p.setStore(store);
                p.setCategory(persisted);
                p.setTitle(dp.title());
                p.setDescription(dp.description());
                p.setBasePrice(new BigDecimal(dp.price()));
                p.setStatus(ProductStatus.ACTIVE);
                p.setIsFeatured(productsCreated < 4); // erste 4 als Highlight markieren
                p.setFeaturedOrder(productsCreated);
                productRepository.save(p);
                productsCreated++;
            }
        }

        log.info("✅ Demo-Content für Store {} angelegt: {} Kategorien, {} Produkte (Template: {})",
                store.getId(), savedCategories.size(), productsCreated, templateCode);
        return productsCreated;
    }

    /** Inneres Demo-Katalog-Schema. */
    private record DemoCategory(String name, String description, List<DemoProduct> products) { }
    private record DemoProduct(String title, String description, String price) { }
}

