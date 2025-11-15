package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class HeroServiceTest {

    private HeroService heroService;

    @BeforeEach
    void setUp() {
        heroService = new HeroService();
    }

    @Test
    void testGenerateHeroBanner_ReturnsValidImage() {
        Map<String, String> palette = createTestPalette();

        byte[] imageData = heroService.generateHeroBanner("minimal", palette, "TestShop");

        assertNotNull(imageData);
        assertTrue(imageData.length > 0, "Image data should not be empty");
    }

    @Test
    void testGenerateHeroBanner_Deterministic() {
        Map<String, String> palette = createTestPalette();

        byte[] image1 = heroService.generateHeroBanner("minimal", palette, "TestShop");
        byte[] image2 = heroService.generateHeroBanner("minimal", palette, "TestShop");

        assertArrayEquals(image1, image2, "Same inputs should produce same image");
    }

    @Test
    void testGenerateHeroBanner_DifferentStyles() {
        Map<String, String> palette = createTestPalette();

        byte[] minimal = heroService.generateHeroBanner("minimal", palette, "TestShop");
        byte[] geometric = heroService.generateHeroBanner("geometric", palette, "TestShop");
        byte[] playful = heroService.generateHeroBanner("playful", palette, "TestShop");
        byte[] organic = heroService.generateHeroBanner("organic", palette, "TestShop");

        assertNotNull(minimal);
        assertNotNull(geometric);
        assertNotNull(playful);
        assertNotNull(organic);

        // Different styles should produce different images
        assertFalse(java.util.Arrays.equals(minimal, geometric));
    }

    @Test
    void testGenerateHeroBanner_ValidJPEG() {
        Map<String, String> palette = createTestPalette();
        byte[] imageData = heroService.generateHeroBanner("minimal", palette, "TestShop");

        // Check JPEG magic bytes (FF D8 FF)
        assertEquals((byte) 0xFF, imageData[0]);
        assertEquals((byte) 0xD8, imageData[1]);
        assertEquals((byte) 0xFF, imageData[2]);
    }

    private Map<String, String> createTestPalette() {
        Map<String, String> palette = new HashMap<>();
        palette.put("--color-primary", "#1976D2");
        palette.put("--color-secondary", "#424242");
        palette.put("--color-accent", "#FF5733");
        return palette;
    }
}

