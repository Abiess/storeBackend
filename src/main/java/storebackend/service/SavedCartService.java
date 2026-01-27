package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.SavedCartDTO;
import storebackend.dto.SavedCartItemDTO;
import storebackend.entity.Product;
import storebackend.entity.SavedCart;
import storebackend.entity.SavedCartItem;
import storebackend.repository.ProductRepository;
import storebackend.repository.SavedCartItemRepository;
import storebackend.repository.SavedCartRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SavedCartService {

    private final SavedCartRepository savedCartRepository;
    private final SavedCartItemRepository savedCartItemRepository;
    private final ProductRepository productRepository;

    @Transactional
    public SavedCartDTO saveCart(Long storeId, Long customerId, String name, String description,
                                  List<SavedCartItemDTO> items, Integer expirationDays) {
        SavedCart savedCart = new SavedCart();
        savedCart.setStoreId(storeId);
        savedCart.setCustomerId(customerId);
        savedCart.setName(name != null ? name : "Gespeicherter Warenkorb");
        savedCart.setDescription(description);
        savedCart.setCreatedAt(LocalDateTime.now());
        savedCart.setUpdatedAt(LocalDateTime.now());

        if (expirationDays != null && expirationDays > 0) {
            savedCart.setExpiresAt(LocalDateTime.now().plusDays(expirationDays));
        }

        SavedCart saved = savedCartRepository.save(savedCart);

        // Items hinzufügen
        if (items != null && !items.isEmpty()) {
            for (SavedCartItemDTO itemDTO : items) {
                SavedCartItem item = new SavedCartItem();
                item.setSavedCart(saved);
                item.setProductId(itemDTO.getProductId());
                item.setVariantId(itemDTO.getVariantId());
                item.setQuantity(itemDTO.getQuantity());
                item.setPriceSnapshot(itemDTO.getPriceSnapshot());
                item.setProductSnapshot(itemDTO.getProductSnapshot());
                item.setCreatedAt(LocalDateTime.now());
                savedCartItemRepository.save(item);
            }
        }

        return toDTO(saved);
    }

    public List<SavedCartDTO> getCustomerSavedCarts(Long storeId, Long customerId) {
        return savedCartRepository.findByStoreIdAndCustomerId(storeId, customerId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public SavedCartDTO getSavedCartById(Long savedCartId, Long customerId) {
        SavedCart savedCart = savedCartRepository.findById(savedCartId)
                .orElseThrow(() -> new RuntimeException("Gespeicherter Warenkorb nicht gefunden"));

        if (!savedCart.getCustomerId().equals(customerId)) {
            throw new RuntimeException("Keine Berechtigung für diesen Warenkorb");
        }

        return toDTO(savedCart);
    }

    @Transactional
    public void restoreCart(Long savedCartId, Long customerId) {
        SavedCart savedCart = savedCartRepository.findById(savedCartId)
                .orElseThrow(() -> new RuntimeException("Gespeicherter Warenkorb nicht gefunden"));

        if (!savedCart.getCustomerId().equals(customerId)) {
            throw new RuntimeException("Keine Berechtigung für diesen Warenkorb");
        }

        if (savedCart.getExpiresAt() != null && savedCart.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Dieser Warenkorb ist abgelaufen");
        }

        // Hier könnte man die Items in den aktuellen Warenkorb übertragen
        // Das hängt von der Cart-Implementierung ab
    }

    @Transactional
    public void deleteSavedCart(Long savedCartId, Long customerId) {
        SavedCart savedCart = savedCartRepository.findById(savedCartId)
                .orElseThrow(() -> new RuntimeException("Gespeicherter Warenkorb nicht gefunden"));

        if (!savedCart.getCustomerId().equals(customerId)) {
            throw new RuntimeException("Keine Berechtigung für diesen Warenkorb");
        }

        savedCartRepository.delete(savedCart);
    }

    @Transactional
    public int cleanupExpiredCarts() {
        return savedCartRepository.deleteExpiredCarts(LocalDateTime.now());
    }

    public long countSavedCarts(Long customerId) {
        return savedCartRepository.countByCustomerId(customerId);
    }

    private SavedCartDTO toDTO(SavedCart savedCart) {
        SavedCartDTO dto = new SavedCartDTO();
        dto.setId(savedCart.getId());
        dto.setStoreId(savedCart.getStoreId());
        dto.setCustomerId(savedCart.getCustomerId());
        dto.setName(savedCart.getName());
        dto.setDescription(savedCart.getDescription());
        dto.setExpiresAt(savedCart.getExpiresAt());
        dto.setCreatedAt(savedCart.getCreatedAt());
        dto.setUpdatedAt(savedCart.getUpdatedAt());

        List<SavedCartItemDTO> items = savedCartItemRepository.findBySavedCartId(savedCart.getId())
                .stream()
                .map(this::toItemDTO)
                .collect(Collectors.toList());

        dto.setItems(items);
        dto.setItemCount(items.size());

        BigDecimal totalAmount = items.stream()
                .map(item -> item.getPriceSnapshot().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        dto.setTotalAmount(totalAmount);

        boolean isExpired = savedCart.getExpiresAt() != null &&
                           savedCart.getExpiresAt().isBefore(LocalDateTime.now());
        dto.setIsExpired(isExpired);

        return dto;
    }

    private SavedCartItemDTO toItemDTO(SavedCartItem item) {
        SavedCartItemDTO dto = new SavedCartItemDTO();
        dto.setId(item.getId());
        dto.setSavedCartId(item.getSavedCart().getId());
        dto.setProductId(item.getProductId());
        dto.setVariantId(item.getVariantId());
        dto.setQuantity(item.getQuantity());
        dto.setPriceSnapshot(item.getPriceSnapshot());
        dto.setProductSnapshot(item.getProductSnapshot());
        dto.setCreatedAt(item.getCreatedAt());

        // Produkt-Infos laden
        productRepository.findById(item.getProductId()).ifPresent(product -> {
            dto.setProductTitle(product.getTitle());
            // dto.setProductImageUrl(product.getImageUrl());
        });

        return dto;
    }
}
