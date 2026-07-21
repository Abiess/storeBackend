package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.analytics.OrderStatsDTO;
import storebackend.dto.analytics.RevenueSummaryDTO;
import storebackend.dto.analytics.TopProductDTO;
import storebackend.entity.Store;
import storebackend.enums.OrderStatus;
import storebackend.enums.PaymentMethod;
import storebackend.enums.PaymentStatus;
import storebackend.repository.OrderItemRepository;
import storebackend.repository.OrderRepository;
import storebackend.repository.StoreRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Store Analytics Service
 * 
 * Liefert aggregierte Kennzahlen für Store-Owner Dashboard
 * Nur Geschäftsdaten aus orders/order_items - KEIN Visitor-Tracking
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StoreAnalyticsService {
    
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final StoreRepository storeRepository;
    
    // Maximaler Zeitraum: 2 Jahre
    private static final int MAX_DAYS = 730;
    
    /**
     * Umsatz-Zusammenfassung für einen Store (mit optionalem Zeitraum)
     * 
     * Fachliche Regel:
     * - Umsatz: nur paymentStatus=PAID
     * - Status: NICHT CANCELLED, NICHT PAYMENT_FAILED
     * - Durchschnittlicher Bestellwert: Umsatz / Anzahl bezahlter Bestellungen
     * - Zeitraum: from/to optional, Standard = aktuelles Jahr
     */
    @Transactional(readOnly = true)
    public RevenueSummaryDTO getRevenueSummary(Long storeId, LocalDate from, LocalDate to) {
        // Zeitraum validieren und Default setzen
        DateRange dateRange = validateAndNormalizeDateRange(from, to);
        
        log.info("[ANALYTICS] Calculating revenue summary for storeId={}, from={}, to={}", 
            storeId, dateRange.from(), dateRange.to());
        
        // Ausgeschlossene Status (storniert, fehlgeschlagen)
        List<OrderStatus> excludedStatuses = Arrays.asList(
            OrderStatus.CANCELLED,
            OrderStatus.PAYMENT_FAILED
        );
        
        // Gesamtumsatz (nur PAID Orders, ohne CANCELLED/FAILED)
        BigDecimal totalRevenue = orderRepository.sumRevenueByStore(
            storeId,
            PaymentStatus.PAID,
            excludedStatuses,
            dateRange.fromDateTime(),
            dateRange.toDateTime()
        );
        
        // Anzahl bezahlter Bestellungen
        Long paidOrderCount = orderRepository.countPaidOrders(
            storeId,
            PaymentStatus.PAID,
            dateRange.fromDateTime(),
            dateRange.toDateTime()
        );
        
        // Durchschnittlicher Bestellwert
        BigDecimal averageOrderValue = BigDecimal.ZERO;
        if (paidOrderCount != null && paidOrderCount > 0) {
            averageOrderValue = totalRevenue.divide(
                new BigDecimal(paidOrderCount),
                2,
                RoundingMode.HALF_UP
            );
        }
        
        // Währungscode aus Store holen
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new IllegalArgumentException("Store not found: " + storeId));
        
        String currencyCode = store.getCurrencyCode() != null 
            ? store.getCurrencyCode().name() 
            : "EUR";
        
        log.info("[ANALYTICS] Revenue Summary: storeId={}, revenue={}, orders={}, avg={}, currency={}",
            storeId, totalRevenue, paidOrderCount, averageOrderValue, currencyCode);
        
        return new RevenueSummaryDTO(
            totalRevenue,
            paidOrderCount,
            averageOrderValue,
            currencyCode
        );
    }
    
    /**
     * Top-Produkte nach Umsatz (mit optionalem Zeitraum)
     * 
     * Fachliche Regel:
     * - Nur bezahlte Orders (paymentStatus=PAID)
     * - Sortiert nach Gesamtumsatz (höchster zuerst)
     */
    @Transactional(readOnly = true)
    public List<TopProductDTO> getTopProducts(Long storeId, int limit, LocalDate from, LocalDate to) {
        // Zeitraum validieren und Default setzen
        DateRange dateRange = validateAndNormalizeDateRange(from, to);
        
        log.info("[ANALYTICS] Fetching top {} products for storeId={}, from={}, to={}", 
            limit, storeId, dateRange.from(), dateRange.to());
        
        List<TopProductDTO> topProducts = orderItemRepository.findTopProductsByRevenue(
            storeId,
            PaymentStatus.PAID,
            dateRange.fromDateTime(),
            dateRange.toDateTime(),
            limit
        );
        
        // LIMIT wird in JPQL nicht als Parameter unterstützt - manuell begrenzen
        if (topProducts.size() > limit) {
            topProducts = topProducts.subList(0, limit);
        }
        
        log.info("[ANALYTICS] Found {} top products for storeId={}", topProducts.size(), storeId);
        
        return topProducts;
    }
    
    /**
     * Bestellstatistiken: nach Status und Zahlungsart gruppiert (mit optionalem Zeitraum)
     */
    @Transactional(readOnly = true)
    public OrderStatsDTO getOrderStats(Long storeId, LocalDate from, LocalDate to) {
        // Zeitraum validieren und Default setzen
        DateRange dateRange = validateAndNormalizeDateRange(from, to);
        
        log.info("[ANALYTICS] Calculating order stats for storeId={}, from={}, to={}", 
            storeId, dateRange.from(), dateRange.to());
        
        // Bestellungen nach Status
        List<Object[]> statusCounts = orderRepository.countByStoreGroupedByStatus(
            storeId,
            dateRange.fromDateTime(),
            dateRange.toDateTime()
        );
        Map<OrderStatus, Long> ordersByStatus = new HashMap<>();
        
        for (Object[] row : statusCounts) {
            OrderStatus status = (OrderStatus) row[0];
            Long count = (Long) row[1];
            ordersByStatus.put(status, count);
        }
        
        // Bestellungen nach Zahlungsart
        List<Object[]> paymentMethodCounts = orderRepository.countByStoreGroupedByPaymentMethod(
            storeId,
            dateRange.fromDateTime(),
            dateRange.toDateTime()
        );
        Map<PaymentMethod, Long> ordersByPaymentMethod = new HashMap<>();
        
        for (Object[] row : paymentMethodCounts) {
            PaymentMethod method = (PaymentMethod) row[0];
            Long count = (Long) row[1];
            ordersByPaymentMethod.put(method, count);
        }
        
        log.info("[ANALYTICS] Order Stats: storeId={}, byStatus={}, byPaymentMethod={}",
            storeId, ordersByStatus.size(), ordersByPaymentMethod.size());
        
        return new OrderStatsDTO(ordersByStatus, ordersByPaymentMethod);
    }
    
    /**
     * Zeitraum validieren und normalisieren
     * 
     * Regeln:
     * - from/to fehlen → aktuelles Jahr (1. Januar bis heute)
     * - to inklusive bis Tagesende (23:59:59)
     * - from darf nicht nach to liegen
     * - maximaler Zeitraum: 2 Jahre
     */
    private DateRange validateAndNormalizeDateRange(LocalDate from, LocalDate to) {
        LocalDate now = LocalDate.now();
        
        // Standard: aktuelles Jahr (1. Januar bis heute)
        if (from == null && to == null) {
            from = LocalDate.of(now.getYear(), 1, 1);
            to = now;
        }
        // Nur from gegeben → bis heute
        else if (from != null && to == null) {
            to = now;
        }
        // Nur to gegeben → letztes Jahr vor to
        else if (from == null && to != null) {
            from = to.minusYears(1);
        }
        
        // Validierung: from darf nicht nach to liegen
        if (from.isAfter(to)) {
            throw new IllegalArgumentException(
                String.format("from (%s) must not be after to (%s)", from, to)
            );
        }
        
        // Validierung: maximaler Zeitraum 2 Jahre
        if (from.plusDays(MAX_DAYS).isBefore(to)) {
            throw new IllegalArgumentException(
                String.format("Date range too large (max %d days): from=%s, to=%s", 
                    MAX_DAYS, from, to)
            );
        }
        
        // LocalDateTime erstellen: from = 00:00:00, to = 23:59:59
        LocalDateTime fromDateTime = from.atStartOfDay();
        LocalDateTime toDateTime = to.atTime(LocalTime.MAX);
        
        return new DateRange(from, to, fromDateTime, toDateTime);
    }
    
    /**
     * Internal record für validierte Zeiträume
     */
    private record DateRange(
        LocalDate from,
        LocalDate to,
        LocalDateTime fromDateTime,
        LocalDateTime toDateTime
    ) {}
}
