package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.StoreUsageDTO;
import storebackend.entity.Plan;
import storebackend.entity.Store;
import storebackend.entity.StoreUsage;
import storebackend.entity.User;
import storebackend.repository.StoreUsageRepository;

@Service
@RequiredArgsConstructor
@Slf4j
public class StoreUsageService {

    private final StoreUsageRepository storeUsageRepository;

    /**
     * Create initial StoreUsage for a new Store
     */
    @Transactional
    public StoreUsage createStoreUsage(Store store) {
        StoreUsage usage = new StoreUsage();
        usage.setStore(store);
        usage.setStorageBytes(0L);
        usage.setImageCount(0);
        usage.setProductCount(0);
        return storeUsageRepository.save(usage);
    }

    /**
     * Get or create StoreUsage
     */
    @Transactional
    public StoreUsage getOrCreateStoreUsage(Store store) {
        return storeUsageRepository.findByStore(store)
                .orElseGet(() -> createStoreUsage(store));
    }

    /**
     * Increment storage usage
     */
    @Transactional
    public void incrementStorage(Store store, long bytes) {
        StoreUsage usage = getOrCreateStoreUsage(store);
        usage.setStorageBytes(usage.getStorageBytes() + bytes);
        storeUsageRepository.save(usage);
        log.info("Incremented storage for store {} by {} bytes", store.getId(), bytes);
    }

    /**
     * Decrement storage usage
     */
    @Transactional
    public void decrementStorage(Store store, long bytes) {
        StoreUsage usage = getOrCreateStoreUsage(store);
        usage.setStorageBytes(Math.max(0, usage.getStorageBytes() - bytes));
        storeUsageRepository.save(usage);
        log.info("Decremented storage for store {} by {} bytes", store.getId(), bytes);
    }

    /**
     * Increment image count
     */
    @Transactional
    public void incrementImageCount(Store store) {
        StoreUsage usage = getOrCreateStoreUsage(store);
        usage.setImageCount(usage.getImageCount() + 1);
        storeUsageRepository.save(usage);
        log.info("Incremented image count for store {}", store.getId());
    }

    /**
     * Decrement image count
     */
    @Transactional
    public void decrementImageCount(Store store) {
        StoreUsage usage = getOrCreateStoreUsage(store);
        usage.setImageCount(Math.max(0, usage.getImageCount() - 1));
        storeUsageRepository.save(usage);
        log.info("Decremented image count for store {}", store.getId());
    }

    /**
     * Increment product count
     */
    @Transactional
    public void incrementProductCount(Store store) {
        StoreUsage usage = getOrCreateStoreUsage(store);
        usage.setProductCount(usage.getProductCount() + 1);
        storeUsageRepository.save(usage);
        log.info("Incremented product count for store {}", store.getId());
    }

    /**
     * Decrement product count
     */
    @Transactional
    public void decrementProductCount(Store store) {
        StoreUsage usage = getOrCreateStoreUsage(store);
        usage.setProductCount(Math.max(0, usage.getProductCount() - 1));
        storeUsageRepository.save(usage);
        log.info("Decremented product count for store {}", store.getId());
    }

    /**
     * Check if store can upload more images
     */
    public boolean canUploadImage(Store store, User owner) {
        StoreUsage usage = getOrCreateStoreUsage(store);
        Plan plan = owner.getPlan();

        // Default: FREE plan limits if no plan assigned
        if (plan == null) {
            log.warn("User {} has no plan assigned, using FREE plan limits", owner.getId());
            return usage.getImageCount() < 100; // FREE plan default
        }

        if (plan.getMaxImageCount() == -1) {
            return true; // Unlimited
        }

        return usage.getImageCount() < plan.getMaxImageCount();
    }

    /**
     * Check if store has enough storage
     */
    public boolean hasEnoughStorage(Store store, User owner, long requiredBytes) {
        StoreUsage usage = getOrCreateStoreUsage(store);
        Plan plan = owner.getPlan();

        // Default: FREE plan limits if no plan assigned
        if (plan == null) {
            log.warn("User {} has no plan assigned, using FREE plan limits", owner.getId());
            long maxBytes = 100 * 1024L * 1024L; // 100 MB default
            return (usage.getStorageBytes() + requiredBytes) <= maxBytes;
        }

        if (plan.getMaxStorageMb() == -1) {
            return true; // Unlimited
        }

        long maxBytes = plan.getMaxStorageMb() * 1024L * 1024L;
        return (usage.getStorageBytes() + requiredBytes) <= maxBytes;
    }

    /**
     * Check if store can create more products
     */
    public boolean canCreateProduct(Store store, User owner) {
        StoreUsage usage = getOrCreateStoreUsage(store);
        Plan plan = owner.getPlan();

        // Default: FREE plan limits if no plan assigned
        if (plan == null) {
            log.warn("User {} has no plan assigned, using FREE plan limits", owner.getId());
            return usage.getProductCount() < 50; // FREE plan default
        }

        if (plan.getMaxProducts() == -1) {
            return true; // Unlimited
        }

        return usage.getProductCount() < plan.getMaxProducts();
    }

    /**
     * Get store usage as DTO
     */
    public StoreUsageDTO getStoreUsageDTO(Store store, User owner) {
        StoreUsage usage = getOrCreateStoreUsage(store);
        Plan plan = owner.getPlan();

        StoreUsageDTO dto = new StoreUsageDTO();
        dto.setId(usage.getId());
        dto.setStoreId(store.getId());
        dto.setStorageBytes(usage.getStorageBytes());
        dto.setStorageMb(usage.getStorageBytes() / (1024L * 1024L));
        dto.setImageCount(usage.getImageCount());
        dto.setProductCount(usage.getProductCount());

        // Default: FREE plan limits if no plan assigned
        if (plan == null) {
            log.warn("User {} has no plan assigned, using FREE plan limits", owner.getId());
            dto.setMaxStorageMb(100L);
            dto.setMaxImageCount(100);
            dto.setMaxProducts(50);
        } else {
            dto.setMaxStorageMb((long) plan.getMaxStorageMb());
            dto.setMaxImageCount(plan.getMaxImageCount());
            dto.setMaxProducts(plan.getMaxProducts());
        }

        // Calculate usage percentages
        if (dto.getMaxStorageMb() > 0) {
            long maxBytes = dto.getMaxStorageMb() * 1024L * 1024L;
            dto.setStorageUsagePercent((double) usage.getStorageBytes() / maxBytes * 100);
        }

        if (dto.getMaxImageCount() > 0) {
            dto.setImageUsagePercent((double) usage.getImageCount() / dto.getMaxImageCount() * 100);
        }

        if (dto.getMaxProducts() > 0) {
            dto.setProductUsagePercent((double) usage.getProductCount() / dto.getMaxProducts() * 100);
        }

        return dto;
    }
}
