package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.CustomerProfile;
import storebackend.entity.User;

import java.util.Optional;

@Repository
public interface CustomerProfileRepository extends JpaRepository<CustomerProfile, Long> {
    Optional<CustomerProfile> findByUser(User user);
    Optional<CustomerProfile> findByUserId(Long userId);
    Optional<CustomerProfile> findByUserIdAndStoreId(Long userId, Long storeId);
    Optional<CustomerProfile> findByStoreIdAndExternalSourceAndExternalId(Long storeId, String externalSource, String externalId);
}

