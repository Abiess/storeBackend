package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class LogoServiceTest {

    private LogoService logoService;

    @BeforeEach
    void setUp() {
        logoService = new LogoService();
    }

    @Test
    void testExtractInitials_SingleWord() {
        String initials = logoService.extractInitials("Shop");
        assertEquals("S", initials);
    }

    @Test
    void testExtractInitials_TwoWords() {
        String initials = logoService.extractInitials("My Shop");
        assertEquals("MS", initials);
    }

    @Test
    void testExtractInitials_ThreeWords() {
        String initials = logoService.extractInitials("My Amazing Shop");
        assertEquals("MAS", initials);
    }

    @Test
    void testExtractInitials_MoreThanThreeWords() {
        String initials = logoService.extractInitials("My Super Amazing Cool Shop");
        assertEquals("MSA", initials, "Should only take first 3 initials");
    }

    @Test
    void testExtractInitials_EmptyString() {
        String initials = logoService.extractInitials("");
        assertEquals("?", initials);
    }

    @Test
    void testExtractInitials_Null() {
        String initials = logoService.extractInitials(null);
        assertEquals("?", initials);
    }

    @Test
    void testExtractInitials_LowerCase() {
        String initials = logoService.extractInitials("my shop");
        assertEquals("MS", initials, "Should convert to uppercase");
    }

    @Test
    void testGenerateLogoSvg_Minimal() {
        Map<String, String> palette = createTestPalette();
        String svg = logoService.generateLogoSvg("MS", "minimal", palette);

        assertNotNull(svg);
        assertTrue(svg.contains("<?xml version=\"1.0\""));
        assertTrue(svg.contains("<svg"));
        assertTrue(svg.contains("MS"));
        assertTrue(svg.contains("circle"), "Minimal style should use circle");
    }

    @Test
    void testGenerateLogoSvg_Geometric() {
        Map<String, String> palette = createTestPalette();
        String svg = logoService.generateLogoSvg("GS", "geometric", palette);

        assertNotNull(svg);
        assertTrue(svg.contains("polygon"), "Geometric style should use polygon");
    }

    @Test
    void testGenerateLogoSvg_Playful() {
        Map<String, String> palette = createTestPalette();
        String svg = logoService.generateLogoSvg("PS", "playful", palette);

        assertNotNull(svg);
        assertTrue(svg.contains("path"), "Playful style should use path");
    }

    @Test
    void testGenerateLogoSvg_Organic() {
        Map<String, String> palette = createTestPalette();
        String svg = logoService.generateLogoSvg("OS", "organic", palette);

        assertNotNull(svg);
        assertTrue(svg.contains("path"), "Organic style should use path");
    }

    @Test
    void testGenerateLogoSvg_ContainsPaletteColors() {
        Map<String, String> palette = createTestPalette();
        String svg = logoService.generateLogoSvg("MS", "minimal", palette);

        assertTrue(svg.contains("#1976D2") || svg.contains("#FF5733"),
            "SVG should contain palette colors");
    }

    @Test
    void testGenerateLogoSvg_Deterministic() {
        Map<String, String> palette = createTestPalette();
        String svg1 = logoService.generateLogoSvg("MS", "minimal", palette);
        String svg2 = logoService.generateLogoSvg("MS", "minimal", palette);

        assertEquals(svg1, svg2, "Same inputs should produce same SVG");
    }

    private Map<String, String> createTestPalette() {
        Map<String, String> palette = new HashMap<>();
        palette.put("--color-primary", "#1976D2");
        palette.put("--color-secondary", "#424242");
        palette.put("--color-accent", "#FF5733");
        palette.put("--color-text", "#212121");
        return palette;
    }
}

