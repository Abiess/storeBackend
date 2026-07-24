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
    // Muss Lieferscheinnummern ausschließen
    private static final Pattern[] INVOICE_NUMBER_PATTERNS = {
        Pattern.compile("Rechnung\\s*Nr\\.?\\s*:?\\s*([A-Z0-9/-]+)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Rechnungsnummer\\s*:?\\s*([A-Z0-9/-]+)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Invoice\\s*No\\.?\\s*:?\\s*([A-Z0-9/-]+)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Invoice\\s*Number\\s*:?\\s*([A-Z0-9/-]+)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Facture\\s*N°?\\s*:?\\s*([A-Z0-9/-]+)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("N°\\s*facture\\s*:?\\s*([A-Z0-9/-]+)", Pattern.CASE_INSENSITIVE),
        // Heuristik: Jahr/Nummer-Format in Kopfzeile (z.B. "2026/00442 60534 08/05/2026")
        Pattern.compile("\\b(20\\d{2}/\\d{4,8})\\b")
    };
    
    // Lieferscheinnummer-Ausschluss
    private static final Pattern DELIVERY_NOTE_PATTERN = Pattern.compile(
        "Lieferschein|Delivery\\s*[Nn]ote|Bon\\s*de\\s*livraison",
        Pattern.CASE_INSENSITIVE
    );

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
        Pattern.compile("Netto(?:betrag)?\\s*:?\\s*([0-9.,]+)\\s*[€£$]?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?:^|\\s)Net\\s*:?\\s*([0-9.,]+)\\s*[€£$]?", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE),
        Pattern.compile("Subtotal\\s*:?\\s*([0-9.,]+)\\s*[€£$]?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Sous-total\\s*:?\\s*([0-9.,]+)\\s*[€£$]?", Pattern.CASE_INSENSITIVE)
    };

    private static final Pattern[] TAX_AMOUNT_PATTERNS = {
        Pattern.compile("MwSt\\.?\\s*(?:BETRAG|Betrag)?\\s*(?:\\([^)]+\\))?\\s*:?\\s*([0-9.,]+)\\s*[€£$]?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("USt\\.?\\s*(?:BETRAG|Betrag)?\\s*(?:\\([^)]+\\))?\\s*:?\\s*([0-9.,]+)\\s*[€£$]?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Umsatzsteuer\\s*(?:BETRAG|Betrag)?\\s*:?\\s*([0-9.,]+)\\s*[€£$]?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("VAT\\s*(?:AMOUNT)?\\s*(?:\\([^)]+\\))?\\s*:?\\s*([0-9.,]+)\\s*[€£$]?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("TVA\\s*(?:MONTANT)?\\s*(?:\\([^)]+\\))?\\s*:?\\s*([0-9.,]+)\\s*[€£$]?", Pattern.CASE_INSENSITIVE)
    };

    private static final Pattern[] GROSS_AMOUNT_PATTERNS = {
        Pattern.compile("ENDBETRAG\\s*:?\\s*([0-9.,]+)\\s*[€£$]?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Gesamt(?:betrag)?\\s*:?\\s*([0-9.,]+)\\s*[€£$]?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Total\\s+TTC\\s*:?\\s*([0-9.,]+)\\s*[€£$]?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Saldo\\s+zu\\s+bezahlen\\s*:?\\s*([0-9.,]+)\\s*[€£$]?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?:^|\\s)Total\\s*:?\\s*([0-9.,]+)\\s*[€£$]?", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE)
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
        String invoiceNumber = parseInvoiceNumber(rawText, confidence, warnings);
        LocalDate invoiceDate = parseInvoiceDate(rawText, confidence, warnings);
        LocalDate deliveryDate = parseDate(rawText, DELIVERY_DATE_PATTERNS, confidence, "deliveryDate");
        BigDecimal netAmount = parseAmount(rawText, NET_AMOUNT_PATTERNS, confidence, "netAmount");
        BigDecimal grossAmount = parseAmount(rawText, GROSS_AMOUNT_PATTERNS, confidence, "grossAmount");
        BigDecimal taxAmount = parseTaxAmount(rawText, netAmount, grossAmount, confidence, warnings);
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
            int dotPos = amountStr.indexOf('.');
            int commaPos = amountStr.indexOf(',');
            
            // Beide vorhanden: Prüfe Reihenfolge
            if (dotPos != -1 && commaPos != -1) {
                if (dotPos < commaPos) {
                    // Deutsches Format: 1.693,81
                    return new BigDecimal(amountStr.replace(".", "").replace(",", "."));
                } else {
                    // Englisches Format: 1,693.81
                    return new BigDecimal(amountStr.replace(",", ""));
                }
            }
            
            // Nur Komma: Prüfe Position
            if (commaPos != -1) {
                // Wenn mehr als 2 Ziffern nach Komma ODER Komma ist nicht 3 Stellen vom Ende
                int digitsAfterComma = amountStr.length() - commaPos - 1;
                if (digitsAfterComma != 2 && digitsAfterComma != 3) {
                    // Wahrscheinlich Tausendertrennzeichen: 1,543 → 1543
                    return new BigDecimal(amountStr.replace(",", ""));
                }
                // Standard: Komma als Dezimaltrenner: 1543,40 → 1543.40
                return new BigDecimal(amountStr.replace(",", "."));
            }
            
            // Nur Punkt oder nichts
            return new BigDecimal(amountStr.replace(",", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String parseSupplierName(String text, Map<String, Double> confidence, List<String> warnings) {
        String[] lines = text.split("\n");
        
        // Sammle alle Firmenkandidaten mit Bewertung
        List<SupplierCandidate> candidates = new ArrayList<>();
        
        for (int i = 0; i < Math.min(30, lines.length); i++) {
            String line = lines[i].trim();
            if (line.length() < 5) continue;
            
            Matcher matcher = COMPANY_PATTERN.matcher(line);
            if (matcher.matches()) {
                double score = evaluateSupplierCandidate(line, text);
                candidates.add(new SupplierCandidate(line, score));
            }
        }
        
        // Sortiere nach Score und wähle besten
        if (!candidates.isEmpty()) {
            candidates.sort((a, b) -> Double.compare(b.score, a.score));
            SupplierCandidate best = candidates.get(0);
            
            // Mindestanforderung: score > 0.5
            if (best.score > 0.5) {
                confidence.put("supplierName", 0.9);
                return best.name;
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
    
    private double evaluateSupplierCandidate(String line, String fullText) {
        double score = 1.0;
        
        // Zähle Buchstaben pro Wort (ohne Rechtsform)
        String withoutSuffix = line.replaceAll("(?i)(GmbH|UG|AG|SARL|SA|Ltd\\.|Limited|Inc\\.|Corp\\.).*", "").trim();
        String[] words = withoutSuffix.split("\\s+");
        
        if (words.length == 0 || withoutSuffix.isEmpty()) return 0.1; // Keine Wörter = sehr niedrig
        if (words.length < 2) score *= 0.3; // Zu kurz
        
        // Durchschnittliche Wortlänge
        double avgWordLength = 0;
        for (String word : words) {
            avgWordLength += word.replaceAll("[^a-zA-Z]", "").length();
        }
        avgWordLength /= words.length;
        
        if (avgWordLength < 2) score *= 0.2; // Zerstörte Wörter wie "R wm oe"
        if (avgWordLength >= 4) score *= 1.5; // Vollständige Wörter
        
        // Häufigkeit im Text (mehrfach = vertrauenswürdiger)
        if (withoutSuffix.length() > 0) {
            int occurrences = (fullText.length() - fullText.replace(withoutSuffix, "").length()) / withoutSuffix.length();
            if (occurrences > 1) score *= 1.3;
        }
        
        return Math.min(score, 2.0);
    }
    
    private static class SupplierCandidate {
        String name;
        double score;
        SupplierCandidate(String name, double score) {
            this.name = name;
            this.score = score;
        }
    }
    
    // Spezielle Rechnungsnummer-Erkennung mit Lieferschein-Ausschluss
    private String parseInvoiceNumber(String text, Map<String, Double> confidence, List<String> warnings) {
        String[] lines = text.split("\n");
        
        // Sammle alle Nummern-Kandidaten
        List<InvoiceNumberCandidate> candidates = new ArrayList<>();
        
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            String prevLine = i > 0 ? lines[i - 1] : "";
            String combinedContext = prevLine + " " + line;
            
            // Prüfe auf Lieferschein-Kontext
            if (DELIVERY_NOTE_PATTERN.matcher(combinedContext).find()) {
                continue; // Überspringe diese Zeile
            }
            
            // Versuche alle Patterns
            for (int p = 0; p < INVOICE_NUMBER_PATTERNS.length; p++) {
                Matcher matcher = INVOICE_NUMBER_PATTERNS[p].matcher(line);
                while (matcher.find()) {
                    String number = matcher.group(1).trim();
                    double score = 1.0;
                    
                    // Heuristisches Pattern hat niedrigere Konfidenz
                    if (p == INVOICE_NUMBER_PATTERNS.length - 1) {
                        score = 0.7;
                        
                        // Bonus wenn Kundennummer und Datum in derselben Zeile
                        if (line.matches(".*\\d{5,}.*\\d{2}/\\d{2}/\\d{4}.*")) {
                            score = 0.95; // Sehr wahrscheinlich Rechnungskopfzeile
                        }
                    }
                    
                    candidates.add(new InvoiceNumberCandidate(number, score));
                }
            }
        }
        
        // Wähle Kandidaten mit höchstem Score
        if (!candidates.isEmpty()) {
            candidates.sort((a, b) -> Double.compare(b.score, a.score));
            InvoiceNumberCandidate best = candidates.get(0);
            confidence.put("invoiceNumber", best.score);
            return best.number;
        }
        
        confidence.put("invoiceNumber", 0.0);
        return null;
    }
    
    private static class InvoiceNumberCandidate {
        String number;
        double score;
        InvoiceNumberCandidate(String number, double score) {
            this.number = number;
            this.score = score;
        }
    }
    
    // Rechnungsdatum darf nicht aus Lieferdatum übernommen werden
    private LocalDate parseInvoiceDate(String text, Map<String, Double> confidence, List<String> warnings) {
        String[] lines = text.split("\n");
        
        // Suche explizite Rechnungsdatum-Labels
        for (Pattern pattern : INVOICE_DATE_PATTERNS) {
            Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                String dateStr = matcher.group(1).trim();
                LocalDate date = tryParseDate(dateStr);
                if (date != null) {
                    confidence.put("invoiceDate", 1.0);
                    return date;
                }
            }
        }
        
        // Suche Datum in Rechnungskopfzeile (mit Rechnungsnummer + Kundennummer)
        for (String line : lines) {
            if (line.matches(".*20\\d{2}/\\d{4,8}.*\\d{5,}.*\\d{2}/\\d{2}/\\d{4}.*")) {
                // Zeile enthält: Rechnungsnummer, Kundennummer, Datum
                Pattern datePattern = Pattern.compile("(\\d{2}/\\d{2}/\\d{4})");
                Matcher matcher = datePattern.matcher(line);
                if (matcher.find()) {
                    String dateStr = matcher.group(1);
                    LocalDate date = tryParseDate(dateStr);
                    if (date != null) {
                        confidence.put("invoiceDate", 0.9);
                        return date;
                    }
                }
            }
        }
        
        confidence.put("invoiceDate", 0.0);
        return null;
    }
    
    // MwSt. mit Plausibilitätsprüfung
    private BigDecimal parseTaxAmount(String text, BigDecimal netAmount, BigDecimal grossAmount, 
                                       Map<String, Double> confidence, List<String> warnings) {
        // Sammle alle MwSt.-Kandidaten
        List<TaxCandidate> candidates = new ArrayList<>();
        
        String[] lines = text.split("\n");
        for (String line : lines) {
            for (Pattern pattern : TAX_AMOUNT_PATTERNS) {
                Matcher matcher = pattern.matcher(line);
                if (matcher.find()) {
                    String amountStr = matcher.group(1).trim();
                    BigDecimal amount = parseAmountString(amountStr);
                    
                    if (amount != null) {
                        double score = 1.0;
                        
                        // Prüfe auf Tabellenüberschrift-Artefakt (z.B. "MwSt.Betrag 34 Art.")
                        if (line.matches(".*(?:Art\\.?|Kolli|Spalte).*")) {
                            score = 0.1; // Sehr niedrig
                        }
                        
                        // Bevorzuge Zeilen mit Doppelpunkt und Währung
                        if (line.contains(":") && line.matches(".*[€£$].*")) {
                            score = 1.2;
                        }
                        
                        candidates.add(new TaxCandidate(amount, score));
                    }
                }
            }
        }
        
        // Plausibilitätsprüfung mit Netto/Gesamt
        if (netAmount != null && grossAmount != null) {
            BigDecimal calculatedTax = grossAmount.subtract(netAmount);
            
            // Suche Kandidaten nahe dem berechneten Wert
            for (TaxCandidate candidate : candidates) {
                BigDecimal diff = candidate.amount.subtract(calculatedTax).abs();
                if (diff.compareTo(new BigDecimal("0.02")) <= 0) {
                    // Perfekte Übereinstimmung
                    confidence.put("taxAmount", 1.0);
                    return candidate.amount;
                }
            }
            
            // Wenn beste Kandidat unplausibel ist, verwende berechneten Wert
            if (!candidates.isEmpty()) {
                candidates.sort((a, b) -> Double.compare(b.score, a.score));
                TaxCandidate best = candidates.get(0);
                
                BigDecimal diff = best.amount.subtract(calculatedTax).abs();
                if (diff.compareTo(new BigDecimal("10.00")) > 0) {
                    // Zu große Differenz - verwende berechneten Wert
                    confidence.put("taxAmount", 0.8);
                    warnings.add("MwSt. aus Gesamt minus Netto abgeleitet");
                    return calculatedTax;
                } else {
                    confidence.put("taxAmount", best.score);
                    return best.amount;
                }
            }
        }
        
        // Fallback: Bester Kandidat ohne Plausibilitätsprüfung
        if (!candidates.isEmpty()) {
            candidates.sort((a, b) -> Double.compare(b.score, a.score));
            TaxCandidate best = candidates.get(0);
            confidence.put("taxAmount", best.score);
            return best.amount;
        }
        
        confidence.put("taxAmount", 0.0);
        return null;
    }
    
    private static class TaxCandidate {
        BigDecimal amount;
        double score;
        TaxCandidate(BigDecimal amount, double score) {
            this.amount = amount;
            this.score = score;
        }
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
