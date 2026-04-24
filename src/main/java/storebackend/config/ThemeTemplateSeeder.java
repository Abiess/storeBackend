package storebackend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.ThemeTemplate;
import storebackend.repository.ThemeTemplateRepository;

import java.util.List;

/**
 * Seedet den Free-Template-Katalog beim Start, falls die jeweiligen
 * Templates (Code-basiert) noch nicht existieren.
 *
 * Reuse-First: Verwendet ausschließlich die bestehende {@link ThemeTemplate}-Entity.
 * Keine Schema-Änderungen, keine neuen Spalten.
 *
 * Das {@code template}-Feld dient gleichzeitig als <b>Layout-Slug</b> für das
 * Storefront-Frontend (z.B. MODERN_GRID, CLASSIC_BOOTSTRAP, MINIMAL_DARK).
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(20) // nach DataInitializer (Stores/Plans), vor optionalen User-Seeds
public class ThemeTemplateSeeder {

    private final ThemeTemplateRepository repository;

    @EventListener(ContextRefreshedEvent.class)
    @Transactional
    public void seed() {
        List<ThemeTemplate> defaults = List.of(
            buildModernGrid(),
            buildClassicBootstrap(),
            buildMinimalDark(),
            buildElectronicsPro(),
            buildFashionEditorial(),
            buildBeautySoft(),
            buildRestaurantWarm()
        );

        int created = 0;
        for (ThemeTemplate t : defaults) {
            if (repository.findByCode(t.getCode()).isEmpty()) {
                repository.save(t);
                created++;
                log.info("🎨 Theme-Template angelegt: {} ({})", t.getName(), t.getCode());
            }
        }

        if (created == 0) {
            log.debug("🎨 Theme-Templates bereits vorhanden – kein Seeding nötig.");
        } else {
            log.info("✅ {} neue Theme-Template(s) im Katalog registriert.", created);
        }
    }

    // ---------------------------------------------------------------------
    // Template-Definitionen (alle MIT-lizenziert / Eigenbau)
    // ---------------------------------------------------------------------

    private ThemeTemplate buildModernGrid() {
        ThemeTemplate t = new ThemeTemplate();
        t.setCode("MODERN_GRID");
        t.setName("Modern Grid");
        t.setDescription("Klares, modernes Sidebar-+-Grid-Layout (Standard).");
        t.setType("MODERN");
        t.setTemplate("MODERN_GRID"); // = Layout-Slug für Frontend
        t.setPreviewUrl("/assets/themes/modern-grid.svg");
        t.setColorsJson("""
            {
              "primary":"#2563eb",
              "secondary":"#1e40af",
              "accent":"#f59e0b",
              "background":"#f6f7fb",
              "surface":"#ffffff",
              "text":"#111827",
              "textSecondary":"#6b7280",
              "border":"#e5e7eb",
              "success":"#10b981",
              "warning":"#f59e0b",
              "error":"#ef4444"
            }""");
        t.setTypographyJson("""
            {
              "fontFamily":"'Inter', sans-serif",
              "headingFamily":"'Inter', sans-serif",
              "baseSize":"16px"
            }""");
        t.setLayoutJson("""
            {
              "productGridColumns":4,
              "containerWidth":"1400px",
              "borderRadius":"12px"
            }""");
        t.setIsFree(true);
        t.setIsActive(true);
        t.setSortOrder(10);
        return t;
    }

    private ThemeTemplate buildClassicBootstrap() {
        ThemeTemplate t = new ThemeTemplate();
        t.setCode("CLASSIC_BOOTSTRAP");
        t.setName("Classic Shop");
        t.setDescription("Klassisches Bootstrap-Shop-Layout mit Hero-Banner und 3er-Produktraster.");
        t.setType("CLASSIC");
        t.setTemplate("CLASSIC_BOOTSTRAP");
        t.setPreviewUrl("/assets/themes/classic-bootstrap.svg");
        t.setColorsJson("""
            {
              "primary":"#198754",
              "secondary":"#0d6efd",
              "accent":"#dc3545",
              "background":"#ffffff",
              "surface":"#f8f9fa",
              "text":"#212529",
              "textSecondary":"#6c757d",
              "border":"#dee2e6",
              "success":"#198754",
              "warning":"#ffc107",
              "error":"#dc3545"
            }""");
        t.setTypographyJson("""
            {
              "fontFamily":"'Helvetica Neue', Arial, sans-serif",
              "headingFamily":"'Georgia', serif",
              "baseSize":"16px"
            }""");
        t.setLayoutJson("""
            {
              "productGridColumns":3,
              "containerWidth":"1200px",
              "borderRadius":"6px"
            }""");
        t.setIsFree(true);
        t.setIsActive(true);
        t.setSortOrder(20);
        return t;
    }

    private ThemeTemplate buildMinimalDark() {
        ThemeTemplate t = new ThemeTemplate();
        t.setCode("MINIMAL_DARK");
        t.setName("Minimal Dark");
        t.setDescription("Reduziertes Dark-Theme mit großen Produktbildern – ideal für Mode/Design.");
        t.setType("DARK");
        t.setTemplate("MINIMAL_DARK");
        t.setPreviewUrl("/assets/themes/minimal-dark.svg");
        t.setColorsJson("""
            {
              "primary":"#f5f5f5",
              "secondary":"#a3a3a3",
              "accent":"#facc15",
              "background":"#0a0a0a",
              "surface":"#171717",
              "text":"#fafafa",
              "textSecondary":"#a3a3a3",
              "border":"#262626",
              "success":"#22c55e",
              "warning":"#facc15",
              "error":"#ef4444"
            }""");
        t.setTypographyJson("""
            {
              "fontFamily":"'Helvetica Neue', sans-serif",
              "headingFamily":"'Helvetica Neue', sans-serif",
              "baseSize":"16px"
            }""");
        t.setLayoutJson("""
            {
              "productGridColumns":3,
              "containerWidth":"1320px",
              "borderRadius":"0px"
            }""");
        t.setIsFree(true);
        t.setIsActive(true);
        t.setSortOrder(30);
        return t;
    }

    // ---------------------------------------------------------------------
    // Branchen-Templates (Reuse bestehender Layouts mit Branchen-Farbpalette)
    // ---------------------------------------------------------------------

    /**
     * Electronics Pro – Layout aus Start Bootstrap "Modern Business" (MIT-Lizenz).
     * Layout-Slug: ELECTRONICS_PRO (eigene Hero + 4er-Grid).
     */
    private ThemeTemplate buildElectronicsPro() {
        ThemeTemplate t = new ThemeTemplate();
        t.setCode("ELECTRONICS_PRO");
        t.setName("Electronics Pro");
        t.setDescription("Tech-Look mit Hero-Banner, großen Produktkarten und Vergleichs-Akzenten. "
            + "Layout basiert auf Start Bootstrap (MIT).");
        t.setType("MODERN");
        t.setTemplate("ELECTRONICS_PRO");
        t.setPreviewUrl("/assets/themes/electronics-pro.svg");
        t.setColorsJson("""
            {
              "primary":"#0ea5e9",
              "secondary":"#0369a1",
              "accent":"#f97316",
              "background":"#f1f5f9",
              "surface":"#ffffff",
              "text":"#0f172a",
              "textSecondary":"#475569",
              "border":"#e2e8f0",
              "success":"#22c55e",
              "warning":"#f59e0b",
              "error":"#ef4444"
            }""");
        t.setTypographyJson("""
            {
              "fontFamily":"'Inter', sans-serif",
              "headingFamily":"'Inter', sans-serif",
              "baseSize":"16px"
            }""");
        t.setLayoutJson("""
            {
              "productGridColumns":4,
              "containerWidth":"1320px",
              "borderRadius":"8px"
            }""");
        t.setIsFree(true);
        t.setIsActive(true);
        t.setSortOrder(40);
        return t;
    }

    /**
     * Fashion Editorial – Layout inspiriert von HTML5UP "Editorial" (CC-BY 3.0).
     * <p>
     * Hinweis: Die zugehörige Frontend-Layout-Komponente rendert einen
     * dezenten Footer-Credit "Design: HTML5UP", um die CC-BY-3.0-Attribution
     * automatisch zu erfüllen.
     */
    private ThemeTemplate buildFashionEditorial() {
        ThemeTemplate t = new ThemeTemplate();
        t.setCode("FASHION_EDITORIAL");
        t.setName("Fashion Editorial");
        t.setDescription("Eleganter Editorial-Look mit großen Bildern, Serifen-Typografie und ruhiger Farbpalette. "
            + "Inspiriert von HTML5UP Editorial (CC-BY 3.0, Footer-Attribution automatisch).");
        t.setType("ELEGANT");
        t.setTemplate("FASHION_EDITORIAL");
        t.setPreviewUrl("/assets/themes/fashion-editorial.svg");
        t.setColorsJson("""
            {
              "primary":"#1f2937",
              "secondary":"#6b7280",
              "accent":"#b45309",
              "background":"#fafaf9",
              "surface":"#ffffff",
              "text":"#1f2937",
              "textSecondary":"#6b7280",
              "border":"#e7e5e4",
              "success":"#15803d",
              "warning":"#b45309",
              "error":"#b91c1c"
            }""");
        t.setTypographyJson("""
            {
              "fontFamily":"'Cormorant Garamond', Georgia, serif",
              "headingFamily":"'Cormorant Garamond', Georgia, serif",
              "baseSize":"17px"
            }""");
        t.setLayoutJson("""
            {
              "productGridColumns":3,
              "containerWidth":"1280px",
              "borderRadius":"2px"
            }""");
        t.setIsFree(true);
        t.setIsActive(true);
        t.setSortOrder(50);
        return t;
    }

    /**
     * Beauty Soft – wiederverwendet das MODERN_GRID-Layout
     * mit warmer Pastell-Palette für Kosmetik/Beauty-Stores.
     */
    private ThemeTemplate buildBeautySoft() {
        ThemeTemplate t = new ThemeTemplate();
        t.setCode("BEAUTY_SOFT");
        t.setName("Beauty Soft");
        t.setDescription("Sanftes Pastell-Design für Kosmetik- und Wellness-Stores. "
            + "Reuse des Modern-Grid-Layouts mit warmer Farbpalette.");
        t.setType("MINIMAL");
        t.setTemplate("MODERN_GRID"); // Reuse Layout
        t.setPreviewUrl("/assets/themes/beauty-soft.svg");
        t.setColorsJson("""
            {
              "primary":"#db2777",
              "secondary":"#9d174d",
              "accent":"#f59e0b",
              "background":"#fdf2f8",
              "surface":"#ffffff",
              "text":"#831843",
              "textSecondary":"#9d174d",
              "border":"#fbcfe8",
              "success":"#10b981",
              "warning":"#f59e0b",
              "error":"#ef4444"
            }""");
        t.setTypographyJson("""
            {
              "fontFamily":"'Inter', sans-serif",
              "headingFamily":"'Cormorant Garamond', serif",
              "baseSize":"16px"
            }""");
        t.setLayoutJson("""
            {
              "productGridColumns":3,
              "containerWidth":"1280px",
              "borderRadius":"16px"
            }""");
        t.setIsFree(true);
        t.setIsActive(true);
        t.setSortOrder(60);
        return t;
    }

    /**
     * Restaurant Warm – wiederverwendet das CLASSIC_BOOTSTRAP-Layout
     * mit warmer Erdfarben-Palette für Restaurants/Foodstores.
     */
    private ThemeTemplate buildRestaurantWarm() {
        ThemeTemplate t = new ThemeTemplate();
        t.setCode("RESTAURANT_WARM");
        t.setName("Restaurant Warm");
        t.setDescription("Warmer, einladender Look mit Erdtönen für Restaurants und Foodstores. "
            + "Reuse des Classic-Shop-Layouts (Start Bootstrap, MIT) mit Restaurant-Palette.");
        t.setType("CLASSIC");
        t.setTemplate("CLASSIC_BOOTSTRAP"); // Reuse Layout
        t.setPreviewUrl("/assets/themes/restaurant-warm.svg");
        t.setColorsJson("""
            {
              "primary":"#b45309",
              "secondary":"#78350f",
              "accent":"#dc2626",
              "background":"#fffbeb",
              "surface":"#ffffff",
              "text":"#451a03",
              "textSecondary":"#78350f",
              "border":"#fde68a",
              "success":"#15803d",
              "warning":"#d97706",
              "error":"#b91c1c"
            }""");
        t.setTypographyJson("""
            {
              "fontFamily":"'Helvetica Neue', Arial, sans-serif",
              "headingFamily":"'Playfair Display', Georgia, serif",
              "baseSize":"16px"
            }""");
        t.setLayoutJson("""
            {
              "productGridColumns":3,
              "containerWidth":"1200px",
              "borderRadius":"6px"
            }""");
        t.setIsFree(true);
        t.setIsActive(true);
        t.setSortOrder(70);
        return t;
    }
}

