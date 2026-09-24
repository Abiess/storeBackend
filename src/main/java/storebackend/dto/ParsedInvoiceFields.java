package storebackend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record ParsedInvoiceFields(
    String supplierName,
    String invoiceNumber,
    LocalDate invoiceDate,
    LocalDate deliveryDate,
    BigDecimal netAmount,
    BigDecimal taxAmount,
    BigDecimal grossAmount,
    String currency,
    Map<String, Double> confidence,
    List<String> warnings
) {}
