package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

import static org.junit.jupiter.api.Assertions.*;

class IconServiceTest {

    private IconService iconService;

    @BeforeEach
    void setUp() {
        iconService = new IconService();
    }

    @Test
    void testGenerateIcon_Size16() throws Exception {
        byte[] sourceImage = createTestImage(512, 512);

        byte[] icon = iconService.generateIcon(sourceImage, 16);

        assertNotNull(icon);
        assertTrue(icon.length > 0);

        BufferedImage image = ImageIO.read(new ByteArrayInputStream(icon));
        assertEquals(16, image.getWidth());
        assertEquals(16, image.getHeight());
    }

    @Test
    void testGenerateIcon_Size32() throws Exception {
        byte[] sourceImage = createTestImage(512, 512);

        byte[] icon = iconService.generateIcon(sourceImage, 32);

        BufferedImage image = ImageIO.read(new ByteArrayInputStream(icon));
        assertEquals(32, image.getWidth());
        assertEquals(32, image.getHeight());
    }

    @Test
    void testGenerateIcon_Size512() throws Exception {
        byte[] sourceImage = createTestImage(512, 512);

        byte[] icon = iconService.generateIcon(sourceImage, 512);

        BufferedImage image = ImageIO.read(new ByteArrayInputStream(icon));
        assertEquals(512, image.getWidth());
        assertEquals(512, image.getHeight());
    }

    @Test
    void testGenerateIcon_ValidPNG() throws Exception {
        byte[] sourceImage = createTestImage(512, 512);
        byte[] icon = iconService.generateIcon(sourceImage, 16);

        // Check PNG magic bytes (89 50 4E 47)
        assertEquals((byte) 0x89, icon[0]);
        assertEquals((byte) 0x50, icon[1]);
        assertEquals((byte) 0x4E, icon[2]);
        assertEquals((byte) 0x47, icon[3]);
    }

    private byte[] createTestImage(int width, int height) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, "PNG", baos);
        return baos.toByteArray();
    }
}

