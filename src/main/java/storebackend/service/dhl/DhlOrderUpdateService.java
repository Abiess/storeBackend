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
        
        // Validierung: Response muss items haben
        if (response.getItems() == null || response.getItems().isEmpty()) {
            throw new IllegalStateException("DHL Response has no items!");
        }
        
        DhlShipmentResponse.ShipmentItem item = response.getItems().get(0);
        String shipmentNo = item.getShipmentNo();
        String routingCode = item.getRoutingCode();
        String uuid = item.getUuid();
        
        log.info("📦 DHL Shipment created: No={}, UUID={}, RoutingCode={}", 
            shipmentNo, uuid, routingCode);
        
        // 1. Base64 PDF → MinIO
        String labelUrl = null;
        if (item.getLabel() != null && item.getLabel().getB64() != null) {
            try {
                byte[] pdfBytes = Base64.getDecoder().decode(item.getLabel().getB64());
                String objectName = String.format("stores/%d/orders/%d/dhl-label.pdf", 
                    order.getStore().getId(), orderId);
                
                log.info("📤 Uploading DHL label to MinIO: {} ({} bytes)", objectName, pdfBytes.length);
                
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
                log.error("❌ Failed to upload DHL label to MinIO for order {}: {}", 
                    orderId, e.getMessage());
                // NICHT fatal - Order wird trotzdem mit Tracking aktualisiert
                // Aber wir sollten es im Frontend anzeigen
            }
        } else {
            log.warn("⚠️ No label.b64 in DHL response for order {}", orderId);
        }
        
        // 2. Order DHL-Felder aktualisieren
        order.setDhlShipmentNo(shipmentNo);
        order.setDhlRoutingCode(routingCode);
        order.setDhlUuid(uuid);
        order.setDhlStatus("CREATED");
        order.setDhlCreatedAt(java.time.LocalDateTime.now());
        order.setDhlLabelUrl(labelUrl);
        
        // 3. Order Tracking-Felder aktualisieren
        order.setTrackingNumber(shipmentNo);
        order.setTrackingCarrier("DHL");
        
        // DHL Tracking URL
        if (shipmentNo != null) {
            order.setTrackingUrl("https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=" 
                + shipmentNo);
        }
        
        // 4. Status auf SHIPPED setzen (Label erstellt = versendet)
        // NICHT auf PROCESSING - das wäre "in Bearbeitung"
        if (order.getStatus() == OrderStatus.PENDING || order.getStatus() == OrderStatus.PROCESSING) {
            order.setStatus(OrderStatus.SHIPPED);
            log.info("📮 Order {} status changed to SHIPPED", orderId);
        }
        
        // 5. Speichern
        orderRepository.save(order);
        
        log.info("✅ Order {} updated with DHL tracking: shipmentNo={}, labelUrl={}", 
            orderId, shipmentNo, labelUrl != null ? "uploaded" : "FAILED");
    }
}
