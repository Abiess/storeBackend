package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.Store;
import storebackend.entity.User;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoreRepository extends JpaRepository<Store, Long> {
    List<Store> findByOwner(User owner);
    Optional<Store> findBySlug(String slug);
    boolean existsBySlug(String slug);
    long countByOwner(User owner);
}

