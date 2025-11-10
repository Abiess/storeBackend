package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.Domain;
import storebackend.entity.Store;
import storebackend.enums.DomainType;

import java.util.List;
import java.util.Optional;

@Repository
public interface DomainRepository extends JpaRepository<Domain, Long> {
    List<Domain> findByStore(Store store);
    Optional<Domain> findByHost(String host);
    boolean existsByHost(String host);
    long countByStore(Store store);

    // Multi-Tenant spezifische Methoden
    Optional<Domain> findByHostAndIsVerified(String host, Boolean isVerified);
    List<Domain> findByStoreAndType(Store store, DomainType type);
    Optional<Domain> findByStoreAndIsPrimary(Store store, Boolean isPrimary);
    long countByStoreAndType(Store store, DomainType type);
    Optional<Domain> findByVerificationToken(String verificationToken);

    @Query("SELECT d FROM Domain d WHERE d.store.status = 'ACTIVE' AND d.isVerified = true AND d.host = :host")
    Optional<Domain> findActiveVerifiedDomainByHost(@Param("host") String host);

    @Query("SELECT d FROM Domain d JOIN d.store s WHERE s.slug = :slug AND d.type = 'SUBDOMAIN' AND d.isVerified = true")
    Optional<Domain> findVerifiedSubdomainBySlug(@Param("slug") String slug);
}
