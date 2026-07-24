package storebackend.service;

import org.springframework.stereotype.Service;
import storebackend.dto.ParsedInvoiceFields;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class InvoiceFieldParser {

    // Rechnungsnummer - mehrsprachige Labels
    private static final Pattern[] INVOICE_NUMBER_PATTERNS = {
        Pattern.compile("Rechnung\\s*Nr\\.?\\s*:?\\s*([A-Z0-9/-]+)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Rechnungsnummer\\s*:?\\s*([A-Z0-9/-]+)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Invoice\\s*No\\.?\\s*:?\\s*([A-Z0-9/-]+)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Invoice\\s*Number\\s*:?\\s*([A-Z0-9/-]+)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Facture\\s*N°?\\s*:?\\s*([A-Z0-9/-]+)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("N°\\s*facture\\s*:?\\s*([A-Z0-9/-]+)", Pattern.CASE_INSENSITIVE)
    };

    // Rechnungsdatum - mehrsprachige Labels
    private static final Pattern[] INVOICE_DATE_PATTERNS = {
        Pattern.compile("Rechnungsdatum\\s*:?\\s*([0-9]{1,2}[./\\-][0-9]{1,2}[./\\-][0-9]{2,4})", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Datum\\s*:?\\s*([0-9]{1,2}[./\\-][0-9]{1,2}[./\\-][0-9]{2,4})", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Invoice\\s*Date\\s*:?\\s*([0-9]{1,2}[./\\-][0-9]{1,2}[./\\-][0-9]{2,4})", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Date\\s*de\\s*facture\\s*:?\\s*([0-9]{1,2}[./\\-][0-9]{1,2}[./\\-][0-9]{2,4})", Pattern.CASE_INSENSITIVE)
    };

    // Lieferdatum - mehrsprachige Labels
    private static final Pattern[] DELIVERY_DATE_PATTERNS = {
        Pattern.compile("Lieferdatum\\s*:?\\s*([0-9]{1,2}[./\\-][0-9]{1,2}[./\\-][0-9]{2,4})", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Leistungsdatum\\s*:?\\s*([0-9]{1,2}[./\\-][0-9]{1,2}[./\\-][0-9]{2,4})", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Delivery\\s*Date\\s*:?\\s*([0-9]{1,2}[./\\-][0-9]{1,2}[./\\-][0-9]{2,4})", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Date\\s*de\\s*livraison\\s*:?\\s*([0-9]{1,2}[./\\-][0-9]{1,2}[./\\-][0-9]{2,4})", Pattern.CASE_INSENSITIVE)
    };

    // Betragsfelder - mehrsprachige Labels
    private static final Pattern[] NET_AMOUNT_PATTERNS = {
        Pattern.compile("Netto\\s*:?\\s*([0-9.,]+)\\s*€?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Nettobetrag\\s*:?\\s*([0-9.,]+)\\s*€?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Subtotal\\s*:?\\s*([0-9.,]+)\\s*€?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Sous-total\\s*:?\\s*([0-9.,]+)\\s*€?", Pattern.CASE_INSENSITIVE)
    };

    private static final Pattern[] TAX_AMOUNT_PATTERNS = {
        Pattern.compile("MwSt\\.?\\s*(?:\\([^)]+\\))?\\s*:?\\s*([0-9.,]+)\\s*€?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("USt\\.?\\s*(?:\\([^)]+\\))?\\s*:?\\s*([0-9.,]+)\\s*€?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("VAT\\s*(?:\\([^)]+\\))?\\s*:?\\s*([0-9.,]+)\\s*€?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("TVA\\s*(?:\\([^)]+\\))?\\s*:?\\s*([0-9.,]+)\\s*€?", Pattern.CASE_INSENSITIVE)
    };

    private static final Pattern[] GROSS_AMOUNT_PATTERNS = {
        Pattern.compile("Gesamt\\s*:?\\s*([0-9.,]+)\\s*€?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Gesamtbetrag\\s*:?\\s*([0-9.,]+)\\s*€?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Total\\s*:?\\s*([0-9.,]+)\\s*€?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Total\\s*TTC\\s*:?\\s*([0-9.,]+)\\s*€?", Pattern.CASE_INSENSITIVE)
    };

    // Datumsformate
    private static final DateTimeFormatter[] DATE_FORMATTERS = {
        DateTimeFormatter.ofPattern("dd.MM.yyyy"),
        DateTimeFormatter.ofPattern("dd/MM/yyyy"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd"),
        DateTimeFormatter.ofPattern("dd.MM.yy"),
        DateTimeFormatter.ofPattern("dd/MM/yy"),
        DateTimeFormatter.ofPattern("MM/dd/yyyy") // US format
    };

    // Firmenkennzeichnungen
    private static final Pattern COMPANY_PATTERN = Pattern.compile(
        ".*(GmbH|UG|AG|SARL|SA|Ltd\\.|Limited|Inc\\.|Corp\\.).*",
        Pattern.CASE_INSENSITIVE
    );

    public ParsedInvoiceFields parse(String rawText) {
        if (rawText == null || rawText.trim().isEmpty()) {
            return createEmptyResult(List.of("Raw text ist leer"));
        }

        Map<String, Double> confidence = new HashMap<>();
        List<String> warnings = new ArrayList<>();

        // Parse Felder
        String supplierName = parseSupplierName(rawText, confidence, warnings);
        String invoiceNumber = parseField(rawText, INVOICE_NUMBER_PATTERNS, confidence, "invoiceNumber");
        LocalDate invoiceDate = parseDate(rawText, INVOICE_DATE_PATTERNS, confidence, "invoiceDate");
        LocalDate deliveryDate = parseDate(rawText, DELIVERY_DATE_PATTERNS, confidence, "deliveryDate");
        BigDecimal netAmount = parseAmount(rawText, NET_AMOUNT_PATTERNS, confidence, "netAmount");
        BigDecimal taxAmount = parseAmount(rawText, TAX_AMOUNT_PATTERNS, confidence, "taxAmount");
        BigDecimal grossAmount = parseAmount(rawText, GROSS_AMOUNT_PATTERNS, confidence, "grossAmount");
        String currency = parseCurrency(rawText, confidence);

        // Plausibilitätsprüfung
        validateAmounts(netAmount, taxAmount, grossAmount, warnings);

        // Fehlende Felder prüfen
        if (invoiceNumber == null) warnings.add("Rechnungsnummer nicht erkannt");
        if (supplierName == null) warnings.add("Lieferant nicht erkannt oder unsicher");
        if (invoiceDate == null) warnings.add("Rechnungsdatum nicht erkannt");
        if (grossAmount == null) warnings.add("Gesamtbetrag nicht erkannt");

        return new ParsedInvoiceFields(
            supplierName,
            invoiceNumber,
            invoiceDate,
            deliveryDate,
            netAmount,
            taxAmount,
            grossAmount,
            currency,
            confidence,
            warnings
        );
    }

    private String parseField(String text, Pattern[] patterns, Map<String, Double> confidence, String fieldName) {
        for (Pattern pattern : patterns) {
            Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                String value = matcher.group(1).trim();
                confidence.put(fieldName, 1.0);
                return value;
            }
        }
        confidence.put(fieldName, 0.0);
        return null;
    }

    private LocalDate parseDate(String text, Pattern[] patterns, Map<String, Double> confidence, String fieldName) {
        for (Pattern pattern : patterns) {
            Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                String dateStr = matcher.group(1).trim();
                LocalDate date = tryParseDate(dateStr);
                if (date != null) {
                    confidence.put(fieldName, 1.0);
                    return date;
                }
            }
        }
        confidence.put(fieldName, 0.0);
        return null;
    }

    private LocalDate tryParseDate(String dateStr) {
        for (DateTimeFormatter formatter : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(dateStr, formatter);
            } catch (DateTimeParseException e) {
                // Nächstes Format versuchen
            }
        }
        return null;
    }

    private BigDecimal parseAmount(String text, Pattern[] patterns, Map<String, Double> confidence, String fieldName) {
        for (Pattern pattern : patterns) {
            Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                String amountStr = matcher.group(1).trim();
                BigDecimal amount = parseAmountString(amountStr);
                if (amount != null) {
                    confidence.put(fieldName, 1.0);
                    return amount;
                }
            }
        }
        confidence.put(fieldName, 0.0);
        return null;
    }

    private BigDecimal parseAmountString(String amountStr) {
        try {
            // Deutsches Format: 1.693,81 oder 1693,81
            if (amountStr.contains(",")) {
                String normalized = amountStr.replace(".", "").replace(",", ".");
                return new BigDecimal(normalized);
            }
            // Englisches Format: 1,693.81 oder 1693.81
            else {
                String normalized = amountStr.replace(",", "");
                return new BigDecimal(normalized);
            }
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String parseSupplierName(String text, Map<String, Double> confidence, List<String> warnings) {
        String[] lines = text.split("\n");
        
        // Suche nach Firmenkennzeichnung in ersten 10 Zeilen
        for (int i = 0; i < Math.min(10, lines.length); i++) {
            String line = lines[i].trim();
            if (line.length() < 3) continue;
            
            Matcher matcher = COMPANY_PATTERN.matcher(line);
            if (matcher.matches()) {
                confidence.put("supplierName", 0.9);
                return line;
            }
        }

        // Heuristik: Erste nicht-leere Zeile mit min. 5 Zeichen
        for (int i = 0; i < Math.min(5, lines.length); i++) {
            String line = lines[i].trim();
            if (line.length() >= 5 && !line.matches("^[0-9./-]+$")) {
                confidence.put("supplierName", 0.5);
                warnings.add("Lieferant heuristisch ermittelt, bitte prüfen");
                return line;
            }
        }

        confidence.put("supplierName", 0.0);
        return null;
    }

    private String parseCurrency(String text, Map<String, Double> confidence) {
        if (text.contains("€") || text.toLowerCase().contains("eur")) {
            confidence.put("currency", 1.0);
            return "EUR";
        }
        if (text.contains("$") || text.toLowerCase().contains("usd")) {
            confidence.put("currency", 1.0);
            return "USD";
        }
        if (text.contains("£") || text.toLowerCase().contains("gbp")) {
            confidence.put("currency", 1.0);
            return "GBP";
        }
        confidence.put("currency", 0.5);
        return "EUR"; // Default
    }

    private void validateAmounts(BigDecimal net, BigDecimal tax, BigDecimal gross, List<String> warnings) {
        if (net != null && tax != null && gross != null) {
            BigDecimal calculated = net.add(tax);
            BigDecimal diff = gross.subtract(calculated).abs();
            
            // Toleranz: 0,02 €
            if (diff.compareTo(new BigDecimal("0.02")) > 0) {
                warnings.add("Rechnerische Prüfung: Netto + MwSt. ≠ Gesamt (Differenz: " + diff + " €)");
            }
        }

        if (gross != null && net != null && gross.compareTo(net) < 0) {
            warnings.add("Gesamtbetrag ist kleiner als Nettobetrag");
        }
    }

    private ParsedInvoiceFields createEmptyResult(List<String> warnings) {
        Map<String, Double> confidence = new HashMap<>();
        confidence.put("supplierName", 0.0);
        confidence.put("invoiceNumber", 0.0);
        confidence.put("invoiceDate", 0.0);
        confidence.put("deliveryDate", 0.0);
        confidence.put("netAmount", 0.0);
        confidence.put("taxAmount", 0.0);
        confidence.put("grossAmount", 0.0);
        confidence.put("currency", 0.0);

        return new ParsedInvoiceFields(
            null, null, null, null, null, null, null, null,
            confidence, new ArrayList<>(warnings)
        );
    }
}
