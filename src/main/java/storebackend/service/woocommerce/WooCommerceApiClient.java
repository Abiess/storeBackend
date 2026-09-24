package storebackend.service.woocommerce;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import storebackend.dto.woocommerce.api.WooCategoryDto;
import storebackend.dto.woocommerce.api.WooProductDto;
import storebackend.dto.woocommerce.api.WooVariationDto;
import storebackend.entity.WooCommerceConfig;

import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * WooCommerce REST API Client.
 * 
 * Authentifizierung: Basic Auth (Consumer Key + Consumer Secret)
 * 
 * SECURITY:
 * - NIEMALS Consumer Secret oder vollständige Auth-URLs loggen
 * - Nur Domain/Host und Endpoint loggen
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WooCommerceApiClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private static final String API_BASE = "/wp-json/wc/v3";
    private static final int MAX_PER_PAGE = 100;

    // ─────────────────────────────────────────────────────────────────────────
    // Public API Methods
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Testet WooCommerce Connection.
     * 
     * @return Map mit System Info (wcVersion, wpVersion, productCount, categoryCount)
     * @throws WooCommerceApiException bei Fehlern
     */
    public Map<String, Object> testConnection(WooCommerceConfig config) {
        String shopUrl = normalizeUrl(config.getShopUrl());
        String endpoint = API_BASE + "/system_status";
        
        log.info("Testing WooCommerce connection: {}{}", getDomainForLog(shopUrl), endpoint);
        
        try {
            ResponseEntity<String> response = get(config, endpoint, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                log.info("✅ WooCommerce connection successful: {}", getDomainForLog(shopUrl));
                
                // Parse System Status
                Map<String, Object> systemStatus = objectMapper.readValue(
                    response.getBody(), 
                    new TypeReference<Map<String, Object>>() {}
                );
                
                // Extrahiere relevante Infos
                Map<String, Object> result = Map.of(
                    "wcVersion", extractVersion(systemStatus, "wc_version"),
                    "wpVersion", extractVersion(systemStatus, "wp_version"),
                    "productCount", getProductCount(config),
                    "categoryCount", getCategoryCount(config)
                );
                
                return result;
            }
            
            throw new WooCommerceApiException("Unexpected response: " + response.getStatusCode());
            
        } catch (Exception e) {
            log.error("❌ WooCommerce connection failed: {} - {}", getDomainForLog(shopUrl), e.getMessage());
            throw handleException(e);
        }
    }

    /**
     * Lädt WooCommerce Produkte (paginiert).
     * 
     * @param page 1-basiert
     * @param perPage max 100
     */
    public List<WooProductDto> getProducts(WooCommerceConfig config, int page, int perPage) {
        String shopUrl = normalizeUrl(config.getShopUrl());
        int limit = Math.min(perPage, MAX_PER_PAGE);
        String endpoint = API_BASE + "/products?page=" + page + "&per_page=" + limit;
        
        log.info("Fetching WooCommerce products: {}{} (page={}, per_page={})", 
            getDomainForLog(shopUrl), API_BASE + "/products", page, limit);
        
        try {
            ResponseEntity<String> response = get(config, endpoint, String.class);
            
            List<WooProductDto> products = objectMapper.readValue(
                response.getBody(),
                new TypeReference<List<WooProductDto>>() {}
            );
            
            log.info("✅ Fetched {} products from {}", products.size(), getDomainForLog(shopUrl));
            return products;
            
        } catch (Exception e) {
            log.error("❌ Failed to fetch products from {}: {}", getDomainForLog(shopUrl), e.getMessage());
            throw handleException(e);
        }
    }

    /**
     * Lädt WooCommerce Kategorien (paginiert).
     */
    public List<WooCategoryDto> getCategories(WooCommerceConfig config, int page, int perPage) {
        String shopUrl = normalizeUrl(config.getShopUrl());
        int limit = Math.min(perPage, MAX_PER_PAGE);
        String endpoint = API_BASE + "/products/categories?page=" + page + "&per_page=" + limit;
        
        log.info("Fetching WooCommerce categories: {}{} (page={}, per_page={})", 
            getDomainForLog(shopUrl), API_BASE + "/products/categories", page, limit);
        
        try {
            ResponseEntity<String> response = get(config, endpoint, String.class);
            
            List<WooCategoryDto> categories = objectMapper.readValue(
                response.getBody(),
                new TypeReference<List<WooCategoryDto>>() {}
            );
            
            log.info("✅ Fetched {} categories from {}", categories.size(), getDomainForLog(shopUrl));
            return categories;
            
        } catch (Exception e) {
            log.error("❌ Failed to fetch categories from {}: {}", getDomainForLog(shopUrl), e.getMessage());
            throw handleException(e);
        }
    }

    /**
     * Lädt Variationen für ein Produkt (paginiert).
     */
    public List<WooVariationDto> getProductVariations(WooCommerceConfig config, Long productId, int page, int perPage) {
        String shopUrl = normalizeUrl(config.getShopUrl());
        int limit = Math.min(perPage, MAX_PER_PAGE);
        String endpoint = API_BASE + "/products/" + productId + "/variations?page=" + page + "&per_page=" + limit;
        
        log.info("Fetching WooCommerce variations: {}{} (page={}, per_page={})", 
            getDomainForLog(shopUrl), API_BASE + "/products/" + productId + "/variations", page, limit);
        
        try {
            ResponseEntity<String> response = get(config, endpoint, String.class);
            
            List<WooVariationDto> variations = objectMapper.readValue(
                response.getBody(),
                new TypeReference<List<WooVariationDto>>() {}
            );
            
            log.info("✅ Fetched {} variations for product {} from {}", 
                variations.size(), productId, getDomainForLog(shopUrl));
            return variations;
            
        } catch (Exception e) {
            log.error("❌ Failed to fetch variations for product {} from {}: {}", 
                productId, getDomainForLog(shopUrl), e.getMessage());
            throw handleException(e);
        }
    }

    /**
     * Lädt WooCommerce Kunden (paginiert).
     * 
     * @param page 1-basiert
     * @param perPage max 100
     * @param role Optional: "customer", "subscriber", etc.
     */
    public List<storebackend.dto.woocommerce.api.WooCustomerDto> getCustomers(WooCommerceConfig config, int page, int perPage, String role) {
        String shopUrl = normalizeUrl(config.getShopUrl());
        int limit = Math.min(perPage, MAX_PER_PAGE);
        String endpoint = API_BASE + "/customers?page=" + page + "&per_page=" + limit;
        
        if (role != null && !role.isEmpty()) {
            endpoint += "&role=" + role;
        }
        
        log.info("Fetching WooCommerce customers: {}{} (page={}, per_page={})", 
            getDomainForLog(shopUrl), API_BASE + "/customers", page, limit);
        
        try {
            ResponseEntity<String> response = get(config, endpoint, String.class);
            
            // DEBUG: Log raw JSON (first 500 chars)
            String rawJson = response.getBody();
            if (rawJson != null && rawJson.length() > 0) {
                String preview = rawJson.length() > 500 ? rawJson.substring(0, 500) + "..." : rawJson;
                log.debug("🔍 Raw WooCommerce customers JSON: {}", preview);
            }
            
            List<storebackend.dto.woocommerce.api.WooCustomerDto> customers = objectMapper.readValue(
                response.getBody(),
                new TypeReference<List<storebackend.dto.woocommerce.api.WooCustomerDto>>() {}
            );
            
            log.info("✅ Fetched {} customers from {} (page {})", 
                customers.size(), getDomainForLog(shopUrl), page);
            return customers;
            
        } catch (Exception e) {
            log.error("❌ Failed to fetch customers from {}: {}", getDomainForLog(shopUrl), e.getMessage());
            throw handleException(e);
        }
    }
    
    /**
     * Lädt ALLE WooCommerce Kunden (alle Seiten).
     * 
     * SECURITY: Abbruch bei MAX_PAGES (Schutz vor Endlosschleife).
     * 
     * @param role Optional: Filter by role
     * @return All customers (across all pages)
     */
    public List<storebackend.dto.woocommerce.api.WooCustomerDto> getAllCustomers(WooCommerceConfig config, String role) {
        List<storebackend.dto.woocommerce.api.WooCustomerDto> allCustomers = new ArrayList<>();
        int page = 1;
        int maxPages = 100; // SECURITY: Prevent infinite loops
        
        log.info("Fetching ALL WooCommerce customers (paginated)...");
        
        while (page <= maxPages) {
            List<storebackend.dto.woocommerce.api.WooCustomerDto> pageCustomers = 
                getCustomers(config, page, MAX_PER_PAGE, role);
            
            if (pageCustomers.isEmpty()) {
                log.info("✅ Reached end of customers at page {}", page);
                break;
            }
            
            allCustomers.addAll(pageCustomers);
            
            // If less than per_page results, it's the last page
            if (pageCustomers.size() < MAX_PER_PAGE) {
                log.info("✅ Last page {} contained {} customers (< {})", 
                    page, pageCustomers.size(), MAX_PER_PAGE);
                break;
            }
            
            page++;
        }
        
        if (page > maxPages) {
            log.warn("⚠️ Reached MAX_PAGES limit ({}). Some customers may not be loaded.", maxPages);
        }
        
        log.info("✅ Loaded total {} customers across {} pages", allCustomers.size(), page);
        return allCustomers;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper Methods
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET Request mit Basic Auth.
     * SECURITY: URL mit Credentials NIEMALS loggen!
     */
    private <T> ResponseEntity<T> get(WooCommerceConfig config, String endpoint, Class<T> responseType) {
        String shopUrl = normalizeUrl(config.getShopUrl());
        String url = shopUrl + endpoint;
        
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", createBasicAuthHeader(config.getConsumerKey(), config.getConsumerSecret()));
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        
        return restTemplate.exchange(url, HttpMethod.GET, entity, responseType);
    }

    /**
     * Erzeugt Basic Auth Header (Base64).
     * SECURITY: Header NIEMALS loggen!
     */
    private String createBasicAuthHeader(String consumerKey, String consumerSecret) {
        String credentials = consumerKey + ":" + consumerSecret;
        String encoded = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
        return "Basic " + encoded;
    }

    /**
     * Normalisiert Shop URL:
     * - Entfernt trailing slash
     * - Ergänzt https:// wenn fehlt
     * - Validiert URL-Format
     */
    private String normalizeUrl(String shopUrl) {
        if (shopUrl == null || shopUrl.trim().isEmpty()) {
            throw new WooCommerceApiException("Shop URL is empty");
        }
        
        String url = shopUrl.trim();
        
        // Entferne trailing slash
        if (url.endsWith("/")) {
            url = url.substring(0, url.length() - 1);
        }
        
        // Ergänze https:// wenn fehlt
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        
        // Validiere URL-Format
        try {
            new URI(url);
        } catch (URISyntaxException e) {
            throw new WooCommerceApiException("Invalid shop URL format: " + shopUrl);
        }
        
        return url;
    }

    /**
     * Extrahiert Domain für Logging (ohne Credentials).
     */
    private String getDomainForLog(String shopUrl) {
        try {
            URI uri = new URI(shopUrl);
            return uri.getHost();
        } catch (URISyntaxException e) {
            return shopUrl; // Fallback
        }
    }

    /**
     * Extrahiert Version aus System Status.
     */
    private String extractVersion(Map<String, Object> systemStatus, String key) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> environment = (Map<String, Object>) systemStatus.get("environment");
            if (environment != null && environment.containsKey(key)) {
                return environment.get(key).toString();
            }
        } catch (Exception e) {
            log.warn("Failed to extract {} from system status", key);
        }
        return "unknown";
    }

    /**
     * Zählt Produkte (via X-WP-Total Header).
     */
    private Integer getProductCount(WooCommerceConfig config) {
        try {
            String endpoint = API_BASE + "/products?per_page=1";
            ResponseEntity<String> response = get(config, endpoint, String.class);
            String total = response.getHeaders().getFirst("X-WP-Total");
            return total != null ? Integer.parseInt(total) : 0;
        } catch (Exception e) {
            log.warn("Failed to get product count: {}", e.getMessage());
            return 0;
        }
    }

    /**
     * Zählt Kategorien (via X-WP-Total Header).
     */
    private Integer getCategoryCount(WooCommerceConfig config) {
        try {
            String endpoint = API_BASE + "/products/categories?per_page=1";
            ResponseEntity<String> response = get(config, endpoint, String.class);
            String total = response.getHeaders().getFirst("X-WP-Total");
            return total != null ? Integer.parseInt(total) : 0;
        } catch (Exception e) {
            log.warn("Failed to get category count: {}", e.getMessage());
            return 0;
        }
    }

    /**
     * Wandelt Exceptions in WooCommerceApiException um.
     */
    private WooCommerceApiException handleException(Exception e) {
        if (e instanceof WooCommerceApiException) {
            return (WooCommerceApiException) e;
        }
        
        if (e instanceof HttpClientErrorException) {
            HttpClientErrorException httpEx = (HttpClientErrorException) e;
            
            if (httpEx.getStatusCode() == HttpStatus.UNAUTHORIZED || httpEx.getStatusCode() == HttpStatus.FORBIDDEN) {
                return new WooCommerceApiException("Invalid WooCommerce API credentials (401/403)");
            }
            
            if (httpEx.getStatusCode() == HttpStatus.NOT_FOUND) {
                return new WooCommerceApiException("WooCommerce REST API not found (404). Check shop URL.");
            }
            
            if (httpEx.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                return new WooCommerceApiException("Rate limit exceeded (429). Please retry later.");
            }
            
            return new WooCommerceApiException("WooCommerce API error: " + httpEx.getStatusCode());
        }
        
        if (e instanceof HttpServerErrorException) {
            return new WooCommerceApiException("WooCommerce shop error (5xx). Server may be down.");
        }
        
        if (e instanceof ResourceAccessException) {
            return new WooCommerceApiException("Connection timeout. Check shop URL and network.");
        }
        
        return new WooCommerceApiException("Unexpected error: " + e.getMessage(), e);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Custom Exception
    // ─────────────────────────────────────────────────────────────────────────

    public static class WooCommerceApiException extends RuntimeException {
        public WooCommerceApiException(String message) {
            super(message);
        }
        
        public WooCommerceApiException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
