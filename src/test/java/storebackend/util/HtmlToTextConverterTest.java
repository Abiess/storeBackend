package storebackend.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests für HtmlToTextConverter.
 * 
 * Testet insbesondere:
 * - WooCommerce-HTML mit Nährwerttabellen
 * - HTML-Entity-Dekodierung
 * - Französische Sonderzeichen
 * - XSS-Schutz
 */
class HtmlToTextConverterTest {

    private HtmlToTextConverter converter;

    @BeforeEach
    void setUp() {
        converter = new HtmlToTextConverter();
    }

    @Test
    void testNull() {
        assertNull(converter.convert(null));
    }

    @Test
    void testEmpty() {
        assertNull(converter.convert(""));
        assertNull(converter.convert("   "));
    }

    @Test
    void testSimpleText() {
        String result = converter.convert("Hello World");
        assertEquals("Hello World", result);
    }

    @Test
    void testSimpleParagraph() {
        String html = "<p>Hello World</p>";
        String result = converter.convert(html);
        assertEquals("Hello World", result);
    }

    @Test
    void testMultipleParagraphs() {
        String html = "<p>First paragraph</p><p>Second paragraph</p>";
        String result = converter.convert(html);
        assertTrue(result.contains("First paragraph"));
        assertTrue(result.contains("Second paragraph"));
        // Sollte Absätze trennen
        assertTrue(result.contains("\n"));
    }

    @Test
    void testLineBreaks() {
        String html = "<p>Line 1<br>Line 2<br>Line 3</p>";
        String result = converter.convert(html);
        assertTrue(result.contains("Line 1"));
        assertTrue(result.contains("Line 2"));
        assertTrue(result.contains("Line 3"));
        // Sollte Zeilenumbrüche enthalten
        assertTrue(result.split("\n").length >= 3);
    }

    @Test
    void testWooCommerceNutritionTable() {
        // Reales WooCommerce-Beispiel
        String html = "<p>Tableau nutritionnel Tel que vendu<br />\n" +
                "pour 100 g / 100 ml Tel que vendu<br />\n" +
                "par portion (19 g) Comparé à: en:epicerie<br />\n" +
                "Énergie 660,5 kj<br />\n" +
                "(158 kcal) 125 kj<br />\n" +
                "(30 kcal) -29 %<br />\n" +
                "Matières grasses 11,19 g 2,13 g -26 %<br />\n" +
                "Acides gras saturés 0,71 g 0,135 g -60 %<br />\n" +
                "</p>";

        String result = converter.convert(html);

        // Sollte Hauptbegriffe enthalten
        assertTrue(result.contains("Tableau nutritionnel"));
        assertTrue(result.contains("Énergie"));
        assertTrue(result.contains("Matières grasses"));
        assertTrue(result.contains("660,5 kj"));

        // Sollte keine HTML-Tags enthalten
        assertFalse(result.contains("<p>"));
        assertFalse(result.contains("<br"));
        assertFalse(result.contains("</p>"));

        // Sollte strukturiert sein (mehrere Zeilen)
        assertTrue(result.split("\n").length >= 5);
    }

    @Test
    void testHtmlEntities() {
        String html = "<p>Test &amp; Produkt &nbsp; &eacute; &euro;</p>";
        String result = converter.convert(html);
        
        // Entities sollten dekodiert sein
        assertTrue(result.contains("&"));
        assertTrue(result.contains("é"));
        assertTrue(result.contains("€"));
        
        // Keine rohen Entity-Codes
        assertFalse(result.contains("&amp;"));
        assertFalse(result.contains("&eacute;"));
        assertFalse(result.contains("&euro;"));
    }

    @Test
    void testFrenchCharacters() {
        String html = "<p>Produit français avec caractères spéciaux: é è ê ë à â ä ù û ü ô ö î ï ç</p>";
        String result = converter.convert(html);
        
        // Französische Zeichen müssen erhalten bleiben
        assertTrue(result.contains("français"));
        assertTrue(result.contains("é"));
        assertTrue(result.contains("è"));
        assertTrue(result.contains("ê"));
        assertTrue(result.contains("ç"));
    }

    @Test
    void testScriptTagsRemoved() {
        String html = "<p>Safe content</p><script>alert('XSS')</script><p>More content</p>";
        String result = converter.convert(html);
        
        // Script-Inhalt sollte NICHT im Output sein
        assertFalse(result.contains("alert"));
        assertFalse(result.contains("XSS"));
        assertFalse(result.contains("<script>"));
        
        // Sicherer Inhalt sollte vorhanden sein
        assertTrue(result.contains("Safe content"));
        assertTrue(result.contains("More content"));
    }

