package storebackend.service;

import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.http.Method;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import storebackend.dto.BrandAssetsResponse;
import storebackend.dto.BrandGenerateRequest;
import storebackend.dto.BrandGenerateResponse;

import java.io.ByteArrayInputStream;
import java.util.*;
import java.util.LinkedHashMap;
import java.util.concurrent.TimeUnit;

@Service
public class BrandKitService {

    @Autowired(required = false)
    private MinioClient minioClient;

    @Autowired
    private PaletteService paletteService;

    @Autowired
    private LogoService logoService;

    @Autowired
    private HeroService heroService;

    @Autowired
    private IconService iconService;

    @Autowired
    private OgService ogService;

    @Value("${minio.bucket-name:store-assets}")
    private String bucketName;

    public BrandGenerateResponse generateBrandKit(Long storeId, BrandGenerateRequest request) {
        String seed = request.getShopName() + (request.getSalt() != null ? request.getSalt() : "");
        String initials = logoService.extractInitials(request.getShopName());

        // Generate palette
        Map<String, String> palette = paletteService.generatePalette(
            seed,
            request.getPreferredColors(),
            request.getForbiddenColors()
        );

        // Generate logo SVG
        String logoSvg = logoService.generateLogoSvg(initials, request.getStyle(), palette);
        byte[] logoPng = generateSimpleLogoPng(initials, palette);

        // Generate hero banner
        byte[] heroBanner = heroService.generateHeroBanner(request.getStyle(), palette, request.getShopName());

        // Generate OG image
        byte[] ogImage = ogService.generateOgImage(request.getShopName(), request.getSlogan(), palette);

        // Generate favicons
        Map<Integer, byte[]> favicons = new HashMap<>();
        favicons.put(16, iconService.generateIcon(logoPng, 16));
        favicons.put(32, iconService.generateIcon(logoPng, 32));
        favicons.put(180, iconService.generateIcon(logoPng, 180));
        favicons.put(192, iconService.generateIcon(logoPng, 192));
        favicons.put(512, iconService.generateIcon(logoPng, 512));

        // Upload to MinIO
        Map<String, String> assetUrls = new HashMap<>();

        try {
            // Logo
            assetUrls.put("logo-svg", uploadToMinio(storeId, "brand/logo/primary.svg", logoSvg.getBytes(), "image/svg+xml"));
            assetUrls.put("logo-png", uploadToMinio(storeId, "brand/logo/primary.png", logoPng, "image/png"));
            assetUrls.put("logo-icon-png", uploadToMinio(storeId, "brand/logo/icon.png", logoPng, "image/png"));

            // Hero
            assetUrls.put("hero-1920x1080", uploadToMinio(storeId, "brand/hero/hero-1920x1080.jpg", heroBanner, "image/jpeg"));

            // Favicons
            for (Map.Entry<Integer, byte[]> entry : favicons.entrySet()) {
                int size = entry.getKey();
                assetUrls.put("favicon-" + size, uploadToMinio(storeId, "brand/favicon/icon-" + size + ".png", entry.getValue(), "image/png"));
            }

            // OG image
            assetUrls.put("og-1200x630", uploadToMinio(storeId, "brand/og/og-1200x630.jpg", ogImage, "image/jpeg"));

            // Palette JSON
            String paletteJson = convertPaletteToJson(palette);
            assetUrls.put("palette-json", uploadToMinio(storeId, "brand/palette.json", paletteJson.getBytes(), "application/json"));

        } catch (Exception e) {
            throw new RuntimeException("Failed to upload brand assets", e);
        }

        return BrandGenerateResponse.builder()
            .assets(assetUrls)
            .paletteTokens(palette)
            .initials(initials)
            .build();
    }

    private String uploadToMinio(Long storeId, String objectPath, byte[] data, String contentType) throws Exception {
        String fullPath = "store-" + storeId + "/" + objectPath;

        minioClient.putObject(
            PutObjectArgs.builder()
                .bucket(bucketName)
                .object(fullPath)
                .stream(new ByteArrayInputStream(data), data.length, -1)
                .contentType(contentType)
                .build()
        );

        // Generate presigned URL (7 days)
        return minioClient.getPresignedObjectUrl(
            GetPresignedObjectUrlArgs.builder()
                .bucket(bucketName)
                .object(fullPath)
                .method(Method.GET)
                .expiry(7, TimeUnit.DAYS)
                .build()
        );
    }

