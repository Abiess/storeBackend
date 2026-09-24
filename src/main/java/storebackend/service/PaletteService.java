package storebackend.service;

import org.springframework.stereotype.Service;

import java.awt.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.List;

@Service
public class PaletteService {

    private static final float MAX_SATURATION = 0.7f;
    private static final float MAX_BRIGHTNESS = 0.85f;
    private static final Color FALLBACK_PRIMARY = Color.decode("#6366F1"); // Indigo fallback

    public Map<String, String> generatePalette(String seed, List<String> preferredColors, List<String> forbiddenColors) {
        Map<String, String> palette = new LinkedHashMap<>();

        Color primary;
        if (preferredColors != null && !preferredColors.isEmpty()) {
            primary = hexToColor(preferredColors.get(0));
            primary = clampColor(primary); // Clamp user-provided colors
        } else {
            int hash = hashSeed(seed);
            float hue = (hash & 0xFF) / 255f;
            primary = Color.getHSBColor(hue, MAX_SATURATION, MAX_BRIGHTNESS);
        }

        // Check forbidden colors
        if (forbiddenColors != null && !forbiddenColors.isEmpty()) {
            primary = avoidForbiddenColors(primary, forbiddenColors);
        }

        // Validate primary is not neon green unless explicitly requested
        if (isNeonGreen(primary) && !isExplicitlyRequested(preferredColors, primary)) {
            primary = FALLBACK_PRIMARY;
        }

        Color secondary = deriveColor(primary, 30, 0.6f, 0.75f);
        Color accent = deriveColor(primary, -60, Math.min(0.7f, MAX_SATURATION), Math.min(0.8f, MAX_BRIGHTNESS));
        Color background = Color.decode("#FAFAFA");
        Color surface = Color.WHITE;
        Color text = Color.decode("#212121");
        Color textSecondary = Color.decode("#757575");

        // Ensure contrast
        if (getContrastRatio(text, background) < 4.5) {
            text = Color.BLACK;
        }

        palette.put("--color-primary", colorToHex(primary));
        palette.put("--color-secondary", colorToHex(secondary));
        palette.put("--color-accent", colorToHex(accent));
        palette.put("--color-background", colorToHex(background));
        palette.put("--color-surface", colorToHex(surface));
        palette.put("--color-text", colorToHex(text));
        palette.put("--color-text-secondary", colorToHex(textSecondary));

        return palette;
    }

    /**
     * Clamp color saturation and brightness to safe levels (S≤0.7, B≤0.85)
     */
    private Color clampColor(Color color) {
        float[] hsb = Color.RGBtoHSB(color.getRed(), color.getGreen(), color.getBlue(), null);
        float clampedSaturation = Math.min(hsb[1], MAX_SATURATION);
        float clampedBrightness = Math.min(hsb[2], MAX_BRIGHTNESS);
        return Color.getHSBColor(hsb[0], clampedSaturation, clampedBrightness);
    }

    /**
     * Check if color is neon green (#00FF00 or similar)
     */
    private boolean isNeonGreen(Color color) {
        float[] hsb = Color.RGBtoHSB(color.getRed(), color.getGreen(), color.getBlue(), null);
        // Neon green: hue ~120°, high saturation and brightness
        return hsb[0] > 0.25f && hsb[0] < 0.42f && hsb[1] > 0.8f && hsb[2] > 0.8f;
    }

    /**
     * Check if color was explicitly requested by user
     */
    private boolean isExplicitlyRequested(List<String> preferredColors, Color color) {
        if (preferredColors == null || preferredColors.isEmpty()) {
            return false;
        }
        String colorHex = colorToHex(color).toUpperCase();
        return preferredColors.stream()
            .map(String::toUpperCase)
            .anyMatch(pc -> pc.equals(colorHex) || pc.equals("#00FF00"));
    }

    private int hashSeed(String seed) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(seed.getBytes());
            return ((hash[0] & 0xFF) << 24) | ((hash[1] & 0xFF) << 16) |
                   ((hash[2] & 0xFF) << 8) | (hash[3] & 0xFF);
        } catch (Exception e) {
            return seed.hashCode();
        }
    }

    private Color hexToColor(String hex) {
        hex = hex.replace("#", "");
        return new Color(
            Integer.valueOf(hex.substring(0, 2), 16),
            Integer.valueOf(hex.substring(2, 4), 16),
            Integer.valueOf(hex.substring(4, 6), 16)
        );
    }

    private String colorToHex(Color color) {
        return String.format("#%02X%02X%02X", color.getRed(), color.getGreen(), color.getBlue());
    }

    private Color deriveColor(Color base, float hueDelta, float saturation, float brightness) {
        float[] hsb = Color.RGBtoHSB(base.getRed(), base.getGreen(), base.getBlue(), null);
        float newHue = (hsb[0] + hueDelta / 360f) % 1.0f;
        if (newHue < 0) newHue += 1.0f;

        // Clamp derived colors to safe levels
        float clampedSaturation = Math.min(saturation, MAX_SATURATION);
        float clampedBrightness = Math.min(brightness, MAX_BRIGHTNESS);

        return Color.getHSBColor(newHue, clampedSaturation, clampedBrightness);
    }

    private Color avoidForbiddenColors(Color candidate, List<String> forbiddenColors) {
        for (String forbidden : forbiddenColors) {
            Color forbiddenColor = hexToColor(forbidden);
            if (colorDistance(candidate, forbiddenColor) < 50) {
                float[] hsb = Color.RGBtoHSB(candidate.getRed(), candidate.getGreen(), candidate.getBlue(), null);
                float newHue = (hsb[0] + 0.2f) % 1.0f;
                candidate = Color.getHSBColor(newHue, hsb[1], hsb[2]);
            }
        }
        return candidate;
    }

    private double colorDistance(Color c1, Color c2) {
        int rDiff = c1.getRed() - c2.getRed();
        int gDiff = c1.getGreen() - c2.getGreen();
        int bDiff = c1.getBlue() - c2.getBlue();
        return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
    }

    private double getContrastRatio(Color c1, Color c2) {
        double l1 = getRelativeLuminance(c1);
        double l2 = getRelativeLuminance(c2);
        double lighter = Math.max(l1, l2);
        double darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    private double getRelativeLuminance(Color color) {
        double r = color.getRed() / 255.0;
        double g = color.getGreen() / 255.0;
        double b = color.getBlue() / 255.0;

        r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
        g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
        b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
}

