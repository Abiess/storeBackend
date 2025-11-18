package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Query("SELECT s FROM Store s JOIN FETCH s.owner WHERE s.id = :id")
    Optional<Store> findByIdWithOwner(@Param("id") Long id);

    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM Store s WHERE s.id = :storeId AND s.owner.id = :userId")
    boolean isStoreOwnedByUser(@Param("storeId") Long storeId, @Param("userId") Long userId);
}
