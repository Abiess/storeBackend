package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.CJConnectionRequest;
import storebackend.dto.CJOrderRequest;
import storebackend.dto.CJOrderResponse;
import storebackend.entity.*;
import storebackend.enums.FulfillmentStatus;
import storebackend.enums.SupplierType;
import storebackend.repository.DropshippingSourceRepository;
import storebackend.repository.OrderItemRepository;
import storebackend.repository.StoreRepository;
import storebackend.repository.SupplierConnectionRepository;

import java.time.LocalDateTime;

/**
 * CJ Integration Service - Verwaltet CJ Connections und Order Placement
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CJIntegrationService {

    private final SupplierConnectionRepository connectionRepository;
    private final DropshippingSourceRepository dropshippingSourceRepository;
    private final OrderItemRepository orderItemRepository;
    private final StoreRepository storeRepository;
    private final CJApiService cjApiService;

    /**
     * Verbinde Store mit CJ Account
     */
    @Transactional
    public void connectStore(Long storeId, CJConnectionRequest request, User user) {
        log.info("Connecting store {} to CJ for user {}", storeId, user.getEmail());

        request.validate();

        // Security: Prüfe Store Ownership
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized: Not store owner");
        }

        // Authentifiziere bei CJ
        String accessToken = cjApiService.authenticate(request.email(), request.password());

        // Speichere oder aktualisiere Connection
        SupplierConnection connection = connectionRepository
                .findByStoreIdAndSupplierType(storeId, SupplierType.CJ)
                .orElse(new SupplierConnection());

        connection.setStore(store);
        connection.setSupplierType(SupplierType.CJ);
        connection.setApiKey(request.email());
        connection.setAccessToken(accessToken);
        connection.setIsActive(true);
        connection.setTokenExpiresAt(LocalDateTime.now().plusDays(30)); // CJ tokens meist 30 Tage gültig

        connectionRepository.save(connection);
        log.info("✅ CJ connection saved for store {}", storeId);
    }

    /**
     * Bestelle Order Item bei CJ
     */
    @Transactional
    public CJOrderResponse placeOrder(CJOrderRequest request, User user) {
        log.info("Placing CJ order for item {} by user {}", request.orderItemId(), user.getEmail());

        request.validate();

        // Lade Order Item
        OrderItem item = orderItemRepository.findById(request.orderItemId())
                .orElseThrow(() -> new RuntimeException("Order item not found"));

        // Security: Prüfe Store Ownership
        Store store = item.getOrder().getStore();
        if (!store.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized: Not store owner");
        }

        // Lade Dropshipping Source
        DropshippingSource source = dropshippingSourceRepository
                .findByVariantId(item.getVariant().getId())
                .orElseThrow(() -> new RuntimeException("No dropshipping source found for this item"));

        // Prüfe: Ist es ein CJ Source?
        if (source.getSupplierType() != SupplierType.CJ) {
            throw new RuntimeException("This item is not configured for CJ dropshipping");
        }

        // Prüfe: CJ IDs vorhanden?
        if (source.getCjProductId() == null || source.getCjVariantId() == null) {
            throw new RuntimeException("CJ Product/Variant ID missing in dropshipping source");
        }

        // Lade CJ Connection
        SupplierConnection connection = connectionRepository
                .findByStoreIdAndSupplierType(store.getId(), SupplierType.CJ)
                .orElseThrow(() -> new RuntimeException("Store not connected to CJ. Please connect first."));

        // Prüfe Token
        if (!connection.isTokenValid()) {
            throw new RuntimeException("CJ token expired. Please reconnect.");
        }

        try {
            // Bestelle bei CJ
            String cjOrderId = cjApiService.createOrder(
                    connection.getAccessToken(),
                    source.getCjProductId(),
                    source.getCjVariantId(),
                    item.getQuantity(),
                    request.shippingFirstName(),
                    request.shippingLastName(),
                    request.shippingAddress(),
                    request.shippingCity(),
                    request.shippingPostalCode(),
                    request.shippingCountryCode(),
                    request.shippingPhone()
            );

            // Speichere CJ Order ID im OrderItem
            item.setSupplierOrderId(cjOrderId);
            item.setFulfillmentStatus(FulfillmentStatus.ORDERED);
            item.setOrderedFromSupplierAt(LocalDateTime.now());
            orderItemRepository.save(item);

            log.info("✅ CJ Order placed: {} for OrderItem {}", cjOrderId, item.getId());
            return CJOrderResponse.success(cjOrderId);

        } catch (Exception e) {
            log.error("Failed to place CJ order: {}", e.getMessage());
            return CJOrderResponse.error(e.getMessage(), "CJ_API_ERROR");
        }
    }

    /**
     * Prüfe ob Store mit CJ verbunden ist
     */
    public boolean isStoreConnected(Long storeId) {
        return connectionRepository
                .findByStoreIdAndSupplierType(storeId, SupplierType.CJ)
                .map(SupplierConnection::isTokenValid)
                .orElse(false);
    }

    /**
     * Disconnect Store von CJ
     */
    @Transactional
    public void disconnectStore(Long storeId, User user) {
        log.info("Disconnecting store {} from CJ", storeId);

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized: Not store owner");
        }

        connectionRepository.deleteByStoreIdAndSupplierType(storeId, SupplierType.CJ);
        log.info("✅ CJ connection deleted for store {}", storeId);
    }
}

