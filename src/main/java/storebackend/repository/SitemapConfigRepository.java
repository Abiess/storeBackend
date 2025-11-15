package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.SitemapConfig;

import java.util.Optional;

@Repository
public interface SitemapConfigRepository extends JpaRepository<SitemapConfig, Long> {

    Optional<SitemapConfig> findByStoreIdAndDomainId(Long storeId, Long domainId);

    Optional<SitemapConfig> findByStoreIdAndDomainIdIsNull(Long storeId);
}

