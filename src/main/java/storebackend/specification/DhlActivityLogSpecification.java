package storebackend.specification;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;
import storebackend.entity.DhlActivityLog;
import storebackend.enums.DhlActivityAction;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * JPA Specifications für DhlActivityLog
 * 
 * Phase 3A.3 Fix - Dynamic Query Building
 * 
 * Vermeidet PostgreSQL nullable parameter typing issues bei:
 * (:param IS NULL OR field = :param)
 * 
 * Stattdessen: Nur aktive Filter werden als Predicate hinzugefügt
 * 
 * MULTI-TENANT SECURITY:
 * - storeId ist IMMER mandatory
 * - buildSpecification() wirft Exception wenn storeId null
 */
public class DhlActivityLogSpecification {
    
    /**
     * Baut dynamische Specification basierend auf aktiven Filtern
     * 
     * @param storeId Store ID (REQUIRED, wirft Exception wenn null)
     * @param action Optional: Action-Filter
     * @param userId Optional: User-Filter
     * @param fromDate Optional: Zeitraum-Filter (createdAt >= fromDate)
     * @return Specification mit allen aktiven Filtern
     */
    public static Specification<DhlActivityLog> buildSpecification(
        Long storeId,
        DhlActivityAction action,
        Long userId,
        LocalDateTime fromDate
    ) {
        return (Root<DhlActivityLog> root, CriteriaQuery<?> query, CriteriaBuilder cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            // 1. MANDATORY: storeId (Multi-Tenant Security)
            if (storeId == null) {
                throw new IllegalArgumentException("storeId is required for Activity Log queries");
            }
            predicates.add(cb.equal(root.get("storeId"), storeId));
            
            // 2. OPTIONAL: action
            if (action != null) {
                predicates.add(cb.equal(root.get("action"), action));
            }
            
            // 3. OPTIONAL: userId
            if (userId != null) {
                predicates.add(cb.equal(root.get("userId"), userId));
            }
            
            // 4. OPTIONAL: fromDate (createdAt >= fromDate)
            if (fromDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), fromDate));
            }
            
            // 5. Sortierung: createdAt DESC
            query.orderBy(cb.desc(root.get("createdAt")));
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
    
    /**
     * Convenience-Methode: Nur storeId (alle Aktivitäten)
     */
    public static Specification<DhlActivityLog> byStoreId(Long storeId) {
        return buildSpecification(storeId, null, null, null);
    }
    
    /**
     * Convenience-Methode: storeId + action
     */
    public static Specification<DhlActivityLog> byStoreIdAndAction(Long storeId, DhlActivityAction action) {
        return buildSpecification(storeId, action, null, null);
    }
    
    /**
     * Convenience-Methode: storeId + userId
     */
    public static Specification<DhlActivityLog> byStoreIdAndUser(Long storeId, Long userId) {
        return buildSpecification(storeId, null, userId, null);
    }
    
    /**
     * Convenience-Methode: storeId + today (fromDate = start of today)
     */
    public static Specification<DhlActivityLog> byStoreIdAndToday(Long storeId, LocalDateTime startOfToday) {
        return buildSpecification(storeId, null, null, startOfToday);
    }
}