    /**
     * Gibt gespeicherte Brand-Assets zurück (presigned URLs aus MinIO).
     * Bekannte Pfade werden versucht abzurufen; fehlende werden übersprungen.
     */
    public BrandAssetsResponse getAssets(Long storeId) {
        Map<String, String> assetUrls = new HashMap<>();
        Map<String, String> knownPaths = new LinkedHashMap<>();
        knownPaths.put("logo-svg",     "brand/logo/primary.svg");
        knownPaths.put("logo-png",     "brand/logo/primary.png");
        knownPaths.put("hero-1920x1080", "brand/hero/hero-1920x1080.jpg");
        knownPaths.put("og-1200x630",  "brand/og/og-1200x630.jpg");
        knownPaths.put("favicon-32",   "brand/favicon/icon-32.png");
        knownPaths.put("favicon-192",  "brand/favicon/icon-192.png");
        knownPaths.put("palette-json", "brand/palette.json");

        if (minioClient == null) {
            return BrandAssetsResponse.builder()
                    .assets(assetUrls)
                    .paletteTokens(new HashMap<>())
                    .build();
        }

        for (Map.Entry<String, String> entry : knownPaths.entrySet()) {
            try {
                String fullPath = "store-" + storeId + "/" + entry.getValue();
                String url = minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                        .bucket(bucketName)
                        .object(fullPath)
                        .method(Method.GET)
                        .expiry(7, TimeUnit.DAYS)
                        .build()
                );
                assetUrls.put(entry.getKey(), url);
            } catch (Exception ignored) {
                // Asset noch nicht generiert – überspringen
            }
        }

        return BrandAssetsResponse.builder()
                .assets(assetUrls)
                .paletteTokens(new HashMap<>())
                .build();
    }

    /**
     * Speichert eine Farbpalette (CSS-Tokens) als JSON in MinIO.
     */
    public Map<String, String> savePalette(Long storeId, Map<String, String> tokens) {
        if (minioClient == null) {
            return tokens; // MinIO nicht verfügbar – zurückgeben ohne Speichern
        }
        try {
            String paletteJson = convertPaletteToJson(tokens);
            uploadToMinio(storeId, "brand/palette.json", paletteJson.getBytes(), "application/json");
        } catch (Exception e) {
            throw new RuntimeException("Palette konnte nicht gespeichert werden: " + e.getMessage(), e);
        }
        return tokens;
    }

    private String convertPaletteToJson(Map<String, String> palette) {
        StringBuilder json = new StringBuilder("{\n");
        int count = 0;
        for (Map.Entry<String, String> entry : palette.entrySet()) {
            json.append("  \"").append(entry.getKey()).append("\": \"").append(entry.getValue()).append("\"");
            if (++count < palette.size()) {
                json.append(",");
            }
            json.append("\n");
        }
        json.append("}");
        return json.toString();
    }

    private byte[] generateSimpleLogoPng(String initials, Map<String, String> palette) {
        try {
            int size = 512;
            java.awt.image.BufferedImage image = new java.awt.image.BufferedImage(size, size, java.awt.image.BufferedImage.TYPE_INT_ARGB);
            java.awt.Graphics2D g2d = image.createGraphics();
            g2d.setRenderingHint(java.awt.RenderingHints.KEY_ANTIALIASING, java.awt.RenderingHints.VALUE_ANTIALIAS_ON);

            // Transparent background
            g2d.setComposite(java.awt.AlphaComposite.Clear);
            g2d.fillRect(0, 0, size, size);
            g2d.setComposite(java.awt.AlphaComposite.SrcOver);

            // Circle background
            g2d.setColor(java.awt.Color.decode(palette.get("--color-primary")));
            g2d.fillOval(20, 20, size - 40, size - 40);

            // Text
            g2d.setColor(java.awt.Color.WHITE);
            java.awt.Font font = new java.awt.Font("Arial", java.awt.Font.BOLD, 200);
            g2d.setFont(font);
            java.awt.FontMetrics fm = g2d.getFontMetrics();
            int textWidth = fm.stringWidth(initials);
            int x = (size - textWidth) / 2;
            int y = (size - fm.getHeight()) / 2 + fm.getAscent();
            g2d.drawString(initials, x, y);

            g2d.dispose();

            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            javax.imageio.ImageIO.write(image, "PNG", baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate logo PNG", e);
        }
    }
}
