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

