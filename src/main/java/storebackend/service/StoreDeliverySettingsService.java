package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.StoreDeliverySettingsDTO;
import storebackend.entity.Store;
import storebackend.entity.StoreDeliverySettings;
import storebackend.repository.StoreDeliverySettingsRepository;
import storebackend.repository.StoreRepository;

import java.time.LocalDateTime;

/**
 * Service for managing store delivery settings
 * Inkludiert DHL Settings mit Secret Masking + Encryption
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StoreDeliverySettingsService {

    private static final String MASKED_SECRET = "********";
    
    private final StoreDeliverySettingsRepository settingsRepository;
    private final StoreRepository storeRepository;
    private final SecretEncryptionService encryptionService;

    public StoreDeliverySettingsDTO getSettings(Long storeId) {
        StoreDeliverySettings settings = settingsRepository.findByStoreId(storeId)
            .orElseGet(() -> createDefaultSettings(storeId));
        return toDTO(settings);
    }

    public StoreDeliverySettingsDTO updateSettings(Long storeId, StoreDeliverySettingsDTO request) {
        StoreDeliverySettings settings = settingsRepository.findByStoreId(storeId)
            .orElseGet(() -> createDefaultSettings(storeId));

        // Basic Delivery Settings
        if (request.getPickupEnabled() != null) {
            settings.setPickupEnabled(request.getPickupEnabled());
        }
        if (request.getDeliveryEnabled() != null) {
            settings.setDeliveryEnabled(request.getDeliveryEnabled());
        }
        if (request.getExpressEnabled() != null) {
            settings.setExpressEnabled(request.getExpressEnabled());
        }
        if (request.getCurrency() != null) {
            settings.setCurrency(request.getCurrency());
        }
        
        // ════════════════════════════════════════════════════════════
        // DHL SETTINGS mit Secret Handling
        // ════════════════════════════════════════════════════════════
        
        if (request.getDhlEnabled() != null) {
            settings.setDhlEnabled(request.getDhlEnabled());
        }
        if (request.getDhlEnvironment() != null) {
            settings.setDhlEnvironment(request.getDhlEnvironment());
        }
        if (request.getDhlClientId() != null) {
            settings.setDhlClientId(request.getDhlClientId());
        }
        
        // SECRET: dhlClientSecret
        // WICHTIG: Encrypt before save if new value provided
        updateSecretFieldEncrypted(
            request.getDhlClientSecret(),
            settings.getDhlClientSecret(),
            settings::setDhlClientSecret
        );
        
        if (request.getDhlUsername() != null) {
            settings.setDhlUsername(request.getDhlUsername());
        }
        
        // SECRET: dhlPassword
        // WICHTIG: Encrypt before save if new value provided
        updateSecretFieldEncrypted(
            request.getDhlPassword(),
            settings.getDhlPassword(),
            settings::setDhlPassword
        );
        
        if (request.getDhlBillingNumber() != null) {
            settings.setDhlBillingNumber(request.getDhlBillingNumber());
        }
        
        // Shipper Address
        if (request.getDhlShipperName() != null) {
            settings.setDhlShipperName(request.getDhlShipperName());
        }
        if (request.getDhlShipperStreet() != null) {
            settings.setDhlShipperStreet(request.getDhlShipperStreet());
        }
        if (request.getDhlShipperHouseNumber() != null) {
            settings.setDhlShipperHouseNumber(request.getDhlShipperHouseNumber());
        }
        if (request.getDhlShipperPostalCode() != null) {
            settings.setDhlShipperPostalCode(request.getDhlShipperPostalCode());
        }
        if (request.getDhlShipperCity() != null) {
            settings.setDhlShipperCity(request.getDhlShipperCity());
        }
        if (request.getDhlShipperCountry() != null) {
            settings.setDhlShipperCountry(request.getDhlShipperCountry());
        }
        if (request.getDhlShipperEmail() != null) {
            settings.setDhlShipperEmail(request.getDhlShipperEmail());
        }
        if (request.getDhlShipperPhone() != null) {
            settings.setDhlShipperPhone(request.getDhlShipperPhone());
        }
        
        // Default Package Dimensions
        if (request.getDhlDefaultWeightGrams() != null) {
            settings.setDhlDefaultWeightGrams(request.getDhlDefaultWeightGrams());
        }
        if (request.getDhlDefaultLengthMm() != null) {
            settings.setDhlDefaultLengthMm(request.getDhlDefaultLengthMm());
        }
        if (request.getDhlDefaultWidthMm() != null) {
            settings.setDhlDefaultWidthMm(request.getDhlDefaultWidthMm());
        }
        if (request.getDhlDefaultHeightMm() != null) {
            settings.setDhlDefaultHeightMm(request.getDhlDefaultHeightMm());
        }
        
        settings.setUpdatedAt(LocalDateTime.now());

        settings = settingsRepository.save(settings);
        log.info("✅ Updated delivery settings for store {} (DHL enabled: {})", 
            storeId, settings.getDhlEnabled());

        return toDTO(settings);
    }
    
    /**
     * Secret Field Update Logic (mit Encryption):
     * - Wenn requestValue == null oder "********" → vorhandenen Wert behalten
     * - Wenn requestValue == "" (leer) → Secret löschen (null)
     * - Sonst → neuer Wert ENCRYPT und setzen
     */
    private void updateSecretFieldEncrypted(String requestValue, String currentValue, 
                                   java.util.function.Consumer<String> setter) {
        if (requestValue == null || MASKED_SECRET.equals(requestValue)) {
            // Masked oder nicht gesendet → behalten
            return;
        }
        if (requestValue.isEmpty()) {
            // Leer → löschen
            setter.accept(null);
            log.debug("Secret field deleted");
        } else {
            // Neuer Wert → ENCRYPT before save
            String encrypted = encryptionService.encrypt(requestValue);
            setter.accept(encrypted);
            log.debug("Secret field encrypted and saved");
        }
    }
    
    /**
     * @deprecated Use updateSecretFieldEncrypted() instead
     */
    @Deprecated
    private void updateSecretField(String requestValue, String currentValue, 
                                   java.util.function.Consumer<String> setter) {
        updateSecretFieldEncrypted(requestValue, currentValue, setter);
    }

    private StoreDeliverySettings createDefaultSettings(Long storeId) {
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new RuntimeException("Store not found"));

        StoreDeliverySettings settings = new StoreDeliverySettings();
        settings.setStore(store);
        settings.setPickupEnabled(true);
        settings.setDeliveryEnabled(false);
        settings.setExpressEnabled(false);
        settings.setCurrency("EUR");
        settings.setDhlEnabled(false);
        settings.setUpdatedAt(LocalDateTime.now());

        return settingsRepository.save(settings);
    }

    private StoreDeliverySettingsDTO toDTO(StoreDeliverySettings entity) {
        StoreDeliverySettingsDTO dto = new StoreDeliverySettingsDTO();
        dto.setStoreId(entity.getStoreId());
        dto.setPickupEnabled(entity.getPickupEnabled());
        dto.setDeliveryEnabled(entity.getDeliveryEnabled());
        dto.setExpressEnabled(entity.getExpressEnabled());
        dto.setCurrency(entity.getCurrency());
        
        // ════════════════════════════════════════════════════════════
        // DHL SETTINGS mit Secret Masking
        // ════════════════════════════════════════════════════════════
        
        dto.setDhlEnabled(entity.getDhlEnabled());
        dto.setDhlEnvironment(entity.getDhlEnvironment());
        dto.setDhlClientId(entity.getDhlClientId());
        
        // MASKED SECRET
        dto.setDhlClientSecret(maskSecret(entity.getDhlClientSecret()));
        
        dto.setDhlUsername(entity.getDhlUsername());
        
        // MASKED SECRET
        dto.setDhlPassword(maskSecret(entity.getDhlPassword()));
        
        dto.setDhlBillingNumber(entity.getDhlBillingNumber());
        
        // Shipper Address
        dto.setDhlShipperName(entity.getDhlShipperName());
        dto.setDhlShipperStreet(entity.getDhlShipperStreet());
        dto.setDhlShipperHouseNumber(entity.getDhlShipperHouseNumber());
        dto.setDhlShipperPostalCode(entity.getDhlShipperPostalCode());
        dto.setDhlShipperCity(entity.getDhlShipperCity());
        dto.setDhlShipperCountry(entity.getDhlShipperCountry());
        dto.setDhlShipperEmail(entity.getDhlShipperEmail());
        dto.setDhlShipperPhone(entity.getDhlShipperPhone());
        
        // Default Package Dimensions
        dto.setDhlDefaultWeightGrams(entity.getDhlDefaultWeightGrams());
        dto.setDhlDefaultLengthMm(entity.getDhlDefaultLengthMm());
        dto.setDhlDefaultWidthMm(entity.getDhlDefaultWidthMm());
        dto.setDhlDefaultHeightMm(entity.getDhlDefaultHeightMm());
        
        return dto;
    }
    
    /**
     * Mask Secret für Response
     * Wenn Secret existiert → "********", sonst null
     */
    private String maskSecret(String secret) {
        return (secret != null && !secret.isEmpty()) ? MASKED_SECRET : null;
    }
}