    @Test
    void testStyleTagsRemoved() {
        String html = "<p>Content</p><style>.class { color: red; }</style>";
        String result = converter.convert(html);
        
        // Style-Inhalt sollte NICHT im Output sein
        assertFalse(result.contains("color"));
        assertFalse(result.contains(".class"));
        assertFalse(result.contains("<style>"));
        
        // Inhalt sollte vorhanden sein
        assertTrue(result.contains("Content"));
    }

    @Test
    void testIframeRemoved() {
        String html = "<p>Before</p><iframe src='http://evil.com'></iframe><p>After</p>";
        String result = converter.convert(html);
        
        assertFalse(result.contains("iframe"));
        assertFalse(result.contains("evil.com"));
        assertTrue(result.contains("Before"));
        assertTrue(result.contains("After"));
    }

    @Test
    void testUnorderedList() {
        String html = "<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>";
        String result = converter.convert(html);
        
        // Sollte Bullet-Points oder Struktur haben
        assertTrue(result.contains("Item 1"));
        assertTrue(result.contains("Item 2"));
        assertTrue(result.contains("Item 3"));
        
        // Idealerweise mit Marker
        assertTrue(result.contains("•") || result.split("\n").length >= 3);
    }

    @Test
    void testOrderedList() {
        String html = "<ol><li>First</li><li>Second</li><li>Third</li></ol>";
        String result = converter.convert(html);
        
        assertTrue(result.contains("First"));
        assertTrue(result.contains("Second"));
        assertTrue(result.contains("Third"));
        
        // Idealerweise mit Nummern
        assertTrue(result.contains("1.") || result.split("\n").length >= 3);
    }

    @Test
    void testHeadings() {
        String html = "<h1>Title</h1><h2>Subtitle</h2><p>Content</p>";
        String result = converter.convert(html);
        
        assertTrue(result.contains("Title"));
        assertTrue(result.contains("Subtitle"));
        assertTrue(result.contains("Content"));
        
        // Sollte strukturiert sein
        assertTrue(result.split("\n").length >= 2);
    }

    @Test
    void testWhitespaceCleanup() {
        String html = "<p>Too    many   spaces</p>";
        String result = converter.convert(html);
        
        // Mehrfache Spaces sollten reduziert sein
        assertFalse(result.contains("    "));
        assertTrue(result.contains("Too many spaces"));
    }

    @Test
    void testMultipleLineBreaksReduced() {
        String html = "<p>Paragraph 1</p><br><br><br><br><p>Paragraph 2</p>";
        String result = converter.convert(html);
        
        // Sollte nicht mehr als 2 aufeinanderfolgende Zeilenumbrüche haben
        assertFalse(result.contains("\n\n\n"));
    }

    @Test
    void testNonBreakingSpaces() {
        String html = "<p>Word1&nbsp;&nbsp;&nbsp;Word2</p>";
        String result = converter.convert(html);
        
        // Non-breaking spaces sollten zu normalen Spaces werden
        assertFalse(result.contains("\u00A0"));
        assertTrue(result.contains("Word1"));
        assertTrue(result.contains("Word2"));
    }

    @Test
    void testMixedContent() {
        String html = "<div>" +
                "<h2>Product Description</h2>" +
                "<p>This is a <strong>great</strong> product.</p>" +
                "<ul><li>Feature 1</li><li>Feature 2</li></ul>" +
                "<p>Price: 29,99 €</p>" +
                "</div>";
        
        String result = converter.convert(html);
        
        assertTrue(result.contains("Product Description"));
        assertTrue(result.contains("great"));
        assertTrue(result.contains("Feature 1"));
        assertTrue(result.contains("29,99 €"));
        
        // Keine HTML-Tags
        assertFalse(result.contains("<div>"));
        assertFalse(result.contains("<strong>"));
    }

    @Test
    void testOnlyDangerousTags() {
        String html = "<script>alert('test')</script><style>body{}</style>";
        String result = converter.convert(html);
        
        // Sollte leer oder null sein (nur gefährliche Tags, kein sichtbarer Inhalt)
        assertTrue(result == null || result.isBlank());
    }

    @Test
    void testTrimming() {
        String html = "\n\n  <p>Content</p>  \n\n";
        String result = converter.convert(html);
        
        // Sollte getrimmt sein
        assertEquals("Content", result);
    }
}
