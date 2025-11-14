package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.Subscription;
import storebackend.enums.SubscriptionStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    Optional<Subscription> findByUserIdAndStatus(Long userId, SubscriptionStatus status);

    List<Subscription> findByUserId(Long userId);

    List<Subscription> findByStatus(SubscriptionStatus status);
}

