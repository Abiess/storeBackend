package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.Subscription;
import storebackend.enums.SubscriptionStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    Optional<Subscription> findByUserIdAndStatus(Long userId, SubscriptionStatus status);

    List<Subscription> findByUserId(Long userId);

    List<Subscription> findByStatus(SubscriptionStatus status);

    /** Subscriptions die fällig zur Verarbeitung sind (Renewal oder Expiry) */
    List<Subscription> findByStatusAndRenewalDateBefore(SubscriptionStatus status, LocalDateTime cutoff);

    /** Subscriptions die bald ablaufen (für Reminder-E-Mails) */
    List<Subscription> findByStatusAndAutoRenewAndRenewalDateBetween(
        SubscriptionStatus status, Boolean autoRenew, LocalDateTime from, LocalDateTime to
    );

    /** Trial-Subscriptions die ablaufen */
    List<Subscription> findByStatusAndEndDateBefore(SubscriptionStatus status, LocalDateTime cutoff);
}

