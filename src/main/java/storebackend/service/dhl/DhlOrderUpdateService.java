package storebackend.service.dhl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.dhl.DhlShipmentResponse;
import storebackend.entity.Order;
import storebackend.enums.OrderStatus;
import storebackend.repository.OrderRepository;
import storebackend.service.MinioService;

import java.io.ByteArrayInputStream;
import java.util.Base64;

/**
 * DHL Order Update Service
 * Speichert DHL Label PDF in MinIO und aktualisiert Order-Tracking-Felder
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DhlOrderUpdateService {
    
    private final OrderRepository orderRepository;
    private final MinioService minioService;
    
    /**
     * Speichert DHL Label in MinIO und aktualisiert Order
     * 
     * @param order Die zu aktualisierende Order
     * @param response DHL API Response mit Label (Base64 PDF)
     */
    @Transactional
    public void saveLabelAndUpdateOrder(Order order, DhlShipmentResponse response) {
        Long orderId = order.getId();
        log.info("💾 Saving DHL label for order {}", orderId);
        
        // 1. Base64 PDF → MinIO
        String labelUrl = null;
        if (response.getLabel() != null && response.getLabel().getB64() != null) {
            try {
                byte[] pdfBytes = Base64.getDecoder().decode(response.getLabel().getB64());
                String objectName = String.format("stores/%d/orders/%d/dhl-label.pdf", 
                    order.getStore().getId(), orderId);
                
                // Upload zu MinIO
                try (ByteArrayInputStream inputStream = new ByteArrayInputStream(pdfBytes)) {
                    minioService.uploadInputStream(
                        inputStream, 
                        pdfBytes.length, 
                        "application/pdf", 
                        objectName
                    );
                }
                
                // Presigned URL generieren (7 Tage gültig)
                labelUrl = minioService.getPresignedUrl(objectName, 10080);
                log.info("✅ DHL label uploaded to MinIO: {}", objectName);
                
            } catch (Exception e) {
                log.error("❌ Failed to upload DHL label to MinIO for order {}", orderId, e);
                // Nicht fatal - Order wird trotzdem aktualisiert
            }
        }
        
        // 2. Order Tracking-Felder aktualisieren
        order.setDhlShipmentNo(response.getShipmentNo());
        order.setDhlLabelUrl(labelUrl);
        order.setTrackingNumber(response.getShipmentNo());
        order.setTrackingCarrier("DHL");
        
        // DHL Tracking URL (falls verfügbar)
        if (response.getShipmentNo() != null) {
            order.setTrackingUrl("https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=" 
                + response.getShipmentNo());
        }
        
        // Status auf PROCESSING setzen (wenn noch PENDING)
        if (order.getStatus() == OrderStatus.PENDING) {
            order.setStatus(OrderStatus.PROCESSING);
        }
        
        orderRepository.save(order);
        
        log.info("✅ Order {} updated with DHL tracking: {}", orderId, response.getShipmentNo());
    }
}
