package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * CJ Dropshipping API Integration (Minimal Proof of Concept)
 * Dokumentation: https://developers.cjdropshipping.com/
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CJApiService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${cj.api.base-url:https://developers.cjdropshipping.com/api2.0/v1}")
    private String baseUrl;

    /**
     * CJ Login - Hole Access Token
     * POST /authentication/getAccessToken
     */
    public String authenticate(String email, String password) {
        log.info("Authenticating with CJ API for email: {}", email);

        try {
            String url = baseUrl + "/authentication/getAccessToken";

            Map<String, String> request = new HashMap<>();
            request.put("email", email);
            request.put("password", password);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> body = response.getBody();

                // CJ Response Format: { "code": 200, "result": true, "data": "access_token_here" }
                if (body.get("result") != null && (Boolean) body.get("result")) {
                    String token = (String) body.get("data");
                    log.info("✅ CJ Authentication successful");
                    return token;
                }
            }

            log.error("CJ Authentication failed: {}", response.getBody());
            throw new RuntimeException("CJ Authentication failed");

        } catch (Exception e) {
            log.error("CJ API Error during authentication: {}", e.getMessage());
            throw new RuntimeException("CJ API Error: " + e.getMessage(), e);
        }
    }

    /**
     * CJ Create Order - Bestelle Produkt bei CJ
     * POST /order/createOrder
     */
    public String createOrder(
            String accessToken,
            String cjProductId,
            String cjVariantId,
            int quantity,
            String shippingFirstName,
            String shippingLastName,
            String shippingAddress,
            String shippingCity,
            String shippingPostalCode,
            String shippingCountryCode,
            String shippingPhone
    ) {
        log.info("Creating CJ order for product: {}, variant: {}", cjProductId, cjVariantId);

        try {
            String url = baseUrl + "/order/createOrder";

            // CJ Order Request Format
            Map<String, Object> request = new HashMap<>();
            request.put("productId", cjProductId);
            request.put("variantId", cjVariantId);
            request.put("quantity", quantity);

            // Shipping Info
            Map<String, String> shippingInfo = new HashMap<>();
            shippingInfo.put("firstName", shippingFirstName);
            shippingInfo.put("lastName", shippingLastName);
            shippingInfo.put("address", shippingAddress);
            shippingInfo.put("city", shippingCity);
            shippingInfo.put("zip", shippingPostalCode);
            shippingInfo.put("countryCode", shippingCountryCode);
            shippingInfo.put("phone", shippingPhone);
            request.put("shippingAddress", shippingInfo);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("CJ-Access-Token", accessToken);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> body = response.getBody();

                // CJ Response: { "code": 200, "result": true, "data": { "orderId": "CJ123456" } }
                if (body.get("result") != null && (Boolean) body.get("result")) {
                    Map<String, Object> data = (Map<String, Object>) body.get("data");
                    String orderId = (String) data.get("orderId");
                    log.info("✅ CJ Order created: {}", orderId);
                    return orderId;
                }
            }

            log.error("CJ Order creation failed: {}", response.getBody());
            throw new RuntimeException("CJ Order creation failed");

        } catch (Exception e) {
            log.error("CJ API Error during order creation: {}", e.getMessage());
            throw new RuntimeException("CJ API Error: " + e.getMessage(), e);
        }
    }

    /**
     * Query Order Status (für späteres Tracking-Sync)
     */
    public Map<String, Object> getOrderStatus(String accessToken, String cjOrderId) {
        log.info("Querying CJ order status: {}", cjOrderId);

        try {
            String url = baseUrl + "/order/getOrderInfo?orderId=" + cjOrderId;

            HttpHeaders headers = new HttpHeaders();
            headers.set("CJ-Access-Token", accessToken);

            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK) {
                return response.getBody();
            }

            throw new RuntimeException("Failed to get CJ order status");

        } catch (Exception e) {
            log.error("CJ API Error during status query: {}", e.getMessage());
            throw new RuntimeException("CJ API Error: " + e.getMessage(), e);
        }
    }
}

