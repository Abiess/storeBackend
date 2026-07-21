package storebackend.payment.paypal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import storebackend.enums.PaymentProvider;
import storebackend.enums.PaymentStatus;
import storebackend.payment.*;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class PayPalPaymentGateway implements PaymentGateway {
    
    private final PayPalConfig config;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    private String cachedAccessToken;
    private long tokenExpiryTime = 0;
    
    @Override
    public PaymentProvider provider() {
        return PaymentProvider.PAYPAL;
    }
    
    @Override
    public PaymentCreateResult createPayment(PaymentContext context) {
        try {
            if (!config.isConfigured()) {
                throw new PaymentConfigurationException("PayPal is not configured");
            }
            
            String accessToken = getAccessToken();
            String url = config.getApiBase() + "/v2/checkout/orders";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("PayPal-Request-Id", context.getIdempotencyKey());
            
            Map<String, Object> orderRequest = buildCreateOrderRequest(context);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(orderRequest, headers);
            
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, request, JsonNode.class);
            JsonNode body = response.getBody();
            
            if (body == null) {
                return PaymentCreateResult.builder()
                    .success(false)
                    .errorCode("PAYMENT_PROVIDER_ERROR")
                    .errorMessage("Empty response from PayPal")
                    .build();
            }
            
            String orderId = body.get("id").asText();
            String approvalUrl = extractApprovalUrl(body);
            
            log.info("PayPal Order created: {} for store {} order {}", orderId, context.getStoreId(), context.getOrderId());
            
            return PaymentCreateResult.builder()
                .success(true)
                .providerOrderId(orderId)
                .approvalUrl(approvalUrl)
                .build();
                
        } catch (HttpClientErrorException e) {
            log.error("PayPal Create Order failed: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            return mapErrorResponse("CREATE", e);
        } catch (Exception e) {
            log.error("PayPal Create Order exception", e);
            return PaymentCreateResult.builder()
                .success(false)
                .errorCode("PAYMENT_PROVIDER_UNAVAILABLE")
                .errorMessage("PayPal service unavailable")
                .build();
        }
    }
    
    @Override
    public PaymentCaptureResult capturePayment(PaymentCaptureCommand command) {
        try {
            if (!config.isConfigured()) {
                throw new PaymentConfigurationException("PayPal is not configured");
            }
            
            String accessToken = getAccessToken();
            String url = config.getApiBase() + "/v2/checkout/orders/" + command.getProviderOrderId() + "/capture";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("PayPal-Request-Id", command.getIdempotencyKey());
            
            HttpEntity<String> request = new HttpEntity<>("{}", headers);
            
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, request, JsonNode.class);
            JsonNode body = response.getBody();
            
            if (body == null) {
                return PaymentCaptureResult.builder()
                    .success(false)
                    .status(PaymentStatus.FAILED)
                    .errorCode("PAYMENT_PROVIDER_ERROR")
                    .errorMessage("Empty response from PayPal")
                    .build();
            }
            
            return parseCaptureResponse(body);
            
        } catch (HttpClientErrorException e) {
            log.error("PayPal Capture failed: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            return mapCaptureErrorResponse(e);
        } catch (Exception e) {
            log.error("PayPal Capture exception", e);
            return PaymentCaptureResult.builder()
                .success(false)
                .status(PaymentStatus.FAILED)
                .errorCode("PAYMENT_PROVIDER_UNAVAILABLE")
                .errorMessage("PayPal service unavailable")
                .build();
        }
    }
    
    @Override
    public PaymentStatusResult getStatus(String providerOrderId) {
        try {
            if (!config.isConfigured()) {
                throw new PaymentConfigurationException("PayPal is not configured");
            }
            
            String accessToken = getAccessToken();
            String url = config.getApiBase() + "/v2/checkout/orders/" + providerOrderId;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            
            HttpEntity<String> request = new HttpEntity<>(headers);
            ResponseEntity<JsonNode> response = restTemplate.exchange(url, HttpMethod.GET, request, JsonNode.class);
            JsonNode body = response.getBody();
            
            if (body == null) {
                return PaymentStatusResult.builder()
                    .success(false)
                    .errorCode("PAYMENT_PROVIDER_ERROR")
                    .errorMessage("Empty response from PayPal")
                    .build();
            }
            
            String status = body.get("status").asText();
            PaymentStatus paymentStatus = mapPayPalStatus(status);
            
            return PaymentStatusResult.builder()
                .success(true)
                .status(paymentStatus)
                .providerOrderId(providerOrderId)
                .build();
                
        } catch (Exception e) {
            log.error("PayPal Get Status failed", e);
            return PaymentStatusResult.builder()
                .success(false)
                .errorCode("PAYMENT_PROVIDER_UNAVAILABLE")
                .errorMessage("PayPal service unavailable")
                .build();
        }
    }
    
    private String getAccessToken() {
        if (cachedAccessToken != null && System.currentTimeMillis() < tokenExpiryTime) {
            return cachedAccessToken;
        }
        
        try {
            String url = config.getApiBase() + "/v1/oauth2/token";
            String auth = config.getClientId() + ":" + config.getClientSecret();
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Basic " + encodedAuth);
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            
            HttpEntity<String> request = new HttpEntity<>("grant_type=client_credentials", headers);
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, request, JsonNode.class);
            JsonNode body = response.getBody();
            
            if (body != null) {
                cachedAccessToken = body.get("access_token").asText();
                int expiresIn = body.get("expires_in").asInt();
                tokenExpiryTime = System.currentTimeMillis() + ((expiresIn - 60) * 1000L);
                return cachedAccessToken;
            }
            
            throw new RuntimeException("Failed to obtain PayPal access token");
        } catch (Exception e) {
            log.error("PayPal OAuth failed", e);
            throw new RuntimeException("PayPal authentication failed", e);
        }
    }
    
    private Map<String, Object> buildCreateOrderRequest(PaymentContext context) {
        Map<String, Object> request = new HashMap<>();
        request.put("intent", "CAPTURE");
        
        // ═══════════════════════════════════════════════════════════════════════════
        // SANDBOX-BUYER-EMAIL: Pre-Fill im PayPal-Checkout (NUR im Sandbox-Modus)
        // ═══════════════════════════════════════════════════════════════════════════
        // WICHTIG: Niemals Passwörter, Kartendaten oder sonstige Zugangsdaten!
        // Nur die E-Mail zum Vorbefüllen des Login-Fensters
        if (config.isSandbox() && config.getSandboxBuyerEmail() != null && !config.getSandboxBuyerEmail().isBlank()) {
            Map<String, Object> paymentSource = new HashMap<>();
            Map<String, Object> paypalSource = new HashMap<>();
            
            // E-Mail des Sandbox-Buyer-Kontos
            paypalSource.put("email_address", config.getSandboxBuyerEmail());
            
            // Experience Context für sofortige Zahlung
            Map<String, Object> experienceContext = new HashMap<>();
            experienceContext.put("user_action", "PAY_NOW");
            paypalSource.put("experience_context", experienceContext);
            
            paymentSource.put("paypal", paypalSource);
            request.put("payment_source", paymentSource);
            
            log.debug("[SANDBOX] PayPal Create Order with pre-filled buyer email (password NOT included)");
        } else if (!config.isSandbox()) {
            log.debug("[LIVE] PayPal Create Order without pre-filled email (production mode)");
        }
        
        Map<String, Object> purchaseUnit = new HashMap<>();
        
        Map<String, Object> amount = new HashMap<>();
        amount.put("currency_code", context.getCurrencyCode());
        amount.put("value", context.getAmount().toString());
        purchaseUnit.put("amount", amount);
        
        if (context.getOrderDescription() != null) {
            purchaseUnit.put("description", context.getOrderDescription());
        }
        
        purchaseUnit.put("reference_id", "ORDER_" + context.getOrderId());
        request.put("purchase_units", List.of(purchaseUnit));
        
        Map<String, Object> appContext = new HashMap<>();
        appContext.put("return_url", context.getReturnUrl());
        appContext.put("cancel_url", context.getCancelUrl());
        request.put("application_context", appContext);
        
        return request;
    }
    
    private String extractApprovalUrl(JsonNode orderResponse) {
        JsonNode links = orderResponse.get("links");
        if (links != null && links.isArray()) {
            for (JsonNode link : links) {
                if ("approve".equals(link.get("rel").asText())) {
                    return link.get("href").asText();
                }
            }
        }
        return null;
    }
    
    private PaymentCaptureResult parseCaptureResponse(JsonNode response) {
        String status = response.get("status").asText();
        
        JsonNode purchaseUnits = response.get("purchase_units");
        if (purchaseUnits != null && purchaseUnits.isArray() && purchaseUnits.size() > 0) {
            JsonNode firstUnit = purchaseUnits.get(0);
            JsonNode captures = firstUnit.get("payments").get("captures");
            
            if (captures != null && captures.isArray() && captures.size() > 0) {
                JsonNode capture = captures.get(0);
                String captureId = capture.get("id").asText();
                String captureStatus = capture.get("status").asText();
                
                JsonNode amountNode = capture.get("amount");
                BigDecimal amount = new BigDecimal(amountNode.get("value").asText());
                String currency = amountNode.get("currency_code").asText();
                
                PaymentStatus paymentStatus = mapCaptureStatus(captureStatus);
                
                return PaymentCaptureResult.builder()
                    .success("COMPLETED".equals(captureStatus))
                    .providerCaptureId(captureId)
                    .status(paymentStatus)
                    .capturedAmount(amount)
                    .currencyCode(currency)
                    .build();
            }
        }
        
        return PaymentCaptureResult.builder()
            .success(false)
            .status(PaymentStatus.FAILED)
            .errorCode("PAYMENT_CAPTURE_FAILED")
            .errorMessage("Capture failed: " + status)
            .build();
    }
    
    private PaymentStatus mapPayPalStatus(String paypalStatus) {
        return switch (paypalStatus) {
            case "CREATED" -> PaymentStatus.CREATED;
            case "SAVED", "APPROVED" -> PaymentStatus.APPROVED;
            case "VOIDED" -> PaymentStatus.CANCELLED;
            case "COMPLETED" -> PaymentStatus.PAID;
            default -> PaymentStatus.PENDING_APPROVAL;
        };
    }
    
    private PaymentStatus mapCaptureStatus(String captureStatus) {
        return switch (captureStatus) {
            case "COMPLETED" -> PaymentStatus.PAID;
            case "PENDING" -> PaymentStatus.PENDING;
            case "DECLINED", "FAILED" -> PaymentStatus.FAILED;
            case "REFUNDED" -> PaymentStatus.REFUNDED;
            case "PARTIALLY_REFUNDED" -> PaymentStatus.PARTIALLY_REFUNDED;
            default -> PaymentStatus.FAILED;
        };
    }
    
    private PaymentCreateResult mapErrorResponse(String operation, HttpClientErrorException e) {
        String errorCode = "PAYMENT_PROVIDER_ERROR";
        String errorMessage = "PayPal error";
        
        try {
            JsonNode error = objectMapper.readTree(e.getResponseBodyAsString());
            if (error.has("name")) {
                String name = error.get("name").asText();
                errorCode = switch (name) {
                    case "INVALID_REQUEST" -> "PAYMENT_INVALID_REQUEST";
                    case "AUTHENTICATION_FAILURE" -> "PAYMENT_AUTH_FAILED";
                    case "INSUFFICIENT_FUNDS" -> "PAYMENT_INSUFFICIENT_FUNDS";
                    default -> "PAYMENT_PROVIDER_ERROR";
                };
            }
            if (error.has("message")) {
                errorMessage = error.get("message").asText();
            }
        } catch (Exception ignored) {}
        
        return PaymentCreateResult.builder()
            .success(false)
            .errorCode(errorCode)
            .errorMessage(errorMessage)
            .build();
    }
    
    private PaymentCaptureResult mapCaptureErrorResponse(HttpClientErrorException e) {
        String errorCode = "PAYMENT_CAPTURE_FAILED";
        String errorMessage = "Capture failed";
        
        try {
            JsonNode error = objectMapper.readTree(e.getResponseBodyAsString());
            if (error.has("name")) {
                String name = error.get("name").asText();
                errorCode = switch (name) {
                    case "ORDER_ALREADY_CAPTURED" -> "PAYMENT_ALREADY_CAPTURED";
                    case "ORDER_NOT_APPROVED" -> "PAYMENT_NOT_APPROVED";
                    default -> "PAYMENT_CAPTURE_FAILED";
                };
            }
            if (error.has("message")) {
                errorMessage = error.get("message").asText();
            }
        } catch (Exception ignored) {}
        
        return PaymentCaptureResult.builder()
            .success(false)
            .status(PaymentStatus.FAILED)
            .errorCode(errorCode)
            .errorMessage(errorMessage)
            .build();
    }
}
