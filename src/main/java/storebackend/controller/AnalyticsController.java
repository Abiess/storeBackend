package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.analytics.OrderStatsDTO;
import storebackend.dto.analytics.RevenueSummaryDTO;
import storebackend.dto.analytics.TopProductDTO;
import storebackend.service.StoreAnalyticsService;

import java.time.LocalDate;
import java.util.List;

/**
 * Analytics Controller
 * 
 * Liefert aggregierte Kennzahlen für Store-Owner Dashboard
 * 
 * Security: Nur Store-Owner darf seine Analytics sehen
 * (@storeAccessChecker.isStoreAdmin)
 */
@RestController
@RequestMapping("/api/stores/{storeId}/analytics")
@RequiredArgsConstructor
@Slf4j
public class AnalyticsController {
    
    private final StoreAnalyticsService analyticsService;
    
    /**
     * Umsatz-Zusammenfassung
     * 
     * GET /api/stores/{storeId}/analytics/summary?from=2026-01-01&to=2026-12-31
     * 
     * Query-Parameter (optional):
     * - from: Start-Datum (ISO-8601: YYYY-MM-DD), Default: 1. Januar aktuelles Jahr
     * - to: End-Datum (ISO-8601: YYYY-MM-DD), Default: heute
     * 
     * Response:
     * {
     *   "totalRevenue": 125340.50,
     *   "paidOrderCount": 342,
     *   "averageOrderValue": 366.55,
     *   "currencyCode": "MAD"
     * }
     * 
     * Security: Nur Store-Owner
     */
    @GetMapping("/summary")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<RevenueSummaryDTO> getRevenueSummary(
        @PathVariable Long storeId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        log.info("[ANALYTICS-API] GET /api/stores/{}/analytics/summary?from={}&to={}", 
            storeId, from, to);
        
        RevenueSummaryDTO summary = analyticsService.getRevenueSummary(storeId, from, to);
        
        return ResponseEntity.ok(summary);
    }
    
    /**
     * Top-Produkte nach Umsatz
     * 
     * GET /api/stores/{storeId}/analytics/top-products?from=2026-01-01&to=2026-12-31&limit=10
     * 
     * Query-Parameter:
     * - limit: Anzahl Produkte (1-100, Default: 10)
     * - from: Start-Datum (optional, ISO-8601: YYYY-MM-DD)
     * - to: End-Datum (optional, ISO-8601: YYYY-MM-DD)
     * 
     * Response:
     * [
     *   {
     *     "productId": 123,
     *     "productName": "Marokkanische Tajine",
     *     "totalQuantitySold": 45,
     *     "totalRevenue": 6750.00,
     *     "orderCount": 38
     *   },
     *   ...
     * ]
     * 
     * Security: Nur Store-Owner
     */
    @GetMapping("/top-products")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<List<TopProductDTO>> getTopProducts(
        @PathVariable Long storeId,
        @RequestParam(defaultValue = "10") int limit,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        log.info("[ANALYTICS-API] GET /api/stores/{}/analytics/top-products?limit={}&from={}&to={}", 
            storeId, limit, from, to);
        
        // Limit sinnvoll begrenzen
        if (limit < 1) limit = 10;
        if (limit > 100) limit = 100;
        
        List<TopProductDTO> topProducts = analyticsService.getTopProducts(storeId, limit, from, to);
        
        return ResponseEntity.ok(topProducts);
    }
    
    /**
     * Bestellstatistiken
     * 
     * GET /api/stores/{storeId}/analytics/order-stats?from=2026-01-01&to=2026-12-31
     * 
     * Query-Parameter (optional):
     * - from: Start-Datum (ISO-8601: YYYY-MM-DD)
     * - to: End-Datum (ISO-8601: YYYY-MM-DD)
     * 
     * Response:
     * {
     *   "ordersByStatus": {
     *     "CONFIRMED": 120,
     *     "PROCESSING": 45,
     *     "SHIPPED": 80,
     *     "DELIVERED": 100,
     *     "CANCELLED": 5
     *   },
     *   "ordersByPaymentMethod": {
     *     "PAYPAL": 200,
     *     "CASH_ON_DELIVERY": 150
     *   }
     * }
     * 
     * Security: Nur Store-Owner
     */
    @GetMapping("/order-stats")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<OrderStatsDTO> getOrderStats(
        @PathVariable Long storeId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        log.info("[ANALYTICS-API] GET /api/stores/{}/analytics/order-stats?from={}&to={}", 
            storeId, from, to);
        
        OrderStatsDTO stats = analyticsService.getOrderStats(storeId, from, to);
        
        return ResponseEntity.ok(stats);
    }
}
