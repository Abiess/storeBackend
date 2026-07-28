package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.stereotype.Service;
import storebackend.entity.Order;
import storebackend.entity.OrderItem;
import storebackend.repository.OrderRepository;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Service für die Erzeugung von Lieferschein-PDFs
 * 
 * Verwendet Apache PDFBox (bereits im Projekt vorhanden)
 * Erzeugt PDFs on-the-fly aus Order + OrderItem Snapshots
 * 
 * MVP-Scope:
 * - Keine Preise
 * - Nur Order-Snapshots (keine Live-Produktdaten)
 * - Einfaches Layout
 * - Deutsche Sprache
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeliveryNoteService {

    private final OrderRepository orderRepository;
    
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final float MARGIN = 50;
    private static final float FONT_SIZE = 10;
    private static final float HEADING_SIZE = 14;
    private static final float TITLE_SIZE = 18;

    /**
     * Erzeugt ein Lieferschein-PDF für eine Bestellung
     * 
     * @param orderId Order ID
     * @param storeId Store ID (für Security-Prüfung bereits im Controller)
     * @return PDF als byte[]
     * @throws IllegalArgumentException wenn Order nicht gefunden
     * @throws IOException bei PDF-Erzeugungsfehler
     */
    public byte[] generateDeliveryNotePdf(Long orderId, Long storeId) throws IOException {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        
        // Security: Sicherstellen dass Order zu Store gehört
        if (!order.getStore().getId().equals(storeId)) {
            throw new IllegalArgumentException("Order does not belong to store");
        }
        
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            
            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                float yPosition = page.getMediaBox().getHeight() - MARGIN;
                
                // Titel
                yPosition = drawTitle(contentStream, yPosition);
                
                // Bestellinformationen
                yPosition = drawOrderInfo(contentStream, order, yPosition);
                
                // Lieferadresse
                yPosition = drawShippingAddress(contentStream, order, yPosition);
                
                // Lieferpositionen
                yPosition = drawLineItems(contentStream, order, yPosition, page);
            }
            
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        }
    }
    
    private float drawTitle(PDPageContentStream contentStream, float yPosition) throws IOException {
        contentStream.beginText();
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, TITLE_SIZE);
        contentStream.newLineAtOffset(MARGIN, yPosition);
        contentStream.showText("LIEFERSCHEIN");
        contentStream.endText();
        return yPosition - 40;
    }
    
    private float drawOrderInfo(PDPageContentStream contentStream, Order order, float yPosition) throws IOException {
        contentStream.setFont(PDType1Font.HELVETICA, FONT_SIZE);
        
        yPosition = drawLine(contentStream, "Bestellnummer:", order.getOrderNumber(), yPosition);
        yPosition = drawLine(contentStream, "Bestelldatum:", 
                order.getCreatedAt().format(DATE_FORMATTER), yPosition);
        
        if (order.getCustomerReference() != null && !order.getCustomerReference().isBlank()) {
            yPosition = drawLine(contentStream, "Kundenreferenz:", order.getCustomerReference(), yPosition);
        }
        
        return yPosition - 10;
    }
    
    private float drawShippingAddress(PDPageContentStream contentStream, Order order, float yPosition) throws IOException {
        contentStream.beginText();
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, HEADING_SIZE);
        contentStream.newLineAtOffset(MARGIN, yPosition);
        contentStream.showText("Lieferadresse");
        contentStream.endText();
        yPosition -= 20;
        
        contentStream.setFont(PDType1Font.HELVETICA, FONT_SIZE);
        
        var address = order.getShippingAddress();
        if (address != null) {
            if (address.getCompany() != null && !address.getCompany().isBlank()) {
                yPosition = drawText(contentStream, address.getCompany(), yPosition);
            }
            if (address.getFirstName() != null || address.getLastName() != null) {
                String name = (address.getFirstName() != null ? address.getFirstName() : "") + " " +
                              (address.getLastName() != null ? address.getLastName() : "");
                yPosition = drawText(contentStream, name.trim(), yPosition);
            }
            if (address.getAddress1() != null) {
                yPosition = drawText(contentStream, address.getAddress1(), yPosition);
            }
            if (address.getAddress2() != null && !address.getAddress2().isBlank()) {
                yPosition = drawText(contentStream, address.getAddress2(), yPosition);
            }
            if (address.getPostalCode() != null || address.getCity() != null) {
                String cityLine = (address.getPostalCode() != null ? address.getPostalCode() : "") + " " +
                                  (address.getCity() != null ? address.getCity() : "");
                yPosition = drawText(contentStream, cityLine.trim(), yPosition);
            }
            if (address.getCountry() != null) {
                yPosition = drawText(contentStream, address.getCountry(), yPosition);
            }
            if (address.getPhone() != null && !address.getPhone().isBlank()) {
                yPosition = drawText(contentStream, "Tel: " + address.getPhone(), yPosition);
            }
        }
        
        return yPosition - 20;
    }
    
    private float drawLineItems(PDPageContentStream contentStream, Order order, float yPosition, PDPage page) throws IOException {
        contentStream.beginText();
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, HEADING_SIZE);
        contentStream.newLineAtOffset(MARGIN, yPosition);
        contentStream.showText("Artikel");
        contentStream.endText();
        yPosition -= 20;
        
        // Header
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, FONT_SIZE);
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN, yPosition);
        contentStream.showText("Artikel");
        contentStream.endText();
        
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN + 250, yPosition);
        contentStream.showText("SKU");
        contentStream.endText();
        
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN + 350, yPosition);
        contentStream.showText("Variante");
        contentStream.endText();
        
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN + 460, yPosition);
        contentStream.showText("Menge");
        contentStream.endText();
        
        yPosition -= 15;
        
        // Line
        contentStream.moveTo(MARGIN, yPosition);
        contentStream.lineTo(page.getMediaBox().getWidth() - MARGIN, yPosition);
        contentStream.stroke();
        yPosition -= 10;
        
        // Items
        contentStream.setFont(PDType1Font.HELVETICA, FONT_SIZE);
        List<OrderItem> items = order.getOrderItems();
        
        for (OrderItem item : items) {
            // Check if we need a new page
            if (yPosition < MARGIN + 50) {
                // Note: Pagination wird in diesem MVP nicht unterstützt
                // Bei sehr vielen Positionen werden diese abgeschnitten
                // Erweiterung folgt bei Bedarf
                break;
            }
            
            String productName = item.getName() != null ? item.getName() : "";
            if (productName.length() > 35) {
                productName = productName.substring(0, 32) + "...";
            }
            
            contentStream.beginText();
            contentStream.newLineAtOffset(MARGIN, yPosition);
            contentStream.showText(productName);
            contentStream.endText();
            
            contentStream.beginText();
            contentStream.newLineAtOffset(MARGIN + 250, yPosition);
            contentStream.showText(item.getSku() != null ? item.getSku() : "-");
            contentStream.endText();
            
            contentStream.beginText();
            contentStream.newLineAtOffset(MARGIN + 350, yPosition);
            String variant = item.getVariantTitle() != null ? item.getVariantTitle() : "-";
            if (variant.length() > 15) {
                variant = variant.substring(0, 12) + "...";
            }
            contentStream.showText(variant);
            contentStream.endText();
            
            contentStream.beginText();
            contentStream.newLineAtOffset(MARGIN + 460, yPosition);
            contentStream.showText(String.valueOf(item.getQuantity()));
            contentStream.endText();
            
            yPosition -= 15;
        }
        
        // Notes (als Lieferhinweis)
        if (order.getNotes() != null && !order.getNotes().isBlank()) {
            yPosition -= 20;
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, FONT_SIZE);
            contentStream.newLineAtOffset(MARGIN, yPosition);
            contentStream.showText("Hinweise:");
            contentStream.endText();
            yPosition -= 15;
            
            contentStream.setFont(PDType1Font.HELVETICA, FONT_SIZE);
            yPosition = drawText(contentStream, order.getNotes(), yPosition);
        }
        
        return yPosition;
    }
    
    private float drawLine(PDPageContentStream contentStream, String label, String value, float yPosition) throws IOException {
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN, yPosition);
        contentStream.showText(label + " " + value);
        contentStream.endText();
        return yPosition - 15;
    }
    
    private float drawText(PDPageContentStream contentStream, String text, float yPosition) throws IOException {
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN, yPosition);
        contentStream.showText(text);
        contentStream.endText();
        return yPosition - 15;
    }
}
