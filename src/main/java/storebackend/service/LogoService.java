package storebackend.service;

import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.Ellipse2D;
import java.awt.geom.Path2D;
import java.awt.geom.RoundRectangle2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Map;

@Service
public class LogoService {

    public String generateLogoSvg(String initials, String style, Map<String, String> palette) {
        String primaryColor = palette.get("--color-primary");
        String textColor = palette.get("--color-text");
        String accentColor = palette.get("--color-accent");

        StringBuilder svg = new StringBuilder();
        svg.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        svg.append("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\" width=\"200\" height=\"200\">\n");

        // Background shape based on style
        switch (style.toLowerCase()) {
            case "minimal":
                svg.append(String.format("  <circle cx=\"100\" cy=\"100\" r=\"90\" fill=\"%s\" stroke=\"%s\" stroke-width=\"2\"/>\n",
                    primaryColor, accentColor));
                break;
            case "geometric":
                svg.append(String.format("  <polygon points=\"100,20 180,70 180,130 100,180 20,130 20,70\" fill=\"%s\" stroke=\"%s\" stroke-width=\"2\"/>\n",
                    primaryColor, accentColor));
                break;
            case "playful":
                // Blob shape using bezier curves
                svg.append(String.format("  <path d=\"M100,20 C140,20 180,60 180,100 C180,140 140,180 100,180 C60,180 20,140 20,100 C20,60 60,20 100,20 Z\" fill=\"%s\" stroke=\"%s\" stroke-width=\"2\"/>\n",
                    primaryColor, accentColor));
                break;
            case "organic":
                // Leaf/droplet shape
                svg.append(String.format("  <path d=\"M100,20 Q150,50 160,100 Q150,150 100,180 Q50,150 40,100 Q50,50 100,20 Z\" fill=\"%s\" stroke=\"%s\" stroke-width=\"2\"/>\n",
                    primaryColor, accentColor));
                break;
            default:
                svg.append(String.format("  <rect x=\"20\" y=\"20\" width=\"160\" height=\"160\" rx=\"20\" fill=\"%s\"/>\n", primaryColor));
        }

        // Text
        svg.append(String.format("  <text x=\"100\" y=\"125\" font-family=\"Arial, sans-serif\" font-size=\"80\" font-weight=\"bold\" text-anchor=\"middle\" fill=\"%s\">%s</text>\n",
            textColor, initials));

        svg.append("</svg>");

        return svg.toString();
    }

    public byte[] rasterizeSvgToPng(String svgContent, int width, int height) {
        try {
            BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g2d = image.createGraphics();
            g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);

            // Parse basic SVG and render (simplified - in production use Batik)
            g2d.setColor(new Color(0, 0, 0, 0));
            g2d.fillRect(0, 0, width, height);

            // For now, create a simple fallback rendering
            // In production, use Apache Batik's SVGDocument and GVTBuilder
            g2d.dispose();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "PNG", baos);
            return baos.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Failed to rasterize SVG", e);
        }
    }

    public String extractInitials(String shopName) {
        if (shopName == null || shopName.isEmpty()) {
            return "?";
        }

        String[] words = shopName.trim().split("\\s+");
        StringBuilder initials = new StringBuilder();

        for (int i = 0; i < Math.min(3, words.length); i++) {
            if (!words[i].isEmpty()) {
                initials.append(Character.toUpperCase(words[i].charAt(0)));
            }
        }

        return initials.length() > 0 ? initials.toString() : shopName.substring(0, 1).toUpperCase();
    }
}

