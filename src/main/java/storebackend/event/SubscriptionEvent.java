package storebackend.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;
import storebackend.entity.Subscription;
import storebackend.enums.Plan;

/**
 * Basis-Event für Subscription-Lifecycle-Vorgänge.
 * Konkrete Events erben hiervon (Created, Renewed, Expired, Cancelled, Upgraded, ReminderDue).
 */
@Getter
public abstract class SubscriptionEvent extends ApplicationEvent {

    private final Subscription subscription;

    protected SubscriptionEvent(Object source, Subscription subscription) {
        super(source);
        this.subscription = subscription;
    }

    public static class Created extends SubscriptionEvent {
        public Created(Object source, Subscription s) { super(source, s); }
    }

    public static class Renewed extends SubscriptionEvent {
        public Renewed(Object source, Subscription s) { super(source, s); }
    }

    public static class Expired extends SubscriptionEvent {
        public Expired(Object source, Subscription s) { super(source, s); }
    }

    public static class Cancelled extends SubscriptionEvent {
        public Cancelled(Object source, Subscription s) { super(source, s); }
    }

    @Getter
    public static class Upgraded extends SubscriptionEvent {
        private final Plan previousPlan;
        public Upgraded(Object source, Subscription s, Plan previousPlan) {
            super(source, s);
            this.previousPlan = previousPlan;
        }
    }

    @Getter
    public static class ReminderDue extends SubscriptionEvent {
        private final long daysLeft;
        public ReminderDue(Object source, Subscription s, long daysLeft) {
            super(source, s);
            this.daysLeft = daysLeft;
        }
    }

    public static class TrialStarted extends SubscriptionEvent {
        public TrialStarted(Object source, Subscription s) { super(source, s); }
    }
}

