package storebackend.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import storebackend.entity.Subscription;
import storebackend.entity.User;
import storebackend.repository.UserRepository;
import storebackend.service.EmailService;

import java.util.Optional;

/**
 * Reagiert auf Subscription-Events und sendet die passenden i18n-HTML-E-Mails.
 * Async damit der Listener Transaktionen / Scheduler nicht blockiert.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionEventListener {

    private final EmailService emailService;
    private final UserRepository userRepository;

    @Async
    @EventListener
    public void onRenewed(SubscriptionEvent.Renewed event) {
        Subscription s = event.getSubscription();
        loadUser(s).ifPresent(u -> emailService.sendSubscriptionRenewed(
            u.getEmail(),
            u.getName(),
            s.getPlan().name(),
            s.getAmount() != null ? s.getAmount().doubleValue() : 0.0,
            "EUR",
            s.getRenewalDate(),
            lang(u)
        ));
    }

    @Async
    @EventListener
    public void onExpired(SubscriptionEvent.Expired event) {
        Subscription s = event.getSubscription();
        loadUser(s).ifPresent(u -> emailService.sendSubscriptionExpired(
            u.getEmail(), u.getName(), s.getPlan().name(), lang(u)
        ));
    }

    @Async
    @EventListener
    public void onCancelled(SubscriptionEvent.Cancelled event) {
        Subscription s = event.getSubscription();
        loadUser(s).ifPresent(u -> emailService.sendSubscriptionCancelled(
            u.getEmail(), u.getName(), s.getPlan().name(), s.getEndDate(), lang(u)
        ));
    }

    @Async
    @EventListener
    public void onUpgraded(SubscriptionEvent.Upgraded event) {
        Subscription s = event.getSubscription();
        loadUser(s).ifPresent(u -> emailService.sendSubscriptionUpgraded(
            u.getEmail(), u.getName(),
            event.getPreviousPlan() != null ? event.getPreviousPlan().name() : "FREE",
            s.getPlan().name(),
            lang(u)
        ));
    }

    @Async
    @EventListener
    public void onReminderDue(SubscriptionEvent.ReminderDue event) {
        Subscription s = event.getSubscription();
        loadUser(s).ifPresent(u -> emailService.sendSubscriptionRenewalReminder(
            u.getEmail(),
            u.getName(),
            s.getPlan().name(),
            event.getDaysLeft(),
            s.getAmount() != null ? s.getAmount().doubleValue() : 0.0,
            "EUR",
            s.getRenewalDate(),
            lang(u)
        ));
    }

    @Async
    @EventListener
    public void onTrialStarted(SubscriptionEvent.TrialStarted event) {
        Subscription s = event.getSubscription();
        log.info("[SubscriptionEvent] Trial gestartet für User {} (Plan {}, endet {})",
                 s.getUserId(), s.getPlan(), s.getEndDate());
        // (Optional: separate Trial-Welcome-Mail – aktuell nicht eingebaut)
    }

    private Optional<User> loadUser(Subscription s) {
        if (s == null || s.getUserId() == null) return Optional.empty();
        return userRepository.findById(s.getUserId());
    }

    private String lang(User u) {
        return u.getPreferredLanguage() != null ? u.getPreferredLanguage() : "en";
    }
}

