package storebackend.service;

import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Map;

@Service
public class OgService {

    public byte[] generateOgImage(String shopName, String slogan, Map<String, String> palette) {
        int width = 1200;
        int height = 630;

        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = image.createGraphics();
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2d.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

        // Background
        Color primary = Color.decode(palette.get("--color-primary"));
        Color secondary = Color.decode(palette.get("--color-secondary"));
        GradientPaint gradient = new GradientPaint(0, 0, primary, width, height, secondary);
        g2d.setPaint(gradient);
        g2d.fillRect(0, 0, width, height);

        // Shop name
        g2d.setColor(Color.WHITE);
        Font titleFont = new Font("Arial", Font.BOLD, 72);
        g2d.setFont(titleFont);

        FontMetrics fm = g2d.getFontMetrics();
        int titleWidth = fm.stringWidth(shopName);
        int titleX = (width - titleWidth) / 2;
        int titleY = height / 2 - 30;

        // Add shadow for better readability
        g2d.setColor(new Color(0, 0, 0, 100));
        g2d.drawString(shopName, titleX + 3, titleY + 3);

        g2d.setColor(Color.WHITE);
        g2d.drawString(shopName, titleX, titleY);

        // Slogan
        if (slogan != null && !slogan.isEmpty()) {
            Font sloganFont = new Font("Arial", Font.PLAIN, 36);
            g2d.setFont(sloganFont);
            FontMetrics sfm = g2d.getFontMetrics();
            int sloganWidth = sfm.stringWidth(slogan);
            int sloganX = (width - sloganWidth) / 2;
            int sloganY = titleY + 80;

            g2d.setColor(new Color(255, 255, 255, 200));
            g2d.drawString(slogan, sloganX, sloganY);
        }

        g2d.dispose();

        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "JPG", baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate OG image", e);
        }
    }
}

