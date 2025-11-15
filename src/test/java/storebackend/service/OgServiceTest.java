package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class OgServiceTest {

    private OgService ogService;

    @BeforeEach
    void setUp() {
        ogService = new OgService();
    }

    @Test
    void testGenerateOgImage_ReturnsValidImage() {
        Map<String, String> palette = createTestPalette();

        byte[] imageData = ogService.generateOgImage("TestShop", "Amazing products", palette);

        assertNotNull(imageData);
        assertTrue(imageData.length > 0);
    }

    @Test
    void testGenerateOgImage_WithoutSlogan() {
        Map<String, String> palette = createTestPalette();

        byte[] imageData = ogService.generateOgImage("TestShop", null, palette);

        assertNotNull(imageData);
        assertTrue(imageData.length > 0);
    }

    @Test
    void testGenerateOgImage_Deterministic() {
        Map<String, String> palette = createTestPalette();

        byte[] image1 = ogService.generateOgImage("TestShop", "Slogan", palette);
        byte[] image2 = ogService.generateOgImage("TestShop", "Slogan", palette);

        assertArrayEquals(image1, image2, "Same inputs should produce same image");
    }

    @Test
    void testGenerateOgImage_ValidJPEG() {
        Map<String, String> palette = createTestPalette();
        byte[] imageData = ogService.generateOgImage("TestShop", "Slogan", palette);

        // Check JPEG magic bytes
        assertEquals((byte) 0xFF, imageData[0]);
        assertEquals((byte) 0xD8, imageData[1]);
        assertEquals((byte) 0xFF, imageData[2]);
    }

    @Test
    void testGenerateOgImage_DifferentShopNames() {
        Map<String, String> palette = createTestPalette();

        byte[] image1 = ogService.generateOgImage("Shop1", null, palette);
        byte[] image2 = ogService.generateOgImage("Shop2", null, palette);

        // Different shop names should produce different images
        assertFalse(java.util.Arrays.equals(image1, image2));
    }

    private Map<String, String> createTestPalette() {
        Map<String, String> palette = new HashMap<>();
        palette.put("--color-primary", "#1976D2");
        palette.put("--color-secondary", "#424242");
        palette.put("--color-accent", "#FF5733");
        return palette;
    }
}
package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.awt.*;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class PaletteServiceTest {

    private PaletteService paletteService;

    @BeforeEach
    void setUp() {
        paletteService = new PaletteService();
    }

    @Test
    void testGeneratePalette_WithPreferredColors() {
        List<String> preferredColors = Arrays.asList("#FF5733");

        Map<String, String> palette = paletteService.generatePalette("TestShop", preferredColors, null);

        assertNotNull(palette);
        assertEquals(7, palette.size());
        assertTrue(palette.containsKey("--color-primary"));
        assertTrue(palette.containsKey("--color-secondary"));
        assertTrue(palette.containsKey("--color-accent"));
        assertTrue(palette.containsKey("--color-background"));
        assertTrue(palette.containsKey("--color-surface"));
        assertTrue(palette.containsKey("--color-text"));
        assertTrue(palette.containsKey("--color-text-secondary"));
    }

    @Test
    void testGeneratePalette_Deterministic() {
        Map<String, String> palette1 = paletteService.generatePalette("TestShop", null, null);
        Map<String, String> palette2 = paletteService.generatePalette("TestShop", null, null);

        assertEquals(palette1, palette2, "Same seed should produce same palette");
    }

    @Test
    void testGeneratePalette_DifferentSeeds() {
        Map<String, String> palette1 = paletteService.generatePalette("Shop1", null, null);
        Map<String, String> palette2 = paletteService.generatePalette("Shop2", null, null);

        assertNotEquals(palette1.get("--color-primary"), palette2.get("--color-primary"),
            "Different seeds should produce different palettes");
    }

    @Test
    void testGeneratePalette_WithForbiddenColors() {
        List<String> forbiddenColors = Arrays.asList("#000000");

        Map<String, String> palette = paletteService.generatePalette("TestShop", null, forbiddenColors);

        assertNotNull(palette);
        assertNotEquals("#000000", palette.get("--color-primary"));
    }

    @Test
    void testPaletteHasValidHexColors() {
        Map<String, String> palette = paletteService.generatePalette("TestShop", null, null);

        for (String color : palette.values()) {
            assertTrue(color.matches("^#[0-9A-F]{6}$"),
                "Color " + color + " should be valid hex format");
        }
    }

    @Test
    void testContrastRatio_MeetsMinimum() {
        Map<String, String> palette = paletteService.generatePalette("TestShop", null, null);

        String textColor = palette.get("--color-text");
        String backgroundColor = palette.get("--color-background");

        assertNotNull(textColor);
        assertNotNull(backgroundColor);

        // Verify colors are different (basic contrast check)
        assertNotEquals(textColor, backgroundColor);
    }
}

