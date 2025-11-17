package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.seo.RedirectResolveResponse;
import storebackend.service.PublicStoreService;
import storebackend.service.seo.RedirectService;
import storebackend.service.seo.SitemapService;

/**
 * Public endpoints for redirects, sitemaps, and robots.txt.
 * No authentication required - host-based resolution.
 */
@RestController
@RequestMapping("/public")
@RequiredArgsConstructor
public class PublicSeoController {

    private final RedirectService redirectService;
    private final SitemapService sitemapService;
    private final PublicStoreService publicStoreService;

    /**
     * GET /public/redirect/resolve?host=myshop.markt.ma&path=/old-product
     * Resolve redirect for given host and path.
     * Returns 404 if no redirect found.
     */
    @GetMapping("/redirect/resolve")
    public ResponseEntity<RedirectResolveResponse> resolveRedirect(
            @RequestParam String host,
            @RequestParam String path) {

        // Resolve store from host (existing method)
        var storeConfig = publicStoreService.resolveStoreByHost(host);
        if (storeConfig == null) {
            return ResponseEntity.notFound().build();
        }

        RedirectResolveResponse response = redirectService.resolve(
            storeConfig.getStoreId(),
            storeConfig.getDomainId(),
            path
        );

        if (response.isFound()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * GET /public/robots.txt
     * Generate robots.txt based on host and SEO settings.
     */
    @GetMapping(value = "/robots.txt", produces = "text/plain")
    public ResponseEntity<String> robotsTxt(@RequestHeader("Host") String host) {
        var storeConfig = publicStoreService.resolveStoreByHost(host);
        if (storeConfig == null) {
            return ResponseEntity.notFound().build();
        }

        String sitemapUrl = "https://" + host + "/public/sitemap.xml";
        String robotsTxt = sitemapService.generateRobotsTxt(
            storeConfig.getStoreId(),
            storeConfig.getDomainId(),
            sitemapUrl
        );

        return ResponseEntity.ok()
                .header("Cache-Control", "public, max-age=600")
                .body(robotsTxt);
    }

    /**
     * GET /public/sitemap.xml
     * Generate sitemap index.
     */
    @GetMapping(value = "/sitemap.xml", produces = "application/xml")
    public ResponseEntity<String> sitemapIndex(@RequestHeader("Host") String host) {
        var storeConfig = publicStoreService.resolveStoreByHost(host);
        if (storeConfig == null) {
            return ResponseEntity.notFound().build();
        }

        String baseUrl = "https://" + host + "/public";
        String sitemap = sitemapService.generateSitemapIndex(
            storeConfig.getStoreId(),
            storeConfig.getDomainId(),
            baseUrl
        );

        return ResponseEntity.ok()
                .header("Cache-Control", "public, max-age=600")
                .body(sitemap);
    }

    /**
     * GET /public/sitemap-products.xml?page=1
     * Generate product sitemap page.
     */
    @GetMapping(value = "/sitemap-products.xml", produces = "application/xml")
    public ResponseEntity<String> productSitemap(
            @RequestHeader("Host") String host,
            @RequestParam(defaultValue = "1") int page) {

        var storeConfig = publicStoreService.resolveStoreByHost(host);
        if (storeConfig == null) {
            return ResponseEntity.notFound().build();
        }

        String canonicalBase = "https://" + host;
        String sitemap = sitemapService.generateProductSitemap(
            storeConfig.getStoreId(),
            page,
            canonicalBase
        );

        return ResponseEntity.ok()
                .header("Cache-Control", "public, max-age=600")
                .body(sitemap);
    }
}
