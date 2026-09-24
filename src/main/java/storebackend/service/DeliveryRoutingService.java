package storebackend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.DeliveryOptionsRequest;
import storebackend.dto.DeliveryOptionsResponse;
import storebackend.entity.*;
import storebackend.enums.DeliveryMode;
import storebackend.enums.DeliveryProviderType;
import storebackend.enums.DeliveryType;
import storebackend.repository.*;

import java.math.BigDecimal;
import java.util.*;

/**
 * Service for delivery routing and provider selection logic
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeliveryRoutingService {

    private final StoreDeliverySettingsRepository settingsRepository;
    private final DeliveryProviderRepository providerRepository;
    private final DeliveryZoneRepository zoneRepository;
    private final ObjectMapper objectMapper;

    /**
     * Calculate available delivery options for checkout
     */
    public DeliveryOptionsResponse calculateDeliveryOptions(DeliveryOptionsRequest request) {
        log.info("🚚 Calculating delivery options for storeId: {}, cartTotal: {}",
            request.getStoreId(), request.getCartTotal());

        // Load settings
        StoreDeliverySettings settings = settingsRepository.findByStoreId(request.getStoreId())
            .orElseGet(() -> createDefaultSettings(request.getStoreId()));

        DeliveryOptionsResponse response = new DeliveryOptionsResponse();
        response.setPickupAvailable(settings.getPickupEnabled());
        response.setDeliveryAvailable(false);
        response.setModes(new ArrayList<>());

        if (!settings.getDeliveryEnabled()) {
            log.info("❌ Delivery disabled for store {}", request.getStoreId());
            return response;
        }

        // Find matching zone
        DeliveryZone matchedZone = findMatchingZone(request.getStoreId(), request.getAddress());

        if (matchedZone == null) {
            log.info("❌ No matching delivery zone found for address: {}, {}, {}",
                request.getAddress().getCountry(),
                request.getAddress().getCity(),
                request.getAddress().getPostalCode());
            return response;
        }

        log.info("✅ Matched delivery zone: {} (id: {})", matchedZone.getName(), matchedZone.getId());

        // Check min order value
        if (matchedZone.getMinOrderValue() != null &&
            request.getCartTotal().compareTo(matchedZone.getMinOrderValue()) < 0) {
            log.info("❌ Cart total {} is below min order value {}",
                request.getCartTotal(), matchedZone.getMinOrderValue());
            return response;
        }

        response.setDeliveryAvailable(true);

        // Add standard mode
        response.getModes().add(new DeliveryOptionsResponse.DeliveryModeOption(
            DeliveryMode.STANDARD,
            matchedZone.getFeeStandard(),
            matchedZone.getEtaStandardMinutes()
        ));

        // Add express mode if enabled
        if (settings.getExpressEnabled() &&
            matchedZone.getFeeExpress() != null &&
            matchedZone.getEtaExpressMinutes() != null) {
            response.getModes().add(new DeliveryOptionsResponse.DeliveryModeOption(
                DeliveryMode.EXPRESS,
                matchedZone.getFeeExpress(),
                matchedZone.getEtaExpressMinutes()
            ));
        }

        return response;
    }

    /**
     * Choose the best delivery provider based on routing rules
     */
    public DeliveryProviderSelection chooseDeliveryProvider(
            Long storeId,
            DeliveryOptionsRequest.AddressDTO address,
            DeliveryMode deliveryMode) {

        log.info("🔍 Choosing delivery provider for storeId: {}, mode: {}", storeId, deliveryMode);

        // Load settings
        StoreDeliverySettings settings = settingsRepository.findByStoreId(storeId)
            .orElseThrow(() -> new RuntimeException("Store delivery settings not found"));

        if (!settings.getDeliveryEnabled()) {
            throw new RuntimeException("Delivery is not enabled for this store");
        }

        if (deliveryMode == DeliveryMode.EXPRESS && !settings.getExpressEnabled()) {
            throw new RuntimeException("Express delivery is not enabled for this store");
        }

        // Find matching zone
        DeliveryZone matchedZone = findMatchingZone(storeId, address);
        if (matchedZone == null) {
            throw new RuntimeException("No delivery zone available for this address");
        }

        // Get fee and ETA from zone
        BigDecimal fee = deliveryMode == DeliveryMode.EXPRESS
            ? matchedZone.getFeeExpress()
            : matchedZone.getFeeStandard();

        Integer etaMinutes = deliveryMode == DeliveryMode.EXPRESS
            ? matchedZone.getEtaExpressMinutes()
            : matchedZone.getEtaStandardMinutes();

        // Load active providers
        List<DeliveryProvider> activeProviders = providerRepository.findActiveByStoreId(storeId);

        if (activeProviders.isEmpty()) {
            throw new RuntimeException("No active delivery providers configured");
        }

        // Apply routing rules - priority order:
        // 1. IN_HOUSE (if zone match)
        // 2. WHATSAPP_DISPATCH
        // 3. MANUAL
        // 4. EXTERNAL_PLACEHOLDER
        // Within same type: lowest priority number wins

        DeliveryProvider selectedProvider = null;

        // Try IN_HOUSE first
        List<DeliveryProvider> inHouseProviders = activeProviders.stream()
            .filter(p -> p.getType() == DeliveryProviderType.IN_HOUSE)
            .sorted(Comparator.comparing(DeliveryProvider::getPriority))
            .toList();

        if (!inHouseProviders.isEmpty()) {
            selectedProvider = inHouseProviders.get(0);
            log.info("✅ Selected IN_HOUSE provider: {} (priority: {})",
                selectedProvider.getName(), selectedProvider.getPriority());
        }

        // Fallback to WHATSAPP_DISPATCH
        if (selectedProvider == null) {
            List<DeliveryProvider> whatsappProviders = activeProviders.stream()
                .filter(p -> p.getType() == DeliveryProviderType.WHATSAPP_DISPATCH)
                .sorted(Comparator.comparing(DeliveryProvider::getPriority))
                .toList();

            if (!whatsappProviders.isEmpty()) {
                selectedProvider = whatsappProviders.get(0);
                log.info("✅ Selected WHATSAPP_DISPATCH provider: {} (priority: {})",
                    selectedProvider.getName(), selectedProvider.getPriority());
            }
        }

        // Fallback to MANUAL
        if (selectedProvider == null) {
            List<DeliveryProvider> manualProviders = activeProviders.stream()
                .filter(p -> p.getType() == DeliveryProviderType.MANUAL)
                .sorted(Comparator.comparing(DeliveryProvider::getPriority))
                .toList();

            if (!manualProviders.isEmpty()) {
                selectedProvider = manualProviders.get(0);
                log.info("✅ Selected MANUAL provider: {} (priority: {})",
                    selectedProvider.getName(), selectedProvider.getPriority());
            }
        }

        // Last resort: EXTERNAL_PLACEHOLDER
        if (selectedProvider == null) {
            List<DeliveryProvider> externalProviders = activeProviders.stream()
                .filter(p -> p.getType() == DeliveryProviderType.EXTERNAL_PLACEHOLDER)
                .sorted(Comparator.comparing(DeliveryProvider::getPriority))
                .toList();

            if (!externalProviders.isEmpty()) {
                selectedProvider = externalProviders.get(0);
                log.info("✅ Selected EXTERNAL_PLACEHOLDER provider: {} (priority: {})",
                    selectedProvider.getName(), selectedProvider.getPriority());
            }
        }

        if (selectedProvider == null) {
            throw new RuntimeException("No suitable delivery provider found");
        }

        return new DeliveryProviderSelection(
            selectedProvider.getId(),
            selectedProvider.getName(),
            selectedProvider.getType(),
            fee,
            etaMinutes
        );
    }

    /**
     * Find matching delivery zone for address
     */
    private DeliveryZone findMatchingZone(Long storeId, DeliveryOptionsRequest.AddressDTO address) {
        List<DeliveryZone> activeZones = zoneRepository.findActiveByStoreId(storeId);

        for (DeliveryZone zone : activeZones) {
            // Match country
            if (!zone.getCountry().equalsIgnoreCase(address.getCountry())) {
                continue;
            }

            // Match city (if specified in zone)
            if (zone.getCity() != null && !zone.getCity().isEmpty()) {
                if (address.getCity() == null ||
                    !zone.getCity().equalsIgnoreCase(address.getCity())) {
                    continue;
                }
            }

            // Match postal code
            if (zone.getPostalCodeRanges() != null && !zone.getPostalCodeRanges().isEmpty()) {
                if (address.getPostalCode() == null ||
                    !matchesPostalCodeRange(address.getPostalCode(), zone.getPostalCodeRanges())) {
                    continue;
                }
            }

            // All criteria matched
            return zone;
        }

        return null;
    }

    /**
     * Check if postal code matches any range in the JSON array
     */
    private boolean matchesPostalCodeRange(String postalCode, String rangesJson) {
        try {
            List<String> ranges = objectMapper.readValue(rangesJson, new TypeReference<List<String>>() {});

            for (String range : ranges) {
                if (range.contains("-")) {
                    // Range format: "20000-20999"
                    String[] parts = range.split("-");
                    if (parts.length == 2) {
                        String start = parts[0].trim();
                        String end = parts[1].trim();

                        if (postalCode.compareTo(start) >= 0 && postalCode.compareTo(end) <= 0) {
                            return true;
                        }
                    }
                } else {
                    // Exact match or prefix
                    if (postalCode.startsWith(range.trim())) {
                        return true;
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse postal code ranges: {}", rangesJson, e);
        }

        return false;
    }

    private StoreDeliverySettings createDefaultSettings(Long storeId) {
        StoreDeliverySettings settings = new StoreDeliverySettings();
        settings.setStoreId(storeId);
        settings.setPickupEnabled(true);
        settings.setDeliveryEnabled(false);
        settings.setExpressEnabled(false);
        settings.setCurrency("EUR");
        return settings;
    }

    /**
     * Result of provider selection
     */
    public record DeliveryProviderSelection(
        Long providerId,
        String providerName,
        DeliveryProviderType providerType,
        BigDecimal fee,
        Integer etaMinutes
    ) {}
}

