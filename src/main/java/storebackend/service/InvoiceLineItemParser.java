package storebackend.service;

import org.springframework.stereotype.Service;
import storebackend.dto.ParsedInvoiceLine;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Phase 3B-1: Extract invoice line items from OCR text.
 * 
 * Pipeline:
 * 1. Detect table region (start/end markers)
 * 2. Extract position blocks (position number + article number)
 * 3. Parse columns from right to left
 * 4. Validate plausibility
 */
@Service
public class InvoiceLineItemParser {
    
    // Strategy A: Standard format with position number
    private static final Pattern POSITION_START_PATTERN = Pattern.compile(
        "^(\\d{1,3})\\s+(\\d{3,6})\\s+(.+)$"
    );
    
    // Strategy B: Marzouk fallback - line starting with article number (no position number)
    private static final Pattern MARZOUK_LINE_PATTERN = Pattern.compile(
        "^(\\d{5,8})\\s+(.+)$"
    );
    
    private static final Set<String> TABLE_START_MARKERS = Set.of(
        "pos", "a-nr", "artikel", "beschreibung", "menge", "einheit", 
        "vpe", "e-preis", "gpreis", "mwst", "kolli", "preis", "betrag"
    );
    
    private static final Set<String> TABLE_END_MARKERS = Set.of(
        "nettobetrag", "gesamtbetrag", "brutto", "saldo", "endbetrag",
        "kolli/stk", "summe", "zwischensumme"
    );
    
    private static final Set<String> KNOWN_UNITS = Set.of(
        "kolli", "kilo", "stück", "stk", "kg", "liter", "l", "g", "ml"
    );
    
    // Page break and document metadata patterns to filter
    private static final Pattern PAGE_MARKER_PATTERN = Pattern.compile(
        "(?i)^\\s*(" +
        "fortsetzung(\\s+(auf\\s+)?nächster\\s+seite|(\\s+lieferschein|\\s+rechnung)\\s+\\d+)?|" +
        "seite\\s*\\d+\\s*/\\s*\\d+|" +
        "lieferschein\\s+\\d+|" +
        "rechnung\\s+\\d+|" +
        "mit\\s+camscanner\\s+gescannt" +
        ")\\s*$"
    );
    
    private final boolean debug;
    private String parserStrategy = "UNKNOWN";
    
    public InvoiceLineItemParser() {
        this.debug = true; // TEMPORARILY ENABLED FOR PRODUCTION DEBUG
    }
    
    /**
     * Parse from multi-page text (preferred).
     */
    public List<ParsedInvoiceLine> parse(List<String> textPerPage) {
        if (textPerPage == null || textPerPage.isEmpty()) {
            return List.of();
        }
        
        String combinedText = String.join("\n--- PAGE BREAK ---\n", textPerPage);
        return parse(combinedText);
    }
    
    /**
     * Parse from raw text.
     */
    public List<ParsedInvoiceLine> parse(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            return List.of();
        }
        
        if (debug) System.out.println("Starting line item parsing...");
        
        // Step 1: Normalize and split into lines
        List<String> lines = normalizeText(rawText);
        
        // Step 2: Find table region
        TableRegion region = detectTableRegion(lines);
        if (region == null) {
            if (debug) System.out.println("No table region detected");
            return List.of();
        }
        
        if (debug) System.out.println("Table region: lines " + region.startLine + "-" + region.endLine);
        
        // Step 3: Extract table lines (excluding headers on continuation pages)
        List<String> tableLines = extractTableLines(lines, region);
        
        // Step 4: Build position blocks
        List<PositionBlock> blocks = buildPositionBlocks(tableLines);
        
        if (debug) {
            System.out.println("===== PARSER DEBUG FOR MARZOUK =====");
            System.out.println("Strategy: " + parserStrategy);
            System.out.println("Built " + blocks.size() + " position blocks");
            System.out.println("Table lines count: " + tableLines.size());
            System.out.println("First 5 table lines:");
            for (int i = 0; i < Math.min(5, tableLines.size()); i++) {
                System.out.println("  [" + i + "] " + tableLines.get(i));
            }
        }
        
        // Step 5: Parse each block
        List<ParsedInvoiceLine> result = blocks.stream()
            .map(this::parseBlock)
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
        
