package storebackend.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;
import storebackend.entity.Order;
import storebackend.enums.OrderStatus;

/**
 * Event wird ausgelöst wenn sich der Order-Status ändert
 */
@Getter
public class OrderStatusChangedEvent extends ApplicationEvent {
    private final Order order;
    private final OrderStatus oldStatus;
    private final OrderStatus newStatus;

    public OrderStatusChangedEvent(Object source, Order order, OrderStatus oldStatus, OrderStatus newStatus) {
        super(source);
        this.order = order;
        this.oldStatus = oldStatus;
        this.newStatus = newStatus;
    }
}

