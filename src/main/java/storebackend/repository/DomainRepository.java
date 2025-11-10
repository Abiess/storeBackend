package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.Domain;
import storebackend.entity.Store;

import java.util.List;
import java.util.Optional;

@Repository
public interface DomainRepository extends JpaRepository<Domain, Long> {
    List<Domain> findByStore(Store store);
    Optional<Domain> findByHost(String host);
    boolean existsByHost(String host);
    long countByStore(Store store);
}