        if (debug) System.out.println("Parsed " + result.size() + " invoice lines");
        
        return result;
    }
    
    /**
     * Normalize text: trim, lowercase for matching.
     * Filter out page markers and document metadata.
     */
    private List<String> normalizeText(String rawText) {
        return Arrays.stream(rawText.split("\\r?\\n"))
            .map(String::trim)
            .filter(line -> !line.isEmpty())
            .filter(line -> !line.equals("--- PAGE BREAK ---"))
            .filter(line -> !isPageMarker(line))
            .collect(Collectors.toList());
    }
    
    /**
     * Check if line is a page marker or document metadata.
     */
    private boolean isPageMarker(String line) {
        return PAGE_MARKER_PATTERN.matcher(line).matches();
    }
    
    /**
     * Detect table start and end.
     */
    private TableRegion detectTableRegion(List<String> lines) {
        Integer startLine = null;
        Integer endLine = null;
        
        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i).toLowerCase();
            
            // Start: line contains table header keywords
            if (startLine == null) {
                long headerCount = TABLE_START_MARKERS.stream()
                    .filter(line::contains)
                    .count();
                
                if (headerCount >= 3) {
                    startLine = i + 1; // Start after header
                    if (debug) System.out.println("Table starts at line " + startLine);
                }
            }
            
            // End: line contains sum/total keywords
            if (startLine != null && endLine == null) {
                boolean isEnd = TABLE_END_MARKERS.stream()
                    .anyMatch(marker -> line.contains(marker) || line.startsWith(marker));
                
                if (isEnd) {
                    endLine = i;
                    if (debug) System.out.println("Table ends at line " + endLine);
                    break;
                }
            }
        }
        
        if (startLine == null || endLine == null || startLine >= endLine) {
            return null;
        }
        
        return new TableRegion(startLine, endLine);
    }
    
    /**
     * Extract table lines, skip repeated headers on continuation pages.
     * Also filter out page markers.
     */
    private List<String> extractTableLines(List<String> lines, TableRegion region) {
        List<String> result = new ArrayList<>();
        
        for (int i = region.startLine; i < region.endLine && i < lines.size(); i++) {
            String line = lines.get(i);
            String lower = line.toLowerCase();
            
            // Skip page markers
            if (isPageMarker(line)) {
                if (debug) System.out.println("Skipping page marker at line " + i + ": " + line);
                continue;
            }
            
            // Skip repeated table header
            long headerCount = TABLE_START_MARKERS.stream()
                .filter(lower::contains)
                .count();
            
            if (headerCount >= 3) {
                if (debug) System.out.println("Skipping repeated header at line " + i);
                continue;
            }
            
            result.add(line);
        }
        
        return result;
    }
    
    /**
     * Build position blocks: group lines by position number.
     * Strategy A: Standard format with position number (1 234567 Description...)
     * Strategy B: Marzouk fallback - lines starting with article number only (234567 Description...)
     * Filter out page markers from continuation lines.
     */
    private List<PositionBlock> buildPositionBlocks(List<String> lines) {
        List<PositionBlock> blocks = new ArrayList<>();
        PositionBlock currentBlock = null;
        int autoPositionNumber = 1;
        boolean useMarzoukStrategy = false;
        
        // First pass: Try Strategy A
        for (String line : lines) {
            Matcher matcher = POSITION_START_PATTERN.matcher(line);
            
            if (matcher.matches()) {
                // Strategy A match found
                if (currentBlock != null) {
                    blocks.add(currentBlock);
                }
                
                currentBlock = new PositionBlock();
                currentBlock.positionNumber = Integer.parseInt(matcher.group(1));
                currentBlock.supplierArticleNumber = matcher.group(2);
                currentBlock.lines.add(matcher.group(3).trim());
            } else if (currentBlock != null && !isPageMarker(line)) {
                // Continuation line
                currentBlock.lines.add(line.trim());
            }
        }
        
        if (currentBlock != null) {
            blocks.add(currentBlock);
        }
        
        // If Strategy A found nothing, try Strategy B (Marzouk fallback)
        if (blocks.isEmpty()) {
            if (debug) System.out.println("Strategy A failed, trying Strategy B (Marzouk fallback)...");
            useMarzoukStrategy = true;
            parserStrategy = "STRATEGY_B_MARZOUK_FALLBACK";
            
            currentBlock = null;
            for (String line : lines) {
                Matcher matcher = MARZOUK_LINE_PATTERN.matcher(line);
                
                if (matcher.matches()) {
                    // Marzouk format: article number followed by description
                    if (currentBlock != null) {
                        blocks.add(currentBlock);
                    }
                    
                    currentBlock = new PositionBlock();
                    currentBlock.positionNumber = autoPositionNumber++;
                    currentBlock.supplierArticleNumber = matcher.group(1);
                    currentBlock.lines.add(matcher.group(2).trim());
                    
                    if (debug) System.out.println("  Marzouk line detected: pos=" + currentBlock.positionNumber + 
                                                " art=" + currentBlock.supplierArticleNumber +
                                                " desc=" + matcher.group(2).substring(0, Math.min(30, matcher.group(2).length())));
                } else if (currentBlock != null && !isPageMarker(line)) {
                    // Continuation line
                    currentBlock.lines.add(line.trim());
                }
            }
            
            if (currentBlock != null) {
                blocks.add(currentBlock);
            }
        } else {
            parserStrategy = "STRATEGY_A_STANDARD";
        }
        
        return blocks;
    }
    
    /**
     * Parse a position block into ParsedInvoiceLine.
     * Tolerant mode: Accept lines even if not all numeric values are present.
     * Set REVIEW_REQUIRED status and add warnings instead of discarding.
     */
    private ParsedInvoiceLine parseBlock(PositionBlock block) {
        try {
            String combinedText = String.join(" ", block.lines);
            List<String> warnings = new ArrayList<>();
            
            // Parse from right to left
            String[] tokens = combinedText.split("\\s+");
            
            // Extract discount (rightmost, optional)
            BigDecimal discount = extractDiscount(tokens);
            
            // Extract tax rate (7 or 19)
            BigDecimal taxRate = extractTaxRate(tokens);
            
            // Extract line total (GPreis)
            BigDecimal lineTotal = extractAmount(tokens);
            
            // Extract unit price (E-Preis)
            BigDecimal unitPrice = extractAmount(tokens);
            
            // Extract packaging unit (VPE)
            BigDecimal packagingUnit = extractPackagingUnit(tokens);
            
            // Extract unit (Kolli, Kilo, etc.)
            String unit = extractUnit(tokens);
            if (unit != null && !KNOWN_UNITS.contains(unit.toLowerCase())) {
                warnings.add("Unknown unit: " + unit);
            }
            
            // Extract quantity
            BigDecimal quantity = extractQuantity(tokens);
            
            // Remaining tokens = description
            String description = String.join(" ", tokens).trim();
            if (description.isEmpty()) {
                description = combinedText; // Fallback: use original text
            }
            
            // Plausibility check
            double confidence = 0.9;
            
            // Check if critical numeric fields are missing
            int missingFields = 0;
            if (quantity == null) missingFields++;
            if (unitPrice == null) missingFields++;
            if (lineTotal == null) missingFields++;
            
            if (missingFields > 0) {
                warnings.add("Missing " + missingFields + " numeric field(s) - marked for review");
                confidence = 0.5;
            }
            
            // If we have all values, validate calculation
            if (quantity != null && packagingUnit != null && unitPrice != null && lineTotal != null) {
                BigDecimal calculated = quantity
                    .multiply(packagingUnit)
                    .multiply(unitPrice)
                    .setScale(2, RoundingMode.HALF_UP);
                
                BigDecimal difference = lineTotal.subtract(calculated).abs();
                
                if (difference.compareTo(new BigDecimal("0.03")) > 0) {
                    warnings.add(String.format(
                        "Line total mismatch: expected %.2f, got %.2f (diff: %.2f)",
                        calculated, lineTotal, difference
                    ));
                    confidence = 0.7;
                }
            }
            
            // CHANGED: Return line even if fields are missing (don't return null)
            ParsedInvoiceLine line = new ParsedInvoiceLine(
                block.positionNumber,
                block.supplierArticleNumber,
                description,
                quantity,
                unit,
                packagingUnit,
                unitPrice,
                lineTotal,
                taxRate,
                discount,
                confidence,
                combinedText,
                warnings
            );
            
            if (debug && !warnings.isEmpty()) {
                System.out.println("  Position " + block.positionNumber + " warnings: " + warnings);
            }
            
            return line;
            
        } catch (Exception e) {
            if (debug) System.out.println("Failed to parse block " + block.positionNumber + ": " + e.getMessage());
            
            // CHANGED: Return partial line instead of null
            try {
                String combinedText = String.join(" ", block.lines);
                return new ParsedInvoiceLine(
                    block.positionNumber,
                    block.supplierArticleNumber,
                    combinedText,
                    null, null, null, null, null, null, null,
                    0.3,
                    combinedText,
                    List.of("Parse error: " + e.getMessage())
                );
            } catch (Exception ex) {
                return null; // Last resort
            }
        }
    }
    
    /**
     * Extract and remove discount from tokens (rightmost).
     */
    private BigDecimal extractDiscount(String[] tokens) {
        if (tokens.length == 0) return BigDecimal.ZERO;
        
        String last = tokens[tokens.length - 1];
        if (last.matches("\\d{1,2}")) {
            int value = Integer.parseInt(last);
            if (value >= 0 && value <= 50) { // Reasonable discount range
                tokens[tokens.length - 1] = ""; // Remove
                return new BigDecimal(value);
            }
        }
        
        return BigDecimal.ZERO;
    }
    
    /**
     * Extract tax rate (7 or 19).
     */
    private BigDecimal extractTaxRate(String[] tokens) {
        for (int i = tokens.length - 1; i >= 0; i--) {
            String token = tokens[i];
            if (token.equals("7") || token.equals("19")) {
                tokens[i] = ""; // Remove
                return new BigDecimal(token);
            }
        }
        return null;
    }
    
    /**
     * Extract and parse German decimal amount (1,89 or 1.234,56).
     */
    private BigDecimal extractAmount(String[] tokens) {
        for (int i = tokens.length - 1; i >= 0; i--) {
            String token = tokens[i];
            
            // Match German decimal: 1,89 or 1.234,56
            if (token.matches("\\d{1,3}(\\.\\d{3})*,\\d{2}")) {
                tokens[i] = ""; // Remove
                String normalized = token.replace(".", "").replace(",", ".");
                return new BigDecimal(normalized);
            }
        }
        return null;
    }
    
    /**
     * Extract packaging unit (VPE) - integer or decimal.
     */
    private BigDecimal extractPackagingUnit(String[] tokens) {
        for (int i = tokens.length - 1; i >= 0; i--) {
            String token = tokens[i];
            
            // VPE is typically 6, 8, 12, 14, etc. (small integer)
            if (token.matches("\\d{1,3}")) {
                int value = Integer.parseInt(token);
                if (value >= 1 && value <= 100) {
                    tokens[i] = ""; // Remove
                    return new BigDecimal(value);
                }
            }
        }
        return null;
    }
    
    /**
     * Extract unit (Kolli, Kilo, etc.).
     */
    private String extractUnit(String[] tokens) {
        for (int i = tokens.length - 1; i >= 0; i--) {
            String token = tokens[i].toLowerCase();
            
            if (KNOWN_UNITS.contains(token)) {
                String unit = tokens[i];
                tokens[i] = ""; // Remove
                return unit;
            }
        }
        return null;
    }
    
    /**
     * Extract quantity.
     */
    private BigDecimal extractQuantity(String[] tokens) {
        for (int i = tokens.length - 1; i >= 0; i--) {
            String token = tokens[i];
            
            // Quantity: 1, 2, 3, 4, etc. or 2,5 (with comma)
            if (token.matches("\\d{1,4}(,\\d{1,3})?")) {
                tokens[i] = ""; // Remove
                String normalized = token.replace(",", ".");
                return new BigDecimal(normalized);
            }
        }
        return null;
    }
    
    /**
     * Table region boundaries.
     */
    private static class TableRegion {
        int startLine;
        int endLine;
        
        TableRegion(int startLine, int endLine) {
            this.startLine = startLine;
            this.endLine = endLine;
        }
    }
    
    /**
     * Position block (one invoice line, possibly multi-line).
     */
    private static class PositionBlock {
        int positionNumber;
        String supplierArticleNumber;
        List<String> lines = new ArrayList<>();
    }
}
