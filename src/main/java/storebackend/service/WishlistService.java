package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.WishlistDTO;
import storebackend.dto.WishlistItemDTO;
import storebackend.entity.Product;
import storebackend.entity.Wishlist;
import storebackend.entity.WishlistItem;
import storebackend.enums.WishlistPriority;
import storebackend.repository.ProductRepository;
import storebackend.repository.WishlistItemRepository;
import storebackend.repository.WishlistRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final WishlistItemRepository wishlistItemRepository;
    private final ProductRepository productRepository;

    @Transactional
    public WishlistDTO createWishlist(Long storeId, Long customerId, String name, String description) {
        Wishlist wishlist = new Wishlist();
        wishlist.setStoreId(storeId);
        wishlist.setCustomerId(customerId);
        wishlist.setName(name != null ? name : "Meine Wunschliste");
        wishlist.setDescription(description);
        wishlist.setIsDefault(false);
        wishlist.setIsPublic(false);
        wishlist.setCreatedAt(LocalDateTime.now());
        wishlist.setUpdatedAt(LocalDateTime.now());

        Wishlist saved = wishlistRepository.save(wishlist);
        return toDTO(saved);
    }

    @Transactional
    public WishlistDTO getOrCreateDefaultWishlist(Long storeId, Long customerId) {
        return wishlistRepository.findByStoreIdAndCustomerIdAndIsDefaultTrue(storeId, customerId)
                .map(this::toDTO)
                .orElseGet(() -> {
                    Wishlist wishlist = new Wishlist();
                    wishlist.setStoreId(storeId);
                    wishlist.setCustomerId(customerId);
                    wishlist.setName("Meine Wunschliste");
                    wishlist.setIsDefault(true);
                    wishlist.setIsPublic(false);
                    wishlist.setCreatedAt(LocalDateTime.now());
                    wishlist.setUpdatedAt(LocalDateTime.now());
                    return toDTO(wishlistRepository.save(wishlist));
                });
    }

    public List<WishlistDTO> getCustomerWishlists(Long storeId, Long customerId) {
        return wishlistRepository.findByStoreIdAndCustomerId(storeId, customerId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public WishlistDTO getWishlistById(Long wishlistId, Long customerId) {
        Wishlist wishlist = wishlistRepository.findById(wishlistId)
                .orElseThrow(() -> new RuntimeException("Wunschliste nicht gefunden"));

        if (!wishlist.getCustomerId().equals(customerId)) {
            throw new RuntimeException("Keine Berechtigung für diese Wunschliste");
        }

        return toDTO(wishlist);
    }

    public WishlistDTO getPublicWishlist(String shareToken) {
        Wishlist wishlist = wishlistRepository.findByShareToken(shareToken)
                .orElseThrow(() -> new RuntimeException("Wunschliste nicht gefunden"));

        if (!wishlist.getIsPublic()) {
            throw new RuntimeException("Diese Wunschliste ist nicht öffentlich");
        }

        return toDTO(wishlist);
    }

    @Transactional
    public WishlistItemDTO addToWishlist(Long wishlistId, Long customerId, Long productId, Long variantId,
                                         WishlistPriority priority, String note) {
        Wishlist wishlist = wishlistRepository.findById(wishlistId)
                .orElseThrow(() -> new RuntimeException("Wunschliste nicht gefunden"));

        if (!wishlist.getCustomerId().equals(customerId)) {
            throw new RuntimeException("Keine Berechtigung für diese Wunschliste");
        }

        // Prüfen ob Produkt existiert
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Produkt nicht gefunden"));

        // Prüfen ob bereits vorhanden
        boolean exists = wishlistItemRepository.existsByWishlistIdAndProductId(wishlistId, productId);
        if (exists) {
            throw new RuntimeException("Produkt ist bereits in der Wunschliste");
        }

        WishlistItem item = new WishlistItem();
        item.setWishlist(wishlist);
        item.setProductId(productId);
        item.setVariantId(variantId);
        item.setPriority(priority != null ? priority : WishlistPriority.MEDIUM);
        item.setNote(note);
        item.setAddedAt(LocalDateTime.now());

        WishlistItem saved = wishlistItemRepository.save(item);

        wishlist.setUpdatedAt(LocalDateTime.now());
        wishlistRepository.save(wishlist);

        return toItemDTO(saved, product);
    }

    @Transactional
    public void removeFromWishlist(Long wishlistId, Long customerId, Long itemId) {
        WishlistItem item = wishlistItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Wunschlisten-Item nicht gefunden"));

        if (!item.getWishlist().getCustomerId().equals(customerId)) {
            throw new RuntimeException("Keine Berechtigung");
        }

        if (!item.getWishlist().getId().equals(wishlistId)) {
            throw new RuntimeException("Item gehört nicht zu dieser Wunschliste");
        }

        wishlistItemRepository.delete(item);

        Wishlist wishlist = item.getWishlist();
        wishlist.setUpdatedAt(LocalDateTime.now());
        wishlistRepository.save(wishlist);
    }

    @Transactional
    public String shareWishlist(Long wishlistId, Long customerId, boolean makePublic) {
        Wishlist wishlist = wishlistRepository.findById(wishlistId)
                .orElseThrow(() -> new RuntimeException("Wunschliste nicht gefunden"));

        if (!wishlist.getCustomerId().equals(customerId)) {
            throw new RuntimeException("Keine Berechtigung für diese Wunschliste");
        }

        wishlist.setIsPublic(makePublic);

        if (makePublic && wishlist.getShareToken() == null) {
            wishlist.setShareToken(UUID.randomUUID().toString());
        }

        wishlist.setUpdatedAt(LocalDateTime.now());
        wishlistRepository.save(wishlist);

        return wishlist.getShareToken();
    }

    @Transactional
    public void deleteWishlist(Long wishlistId, Long customerId) {
        Wishlist wishlist = wishlistRepository.findById(wishlistId)
                .orElseThrow(() -> new RuntimeException("Wunschliste nicht gefunden"));

        if (!wishlist.getCustomerId().equals(customerId)) {
            throw new RuntimeException("Keine Berechtigung für diese Wunschliste");
        }

        if (wishlist.getIsDefault()) {
            throw new RuntimeException("Standard-Wunschliste kann nicht gelöscht werden");
        }

        wishlistRepository.delete(wishlist);
    }

    public long countWishlistItems(Long customerId) {
        return wishlistItemRepository.countByCustomerId(customerId);
    }

    private WishlistDTO toDTO(Wishlist wishlist) {
        WishlistDTO dto = new WishlistDTO();
        dto.setId(wishlist.getId());
        dto.setStoreId(wishlist.getStoreId());
        dto.setCustomerId(wishlist.getCustomerId());
        dto.setName(wishlist.getName());
        dto.setDescription(wishlist.getDescription());
        dto.setIsDefault(wishlist.getIsDefault());
        dto.setIsPublic(wishlist.getIsPublic());
        dto.setShareToken(wishlist.getShareToken());
        dto.setCreatedAt(wishlist.getCreatedAt());
        dto.setUpdatedAt(wishlist.getUpdatedAt());

        List<WishlistItemDTO> items = wishlistItemRepository.findByWishlistId(wishlist.getId())
                .stream()
                .map(item -> {
                    Product product = productRepository.findById(item.getProductId()).orElse(null);
                    return toItemDTO(item, product);
                })
                .collect(Collectors.toList());

        dto.setItems(items);
        dto.setItemCount(items.size());
        return dto;
    }

    private WishlistItemDTO toItemDTO(WishlistItem item, Product product) {
        WishlistItemDTO dto = new WishlistItemDTO();
        dto.setId(item.getId());
        dto.setWishlistId(item.getWishlist().getId());
        dto.setProductId(item.getProductId());
        dto.setVariantId(item.getVariantId());
        dto.setPriority(item.getPriority());
        dto.setNote(item.getNote());
        dto.setAddedAt(item.getAddedAt());

        if (product != null) {
            dto.setProductTitle(product.getTitle());
            dto.setProductPrice(product.getBasePrice().doubleValue());
            // Für imageUrl müssen wir prüfen, ob es ein Media-Feld gibt
            // dto.setProductImageUrl(product.getImageUrl());
            dto.setInStock(true); // Default, kann später erweitert werden
        }

        return dto;
    }
}
