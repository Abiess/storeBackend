package storebackend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.*;
import storebackend.entity.DeliveryZone;
import storebackend.entity.StoreDeliverySettings;
import storebackend.enums.DeliveryMode;
import storebackend.enums.DeliveryType;
import storebackend.repository.DeliveryZoneRepository;
import storebackend.repository.StoreDeliverySettingsRepository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Public service for delivery options (no authentication required)
 * Used by storefront checkout to get available delivery methods
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PublicDeliveryService {

    private final StoreDeliverySettingsRepository settingsRepository;
    private final DeliveryZoneRepository zoneRepository;
    private final ObjectMapper objectMapper;

    /**
     * Get all available delivery options for a store and address
     *
     * @param storeId Store ID
     * @param request Request containing postal code, city, country
     * @return Response with pickup/delivery options and availability
     */
    public DeliveryOptionsResponseDTO getDeliveryOptions(Long storeId, DeliveryOptionsRequestDTO request) {
        log.debug("🚚 Getting delivery options for store {} with postal code {}", storeId, request.getPostalCode());

        // Trim and normalize input
        String postalCode = request.getPostalCode().trim();

        // Get store delivery settings (or create default if not exists)
        StoreDeliverySettings settings = settingsRepository.findById(storeId)
                .orElse(createDefaultSettings(storeId));

        List<DeliveryOptionDTO> options = new ArrayList<>();

        // 1. PICKUP OPTION - Always add if enabled
        if (settings.getPickupEnabled()) {
            options.add(DeliveryOptionDTO.builder()
                    .deliveryType(DeliveryType.PICKUP)
                    .deliveryMode(null)
                    .fee(BigDecimal.ZERO)
                    .etaMinutes(null)
                    .available(true)
                    .zoneId(null)
                    .zoneName(null)
                    .reason(null)
                    .build());
            log.debug("✅ PICKUP option available");
        }

        // 2. DELIVERY OPTIONS
        if (!settings.getDeliveryEnabled()) {
            // Delivery is disabled - add unavailable options
            options.add(createUnavailableOption(DeliveryMode.STANDARD, "Delivery is not enabled for this store"));

            if (settings.getExpressEnabled()) {
                options.add(createUnavailableOption(DeliveryMode.EXPRESS, "Delivery is not enabled for this store"));
            }

            log.debug("❌ Delivery disabled for store {}", storeId);
        } else {
            // Delivery is enabled - find matching zone
            DeliveryZone matchingZone = findMatchingZone(storeId, postalCode, request.getCity(), request.getCountry());

            if (matchingZone == null) {
                // No matching zone found
                options.add(createUnavailableOption(DeliveryMode.STANDARD, "No delivery zone configured for postal code " + postalCode));

                if (settings.getExpressEnabled()) {
                    options.add(createUnavailableOption(DeliveryMode.EXPRESS, "No delivery zone configured for postal code " + postalCode));
                }

                log.debug("❌ No matching delivery zone for postal code {}", postalCode);
            } else {
                // Matching zone found - add STANDARD option
                options.add(DeliveryOptionDTO.builder()
                        .deliveryType(DeliveryType.DELIVERY)
                        .deliveryMode(DeliveryMode.STANDARD)
                        .fee(matchingZone.getFeeStandard())
                        .etaMinutes(matchingZone.getEtaStandardMinutes())
                        .available(true)
                        .zoneId(matchingZone.getId())
                        .zoneName(matchingZone.getName())
                        .reason(null)
                        .build());
                log.debug("✅ DELIVERY STANDARD available: {} (zone: {})", matchingZone.getFeeStandard(), matchingZone.getName());

                // Add EXPRESS option if enabled and configured
                if (settings.getExpressEnabled() &&
                        matchingZone.getFeeExpress() != null &&
                        matchingZone.getEtaExpressMinutes() != null) {

                    options.add(DeliveryOptionDTO.builder()
                            .deliveryType(DeliveryType.DELIVERY)
                            .deliveryMode(DeliveryMode.EXPRESS)
                            .fee(matchingZone.getFeeExpress())
                            .etaMinutes(matchingZone.getEtaExpressMinutes())
                            .available(true)
                            .zoneId(matchingZone.getId())
                            .zoneName(matchingZone.getName())
                            .reason(null)
                            .build());
                    log.debug("✅ DELIVERY EXPRESS available: {}", matchingZone.getFeeExpress());
                } else if (settings.getExpressEnabled()) {
                    // Express enabled but zone doesn't support it
                    options.add(createUnavailableOption(DeliveryMode.EXPRESS, "Express delivery not configured for this zone"));
                    log.debug("❌ EXPRESS not configured for zone {}", matchingZone.getName());
                }
            }
        }

        return DeliveryOptionsResponseDTO.builder()
                .pickupEnabled(settings.getPickupEnabled())
                .deliveryEnabled(settings.getDeliveryEnabled())
                .expressEnabled(settings.getExpressEnabled())
                .currency(settings.getCurrency())
                .options(options)
                .build();
    }

    /**
     * Find delivery zone matching postal code, city, and country
     *
     * @param storeId Store ID
     * @param postalCode Postal code (required)
     * @param city City (optional)
     * @param country Country (optional)
     * @return Matching zone or null
     */
    private DeliveryZone findMatchingZone(Long storeId, String postalCode, String city, String country) {
        // Get all active zones for store
        List<DeliveryZone> zones = zoneRepository.findByStoreIdAndIsActiveTrueOrderByNameAsc(storeId);

        for (DeliveryZone zone : zones) {
            // Check country match (if specified)
            if (country != null && !country.isBlank() &&
                    zone.getCountry() != null && !zone.getCountry().isBlank()) {
                if (!zone.getCountry().equalsIgnoreCase(country.trim())) {
                    continue; // Country mismatch
                }
            }

            // Check city match (if specified)
            if (city != null && !city.isBlank() &&
                    zone.getCity() != null && !zone.getCity().isBlank()) {
                if (!zone.getCity().equalsIgnoreCase(city.trim())) {
                    continue; // City mismatch
                }
            }

            // Check postal code range match
            if (isPostalCodeInRange(postalCode, zone.getPostalCodeRanges())) {
                log.debug("✅ Found matching zone: {} for postal code {}", zone.getName(), postalCode);
                return zone;
            }
        }

        return null;
    }

    /**
     * Check if postal code matches any range in the JSON array
     *
     * LOGIC DECISION:
     * - If postalCodeRanges is null/empty → Zone matches ANY postal code (wildcard)
     * - If postalCodeRanges contains ranges → Postal code must match at least one
     * - Supports formats: "20000-20999" (range) and "20000" (single code)
     * - Range matching is numeric prefix-based (e.g. "20095" matches "20000-20999")
     *
     * @param postalCode Postal code to check (e.g. "20095")
     * @param rangesJson JSON array string (e.g. ["20000-20999", "21000"])
     * @return true if postal code matches
     */
    private boolean isPostalCodeInRange(String postalCode, String rangesJson) {
        // Null or empty ranges → Zone matches ANY postal code (wildcard zone)
        if (rangesJson == null || rangesJson.isBlank() || rangesJson.trim().equals("[]")) {
            log.debug("📍 Postal code ranges empty → wildcard match for any postal code");
            return true;
        }

        try {
            // Parse JSON array
            List<String> ranges = objectMapper.readValue(rangesJson, new TypeReference<List<String>>() {});

            if (ranges == null || ranges.isEmpty()) {
                log.debug("📍 Parsed ranges empty → wildcard match");
                return true;
            }

            // Check each range
            for (String range : ranges) {
                if (range == null || range.isBlank()) {
                    continue;
                }

                range = range.trim();

                // Check if range contains "-" (e.g. "20000-20999")
                if (range.contains("-")) {
                    String[] parts = range.split("-");
                    if (parts.length == 2) {
                        String start = parts[0].trim();
                        String end = parts[1].trim();

                        if (isInNumericRange(postalCode, start, end)) {
                            log.debug("✅ Postal code {} matches range {}", postalCode, range);
                            return true;
                        }
                    }
                } else {
                    // Single postal code or prefix (e.g. "20000")
                    if (postalCode.startsWith(range)) {
                        log.debug("✅ Postal code {} matches prefix {}", postalCode, range);
                        return true;
                    }
                }
            }

            log.debug("❌ Postal code {} does not match any range in {}", postalCode, rangesJson);
            return false;

        } catch (Exception e) {
            log.warn("⚠️ Failed to parse postal code ranges JSON: {} - Error: {}", rangesJson, e.getMessage());
            // On parse error, treat as wildcard (safer for customer experience)
            return true;
        }
    }

    /**
     * Check if postal code is within numeric range (inclusive)
     *
     * @param postalCode Postal code (e.g. "20095")
     * @param start Range start (e.g. "20000")
     * @param end Range end (e.g. "20999")
     * @return true if within range
     */
    private boolean isInNumericRange(String postalCode, String start, String end) {
        try {
            // Extract numeric prefix (ignore non-numeric suffixes)
            String postalPrefix = extractNumericPrefix(postalCode);
            String startPrefix = extractNumericPrefix(start);
            String endPrefix = extractNumericPrefix(end);

            if (postalPrefix.isEmpty()) {
                return false;
            }

            // Pad to same length for comparison
            int maxLength = Math.max(startPrefix.length(), Math.max(endPrefix.length(), postalPrefix.length()));
            postalPrefix = padRight(postalPrefix, maxLength);
            startPrefix = padRight(startPrefix, maxLength);
            endPrefix = padRight(endPrefix, maxLength);

            return postalPrefix.compareTo(startPrefix) >= 0 && postalPrefix.compareTo(endPrefix) <= 0;

        } catch (Exception e) {
            log.debug("❌ Numeric range check failed: {} not in [{}, {}]", postalCode, start, end);
            return false;
        }
    }

    /**
     * Extract numeric prefix from postal code (e.g. "20095-HH" → "20095")
     */
    private String extractNumericPrefix(String postalCode) {
        StringBuilder numeric = new StringBuilder();
        for (char c : postalCode.toCharArray()) {
            if (Character.isDigit(c)) {
                numeric.append(c);
            } else {
                break; // Stop at first non-digit
            }
        }
        return numeric.toString();
    }

    /**
     * Pad string with zeros on the right
     */
    private String padRight(String str, int length) {
        while (str.length() < length) {
            str = str + "0";
        }
        return str;
    }

    /**
     * Create unavailable delivery option with reason
     */
    private DeliveryOptionDTO createUnavailableOption(DeliveryMode mode, String reason) {
        return DeliveryOptionDTO.builder()
                .deliveryType(DeliveryType.DELIVERY)
                .deliveryMode(mode)
                .fee(BigDecimal.ZERO)
                .etaMinutes(null)
                .available(false)
                .zoneId(null)
                .zoneName(null)
                .reason(reason)
                .build();
    }

    /**
     * Create default settings if none exist (for new stores)
     */
    private StoreDeliverySettings createDefaultSettings(Long storeId) {
        StoreDeliverySettings settings = new StoreDeliverySettings();
        settings.setStoreId(storeId);
        settings.setPickupEnabled(true);
        settings.setDeliveryEnabled(false);
        settings.setExpressEnabled(false);
        settings.setCurrency("EUR");
        return settings;
    }
}

