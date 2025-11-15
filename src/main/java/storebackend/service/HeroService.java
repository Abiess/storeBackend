package storebackend.service;

import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.Ellipse2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Map;
import java.util.Random;

@Service
public class HeroService {

    public byte[] generateHeroBanner(String style, Map<String, String> palette, String shopName) {
        int width = 1920;
        int height = 1080;

        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = image.createGraphics();
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);

        Color primary = Color.decode(palette.get("--color-primary"));
        Color secondary = Color.decode(palette.get("--color-secondary"));
        Color accent = Color.decode(palette.get("--color-accent"));

        // Gradient background
        GradientPaint gradient = new GradientPaint(
            0, 0, primary,
            width, height, secondary
        );
        g2d.setPaint(gradient);
        g2d.fillRect(0, 0, width, height);

        // Add decorative shapes based on style
        Random random = new Random(shopName.hashCode());
        g2d.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, 0.2f));

        switch (style.toLowerCase()) {
            case "geometric":
                drawGeometricPattern(g2d, width, height, accent, random);
                break;
            case "playful":
                drawPlayfulPattern(g2d, width, height, accent, random);
                break;
            case "organic":
                drawOrganicPattern(g2d, width, height, accent, random);
                break;
            default:
                drawMinimalPattern(g2d, width, height, accent, random);
        }

        g2d.dispose();

        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "JPG", baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate hero banner", e);
        }
    }

    private void drawGeometricPattern(Graphics2D g2d, int width, int height, Color color, Random random) {
        g2d.setColor(color);
        for (int i = 0; i < 20; i++) {
            int size = 50 + random.nextInt(150);
            int x = random.nextInt(width);
            int y = random.nextInt(height);

            int[] xPoints = {x, x + size, x + size / 2};
            int[] yPoints = {y, y, y + size};
            g2d.fillPolygon(xPoints, yPoints, 3);
        }
    }

    private void drawPlayfulPattern(Graphics2D g2d, int width, int height, Color color, Random random) {
        g2d.setColor(color);
        for (int i = 0; i < 30; i++) {
            int size = 30 + random.nextInt(100);
            int x = random.nextInt(width);
            int y = random.nextInt(height);
            g2d.fill(new Ellipse2D.Double(x, y, size, size));
        }
    }

    private void drawOrganicPattern(Graphics2D g2d, int width, int height, Color color, Random random) {
        g2d.setColor(color);
        g2d.setStroke(new BasicStroke(3f));
        for (int i = 0; i < 15; i++) {
            int x1 = random.nextInt(width);
            int y1 = random.nextInt(height);
            int x2 = x1 + random.nextInt(200) - 100;
            int y2 = y1 + random.nextInt(200) - 100;
            g2d.drawLine(x1, y1, x2, y2);
        }
    }

    private void drawMinimalPattern(Graphics2D g2d, int width, int height, Color color, Random random) {
        g2d.setColor(color);
        for (int i = 0; i < 10; i++) {
            int size = 100 + random.nextInt(200);
            int x = random.nextInt(width);
            int y = random.nextInt(height);
            g2d.drawOval(x, y, size, size);
        }
    }
}

