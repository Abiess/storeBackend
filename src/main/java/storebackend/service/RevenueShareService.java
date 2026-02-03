package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.RevenueSplitDTO;
import storebackend.entity.Commission;
import storebackend.entity.Order;
import storebackend.entity.OrderItem;
import storebackend.repository.CommissionRepository;
import storebackend.repository.OrderItemRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Service for managing revenue sharing and commissions between suppliers, resellers, and platform.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class RevenueShareService {

    private final CommissionRepository commissionRepository;
    private final OrderItemRepository orderItemRepository;

    /**
     * Get revenue split breakdown for an order.
     */
    public List<RevenueSplitDTO> getOrderRevenueSplit(Order order) {
        List<RevenueSplitDTO> splits = new ArrayList<>();

        // Load order items from repository
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());

        for (OrderItem item : items) {
            BigDecimal customerPaid = item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));

            // Default percentages (can be customized per product/supplier)
            BigDecimal supplierPercentage = new BigDecimal("0.70"); // 70%
            BigDecimal resellerPercentage = new BigDecimal("0.20"); // 20%
            BigDecimal platformPercentage = new BigDecimal("0.10"); // 10%

            BigDecimal supplierAmount = customerPaid.multiply(supplierPercentage).setScale(2, RoundingMode.HALF_UP);
            BigDecimal resellerAmount = customerPaid.multiply(resellerPercentage).setScale(2, RoundingMode.HALF_UP);
            BigDecimal platformAmount = customerPaid.multiply(platformPercentage).setScale(2, RoundingMode.HALF_UP);

            RevenueSplitDTO split = new RevenueSplitDTO(
                item.getId(),
                item.getProductName(), // Use productName instead of getProduct().getName()
                customerPaid,
                supplierAmount,
                resellerAmount,
                platformAmount,
                supplierPercentage,
                resellerPercentage,
                platformPercentage
            );

            splits.add(split);
        }

        return splits;
    }

    /**
     * Get pending commissions for a supplier.
     */
    public BigDecimal getPendingCommissionsForSupplier(Long supplierId) {
        List<Commission> commissions = commissionRepository.findByRecipientTypeAndRecipientIdAndStatus("SUPPLIER", supplierId, "PENDING");
        return commissions.stream()
            .map(Commission::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Get pending commissions for a reseller (store).
     */
    public BigDecimal getPendingCommissionsForReseller(Long storeId) {
        List<Commission> commissions = commissionRepository.findByRecipientTypeAndRecipientIdAndStatus("RESELLER", storeId, "PENDING");
        return commissions.stream()
            .map(Commission::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Approve commissions for an order.
     */
    public void approveCommissionsForOrder(Order order) {
        List<Commission> commissions = commissionRepository.findByOrderId(order.getId());

        for (Commission commission : commissions) {
            commission.setStatus("APPROVED");
            commissionRepository.save(commission);
        }
    }

    /**
     * Create commissions for an order at checkout.
     * This calculates and persists commission records for suppliers, resellers, and platform.
     */
    public void createCommissionsForOrder(Order order) {
        List<RevenueSplitDTO> splits = getOrderRevenueSplit(order);
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());

        for (int i = 0; i < splits.size() && i < items.size(); i++) {
            RevenueSplitDTO split = splits.get(i);
            OrderItem item = items.get(i);

            // Create commission for supplier
            if (split.getSupplierAmount() != null && split.getSupplierAmount().compareTo(BigDecimal.ZERO) > 0) {
                Commission supplierCommission = new Commission();
                supplierCommission.setOrder(order);
                supplierCommission.setOrderItem(item);
                supplierCommission.setRecipientType("SUPPLIER");
                supplierCommission.setRecipientId(item.getSupplierId());
                supplierCommission.setAmount(split.getSupplierAmount());
                supplierCommission.setPercentage(split.getSupplierPercentage());
                supplierCommission.setStatus("PENDING");
                commissionRepository.save(supplierCommission);
            }

            // Create commission for reseller
            if (split.getResellerAmount() != null && split.getResellerAmount().compareTo(BigDecimal.ZERO) > 0) {
                Commission resellerCommission = new Commission();
                resellerCommission.setOrder(order);
                resellerCommission.setOrderItem(item);
                resellerCommission.setRecipientType("RESELLER");
                resellerCommission.setRecipientId(order.getStore().getId());
                resellerCommission.setAmount(split.getResellerAmount());
                resellerCommission.setPercentage(split.getResellerPercentage());
                resellerCommission.setStatus("PENDING");
                commissionRepository.save(resellerCommission);
            }

            // Create commission for platform
            if (split.getPlatformAmount() != null && split.getPlatformAmount().compareTo(BigDecimal.ZERO) > 0) {
                Commission platformCommission = new Commission();
                platformCommission.setOrder(order);
                platformCommission.setOrderItem(item);
                platformCommission.setRecipientType("PLATFORM");
                platformCommission.setRecipientId(null); // Platform has no specific recipient ID
                platformCommission.setAmount(split.getPlatformAmount());
                platformCommission.setPercentage(split.getPlatformPercentage());
                platformCommission.setStatus("PENDING");
                commissionRepository.save(platformCommission);
            }
        }
    }
}
