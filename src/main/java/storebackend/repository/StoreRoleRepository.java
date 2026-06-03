package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.StoreRole;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoreRoleRepository extends JpaRepository<StoreRole, Long> {

    List<StoreRole> findByStoreId(Long storeId);

    Optional<StoreRole> findByStoreIdAndUserId(Long storeId, Long userId);

    void deleteByStoreIdAndUserId(Long storeId, Long userId);

    boolean existsByStoreIdAndUserId(Long storeId, Long userId);
}

