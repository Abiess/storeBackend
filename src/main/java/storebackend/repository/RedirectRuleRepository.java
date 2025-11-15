package storebackend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import storebackend.entity.RedirectRule;

import java.util.List;

@Repository
public interface RedirectRuleRepository extends JpaRepository<RedirectRule, Long> {

    // Find all active rules for a store, ordered by priority
    @Query("SELECT r FROM RedirectRule r WHERE r.storeId = :storeId AND r.isActive = true " +
           "AND (r.domainId IS NULL OR r.domainId = :domainId) ORDER BY r.priority ASC, r.id ASC")
    List<RedirectRule> findActiveRulesForStoreAndDomain(Long storeId, Long domainId);

    // Find all rules for management (with filtering)
    @Query("SELECT r FROM RedirectRule r WHERE r.storeId = :storeId " +
           "AND (:domainId IS NULL OR r.domainId IS NULL OR r.domainId = :domainId) " +
           "AND (:query IS NULL OR LOWER(r.sourcePath) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(r.targetUrl) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<RedirectRule> findByStoreIdAndFilters(Long storeId, Long domainId, String query, Pageable pageable);

    // Count rules for plan limits
    long countByStoreId(Long storeId);
}

