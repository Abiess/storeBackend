package storebackend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import storebackend.config.DhlProperties;
import storebackend.dto.dhl.DhlShipmentResponse;
import storebackend.entity.Order;
import storebackend.entity.User;
import storebackend.repository.OrderRepository;
import storebackend.service.dhl.DhlAuthClient;
import storebackend.service.dhl.DhlLabelService;
import storebackend.service.dhl.DhlOrderUpdateService;
import storebackend.service.dhl.DhlShippingClient;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * DHL Admin Controller
 * Endpoints für DHL Label-Erstellung und Health Checks
 * 
 * Health/Config: /api/admin/dhl/*
 * Order-specific: /api/admin/orders/{orderId}/dhl/*
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class DhlAdminController {
    
    private final DhlProperties dhlProperties;
    private final DhlAuthClient dhlAuthClient;
    private final DhlShippingClient dhlShippingClient;
    private final DhlLabelService dhlLabelService;
    private final OrderRepository orderRepository;
    private final DhlOrderUpdateService dhlOrderUpdateService;
    
    /**
     * Connection Test: Nur DHL Auth + API-Erreichbarkeit prüfen
     * POST /api/admin/dhl/test-connection
     * 
     * Erzeugt KEIN Label, verursacht KEINE Kosten.
     * Prüft nur: Config valid, Token abrufbar, Shipping API erreichbar.
     * 
     * Zugriff: Authentifizierte User
     */
    @PostMapping("/api/admin/dhl/test-connection")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> testConnection() {
        Map<String, Object> response = new LinkedHashMap<>();
        
        try {
            if (!dhlProperties.isEnabled()) {
                response.put("success", false);
                response.put("error", "DHL_DISABLED");
                response.put("messageKey", "shipping.dhl.disabled");
                response.put("message", "DHL integration is disabled. Set DHL_ENABLED=true to activate.");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 1. Validate Config
            try {
                dhlProperties.validate();
                response.put("configValid", true);
            } catch (IllegalStateException e) {
                response.put("success", false);
                response.put("configValid", false);
                response.put("error", "CONFIG_ERROR");
                response.put("messageKey", "shipping.dhl.configError");
                response.put("message", e.getMessage());
                return ResponseEntity.badRequest().body(response);
            }
            
            // 2. Test Auth (Token abrufen)
            try {
                String token = dhlAuthClient.getAccessToken();
                response.put("authSuccess", true);
                response.put("tokenReceived", token != null && !token.isEmpty());
                log.info("✅ DHL Auth successful (token length: {})", token != null ? token.length() : 0);
            } catch (Exception e) {
                response.put("success", false);
                response.put("authSuccess", false);
                response.put("error", "AUTH_FAILED");
                response.put("messageKey", "shipping.dhl.authFailed");
                response.put("message", "DHL authentication failed: " + e.getMessage());
                return ResponseEntity.status(500).body(response);
            }
            
            // 3. Test Shipping API (Health Check)
            try {
                JsonNode apiInfo = dhlShippingClient.healthCheck();
                response.put("apiReachable", true);
                response.put("apiVersion", apiInfo != null && apiInfo.has("version") ? apiInfo.get("version").asText() : "unknown");
                log.info("✅ DHL Shipping API reachable");
            } catch (Exception e) {
                response.put("success", false);
                response.put("apiReachable", false);
                response.put("error", "API_UNREACHABLE");
                response.put("messageKey", "shipping.dhl.apiUnreachable");
                response.put("message", "DHL Shipping API unreachable: " + e.getMessage());
                return ResponseEntity.status(500).body(response);
            }
            
            // All OK!
            response.put("success", true);
            response.put("messageKey", "shipping.dhl.connectionSuccess");
            response.put("message", "DHL connection test successful ✅ (no label created, no costs)");
            response.put("environment", dhlProperties.getEnv());
            
            log.info("✅ DHL Connection Test successful (env: {})", dhlProperties.getEnv());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ DHL Connection Test failed", e);
            response.put("success", false);
            response.put("error", "TEST_FAILED");
            response.put("messageKey", "shipping.dhl.testFailed");
            response.put("message", "Connection test failed: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    /**
     * Health Check: DHL Config + Auth + Shipping API
     * GET /api/admin/dhl/health
     * 
     * Zugriff: Alle authentifizierten User (Store Owner können DHL Status prüfen)
     */
    @GetMapping("/api/admin/dhl/health")
    @PreAuthorize("isAuthenticated()")  // Jeder eingeloggte User
    public ResponseEntity<?> healthCheck() {
        Map<String, Object> response = new LinkedHashMap<>();
        
        try {
            // 1. Check Config
            response.put("enabled", dhlProperties.isEnabled());
            response.put("env", dhlProperties.getEnv());
            response.put("authUrl", dhlProperties.getAuthUrl());
            response.put("shippingBaseUrl", dhlProperties.getShippingBaseUrl());
            
            if (!dhlProperties.isEnabled()) {
                response.put("status", "DISABLED");
                response.put("message", "DHL integration is disabled. Set DHL_ENABLED=true to activate.");
                return ResponseEntity.ok(response);
            }
            
            // 2. Validate Config
            try {
                dhlProperties.validate();
                response.put("configValid", true);
            } catch (IllegalStateException e) {
                response.put("configValid", false);
                response.put("configError", e.getMessage());
                response.put("status", "CONFIG_ERROR");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 3. Test Auth
            try {
                String token = dhlAuthClient.getAccessToken();
                response.put("authStatus", "OK");
                response.put("tokenLength", token != null ? token.length() : 0);
            } catch (Exception e) {
                response.put("authStatus", "FAILED");
                response.put("authError", e.getMessage());
                response.put("status", "AUTH_ERROR");
                return ResponseEntity.status(500).body(response);
            }
            
            // 4. Test Shipping API
            try {
                JsonNode apiInfo = dhlShippingClient.healthCheck();
                response.put("shippingApiStatus", "OK");
                response.put("apiInfo", apiInfo);
            } catch (Exception e) {
                response.put("shippingApiStatus", "FAILED");
                response.put("shippingApiError", e.getMessage());
                response.put("status", "API_ERROR");
                return ResponseEntity.status(500).body(response);
            }
            
            // All OK!
            response.put("status", "HEALTHY");
            response.put("message", "DHL integration is working correctly ✅");
            
            log.info("✅ DHL Health Check successful");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ DHL Health Check failed", e);
            response.put("status", "ERROR");
            response.put("error", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    /**
     * Get DHL Config (ohne Secrets)
     * GET /api/admin/dhl/config
     * 
     * Zugriff: Alle authentifizierten User
     */
    @GetMapping("/api/admin/dhl/config")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getConfig() {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("enabled", dhlProperties.isEnabled());
        config.put("env", dhlProperties.getEnv());
        config.put("authUrl", dhlProperties.getAuthUrl());
        config.put("shippingBaseUrl", dhlProperties.getShippingBaseUrl());
        config.put("defaultProfile", dhlProperties.getDefaultProfile());
        config.put("defaultProduct", dhlProperties.getDefaultProduct());
        config.put("timeout", dhlProperties.getTimeout());
        config.put("clientIdSet", dhlProperties.getClientId() != null && !dhlProperties.getClientId().isBlank());
        config.put("clientSecretSet", dhlProperties.getClientSecret() != null && !dhlProperties.getClientSecret().isBlank());
        
        if (dhlProperties.isSandbox()) {
            config.put("sandboxUsernameSet", dhlProperties.getSandboxUsername() != null);
            config.put("sandboxPasswordSet", dhlProperties.getSandboxPassword() != null);
        }
        
        return ResponseEntity.ok(config);
    }
    
    /**
     * Validate DHL Shipment (ohne Label zu erstellen)
     * POST /api/admin/orders/{orderId}/dhl/validate
     * 
     * Zugriff: Authentifizierte User (Store Owner Check im Service)
     */
    @PostMapping("/api/admin/orders/{orderId}/dhl/validate")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<?> validateShipment(
        @PathVariable Long orderId,
        @AuthenticationPrincipal User currentUser
    ) {
        try {
            if (!dhlProperties.isEnabled()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "DHL integration is disabled",
                    "message", "Set DHL_ENABLED=true to activate"
                ));
            }
            
            // Load Order with Store (innerhalb der Transaction)
            Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalStateException("Order not found: " + orderId));
            
            // Initialisiere lazy-loaded Store
            order.getStore().getId();
            order.getStore().getOwner().getId();
            
            log.info("🔍 Validating DHL shipment for order {} by user {}", 
                orderId, currentUser.getEmail());
            
            DhlShipmentResponse response = dhlLabelService.validateShipment(order, currentUser);
            
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("orderId", orderId);
            result.put("validation", "SUCCESS");
            result.put("shipmentNo", response.getShipmentNo());
            result.put("routingCode", response.getRoutingCode());
            result.put("refNo", response.getShipmentRefNo());
            
            // Validation Messages (Warnings/Errors)
            if (response.getValidationMessages() != null && !response.getValidationMessages().isEmpty()) {
                result.put("validationMessages", response.getValidationMessages());
            }
            
            // Status
            if (response.getStatus() != null) {
                result.put("status", response.getStatus());
            }
            
            log.info("✅ DHL validation successful for order {}", orderId);
            return ResponseEntity.ok(result);
            
        } catch (AccessDeniedException e) {
            log.warn("❌ Access denied: {}", e.getMessage());
            return ResponseEntity.status(403).body(Map.of(
                "error", "ACCESS_DENIED",
                "message", e.getMessage()
            ));
            
        } catch (IllegalStateException e) {
            log.error("❌ Validation failed: {}", e.getMessage());
            
            // Parse messageKey aus Exception Message (falls vorhanden)
            String messageKey = null;
            if (e.getMessage() != null && e.getMessage().contains("messageKey:")) {
                int startIdx = e.getMessage().indexOf("messageKey:") + 11;
                int endIdx = e.getMessage().indexOf("\n", startIdx);
                if (endIdx == -1) endIdx = e.getMessage().indexOf(".", startIdx);
                if (endIdx == -1) endIdx = e.getMessage().length();
                messageKey = e.getMessage().substring(startIdx, endIdx).trim();
            }
            
            Map<String, Object> errorResponse = new LinkedHashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "VALIDATION_ERROR");
            errorResponse.put("message", e.getMessage());
            if (messageKey != null) {
                errorResponse.put("messageKey", messageKey);
            }
            
            return ResponseEntity.badRequest().body(errorResponse);
            
        } catch (HttpClientErrorException e) {
            // DHL API 4xx (Bad Request, ungültige Daten)
            log.error("❌ DHL API Client Error (4xx) for order {}: status={}, body={}", 
                orderId, e.getStatusCode().value(), e.getResponseBodyAsString());
            
            Map<String, Object> errorResponse = new LinkedHashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "DHL_VALIDATION_FAILED");
            errorResponse.put("dhlStatusCode", e.getStatusCode().value());
            
            // Parse DHL Response Body
            try {
                String dhlErrorDetail = parseDhlErrorResponse(e.getResponseBodyAsString());
                errorResponse.put("message", dhlErrorDetail);
            } catch (Exception parseEx) {
                errorResponse.put("message", "DHL Validation Error (Status: " + e.getStatusCode() + ")");
            }
            
            return ResponseEntity.status(400).body(errorResponse);
            
        } catch (HttpServerErrorException e) {
            // DHL API 5xx (Server Error)
            log.error("❌ DHL API Server Error (5xx) for order {}: status={}, body={}", 
                orderId, e.getStatusCode().value(), e.getResponseBodyAsString());
            
            Map<String, Object> errorResponse = new LinkedHashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "DHL_API_UNAVAILABLE");
            errorResponse.put("messageKey", "shipping.dhl.apiUnavailable");
            errorResponse.put("message", "DHL konnte die Sendung gerade nicht verarbeiten. Bitte prüfe die Sendungsdaten oder versuche es später erneut.");
            errorResponse.put("dhlStatus", e.getStatusCode().value());
            
            // Parse DHL error detail if available
            try {
                String dhlDetail = parseDhlErrorResponse(e.getResponseBodyAsString());
                if (dhlDetail != null && !dhlDetail.isBlank()) {
                    errorResponse.put("dhlDetail", dhlDetail);
                }
            } catch (Exception ignored) {
                // Fallback: Raw response body
                String responseBody = e.getResponseBodyAsString();
                if (responseBody != null && !responseBody.isBlank()) {
                    errorResponse.put("dhlDetail", responseBody.length() > 500 ? 
                        responseBody.substring(0, 500) + "..." : responseBody);
                }
            }
            
            return ResponseEntity.status(502).body(errorResponse);
            
        } catch (Exception e) {
            log.error("❌ DHL validation error for order {}", orderId, e);
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "INTERNAL_ERROR",
                "message", e.getMessage() != null ? e.getMessage() : "Interner Fehler bei DHL Validierung"
            ));
        }
    }
    
    /**
     * Parse DHL API Error Response
     * Extrahiert detail/validationMessages aus DHL Response Body
     */
    private String parseDhlErrorResponse(String responseBody) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(responseBody);
            
            // Status Detail
            if (root.has("status") && root.get("status").has("detail")) {
                return root.get("status").get("detail").asText();
            }
            
            // Validation Messages (items array)
            if (root.has("items") && root.get("items").isArray() && root.get("items").size() > 0) {
                JsonNode item = root.get("items").get(0);
                if (item.has("validationMessages") && item.get("validationMessages").isArray()) {
                    JsonNode messages = item.get("validationMessages");
                    StringBuilder sb = new StringBuilder();
                    for (JsonNode msg : messages) {
                        if (msg.has("validationMessage")) {
                            sb.append(msg.get("validationMessage").asText()).append("; ");
                        }
                    }
                    if (sb.length() > 0) {
                        return sb.toString();
                    }
                }
            }
            
            // Fallback: ganzen Body zurückgeben (max 500 Zeichen)
            if (responseBody.length() > 500) {
                return responseBody.substring(0, 500) + "...";
            }
            return responseBody;
            
        } catch (Exception e) {
            log.warn("Could not parse DHL error response", e);
            return responseBody;
        }
    }
    
    /**
     * Create DHL Shipping Label
     * POST /api/admin/orders/{orderId}/dhl/create-label
     * 
     * Erstellt DHL Label, speichert PDF in MinIO und aktualisiert Order
     * IDEMPOTENT: Wenn Label bereits existiert, wird vorhandenes zurückgegeben
     */
    @PostMapping("/api/admin/orders/{orderId}/dhl/create-label")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<?> createLabel(
        @PathVariable Long orderId,
        @AuthenticationPrincipal User currentUser
    ) {
        try {
            if (!dhlProperties.isEnabled()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "DHL integration is disabled",
                    "message", "Set DHL_ENABLED=true to activate"
                ));
            }
            
            // Load Order with Store
            Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalStateException("Order not found: " + orderId));
            
            // Initialisiere lazy-loaded Store
            order.getStore().getId();
            order.getStore().getOwner().getId();
            
            // IDEMPOTENCY CHECK: Label bereits erstellt?
            if (order.getDhlShipmentNo() != null && !order.getDhlShipmentNo().isBlank()) {
                log.info("⚡ DHL label already exists for order {} (shipmentNo: {})", 
                    orderId, order.getDhlShipmentNo());
                
                Map<String, Object> result = new LinkedHashMap<>();
                result.put("orderId", orderId);
                result.put("success", true);
                result.put("status", "ALREADY_EXISTS");
                result.put("shipmentNo", order.getDhlShipmentNo());
                result.put("trackingNumber", order.getTrackingNumber());
                result.put("trackingUrl", order.getTrackingUrl());
                result.put("labelUrl", order.getDhlLabelUrl());
                result.put("messageKey", "orders.dhl.labelAlreadyExists");
                result.put("message", "DHL label already created for this order");
                
                return ResponseEntity.ok(result);
            }
            
            // PICKUP Orders blockieren
            if ("PICKUP".equals(order.getDeliveryType())) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "NOT_AVAILABLE_FOR_PICKUP",
                    "messageKey", "orders.dhl.notAvailableForPickup",
                    "message", "DHL shipping labels are not available for pickup orders"
                ));
            }
            
            log.info("📦 Creating DHL label for order {} by user {}", 
                orderId, currentUser.getEmail());
            
            // 1. DHL Label erstellen
            DhlShipmentResponse response = dhlLabelService.createLabel(order, currentUser);
            
            // 2. PDF zu MinIO + Order aktualisieren
            dhlOrderUpdateService.saveLabelAndUpdateOrder(order, response);
            
            // 3. Response vorbereiten (OHNE Base64!)
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("orderId", orderId);
            result.put("success", true);
            result.put("status", "SUCCESS");
            result.put("shipmentNo", response.getShipmentNo());
            result.put("trackingNumber", order.getTrackingNumber());
            result.put("trackingUrl", order.getTrackingUrl());
            result.put("labelUrl", order.getDhlLabelUrl());
            result.put("routingCode", response.getRoutingCode());
            result.put("messageKey", "orders.dhl.labelCreated");
            
            // Validation Messages (Warnings)
            if (response.getValidationMessages() != null && !response.getValidationMessages().isEmpty()) {
                result.put("validationMessages", response.getValidationMessages());
            }
            
            log.info("✅ DHL label created successfully for order {}", orderId);
            return ResponseEntity.ok(result);
            
        } catch (AccessDeniedException e) {
            log.warn("❌ Access denied: {}", e.getMessage());
            return ResponseEntity.status(403).body(Map.of(
                "error", "ACCESS_DENIED",
                "message", e.getMessage()
            ));
            
        } catch (IllegalStateException e) {
            log.error("❌ Label creation failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "error", "VALIDATION_ERROR",
                "message", e.getMessage()
            ));
            
        } catch (Exception e) {
            log.error("❌ DHL label creation error for order {}", orderId, e);
            return ResponseEntity.status(500).body(Map.of(
                "error", "DHL_API_ERROR",
                "message", e.getMessage()
            ));
        }
    }
}
