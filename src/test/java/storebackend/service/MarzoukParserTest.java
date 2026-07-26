package storebackend.service;

import org.junit.jupiter.api.Test;
import storebackend.dto.ParsedInvoiceLine;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test parser with real Marzouk OCR text format.
 */
class MarzoukParserTest {
    
    @Test
    void testMarzoukOcrFormat() {
        String marzoukOcr = """
            MARZOUK FOOD GMBH
            Trio. [Beschreibung | Katt | Monge | Preis | | Borg [six
            425 |SOSEALGERIANE MELIK 15x500ML. | 6 X15) 90] 3 15 | 175,50] 7
            1063 |RASELHANNOUT GEWURZMELIKROT200G._ | 1x25] 251 1,10] 0 | 27,501 7
            491 |SEZAM GERÖSTET MELIK 24x200GR. | 1x24| 24] 0,55| 0 | 13,20| 7
            671 |LINSEN ROT GESCHALT MELIK 10x1000GR. | 1x10) 10] 2,20] 0 | 22,00| 7
            2044 |KIRCHERERBSEN GEKOCHT ZINA 12x860ML. | 1x12] 12] 1,75] 0 | 21,00| 7
            KURKUMA GEMAHLEN MELIK 200GR.
            TEE SULTAN AL AMBAR 500GR.
            708 | TRANSPORT VERSANKOSTEN ma 165,00/ | 165,00| 19
            Fortsetzung auf nächsten Seite...
            ss "row [enge | Preis | | Betrag [stv
            1164 |KAFFEE ESPRESSO LA GRANDE 1000GR. | 1x6| 6] 8,90] 0 | 53,40| 7
            Nettobetrag
            """;
        
        InvoiceLineItemParser parser = new InvoiceLineItemParser();
        List<ParsedInvoiceLine> lines = parser.parse(marzoukOcr);
        
        System.out.println("=== LOCAL TEST RESULTS ===");
        System.out.println("Total lines detected: " + lines.size());
        System.out.println();
        
        int withArticleNumber = 0;
        int reviewRequired = 0;
        
        for (ParsedInvoiceLine line : lines) {
            System.out.println("Position " + line.positionNumber() + ":");
            System.out.println("  Article: " + line.supplierArticleNumber());
            System.out.println("  Description: " + line.description());
            System.out.println("  Confidence: " + line.confidence());
            if (!line.warnings().isEmpty()) {
                System.out.println("  Warnings: " + line.warnings());
                reviewRequired++;
            }
            System.out.println();
            
            if (line.supplierArticleNumber() != null && !line.supplierArticleNumber().isEmpty()) {
                withArticleNumber++;
            }
        }
        
        System.out.println("Lines with article number: " + withArticleNumber);
        System.out.println("Lines requiring review: " + reviewRequired);
        
        // Assertions
        assertTrue(lines.size() > 0, "Should detect at least one line");
        assertTrue(withArticleNumber > 0, "Should detect at least one article number");
        
        // Check specific article numbers from OCR
        boolean found425 = lines.stream().anyMatch(l -> "425".equals(l.supplierArticleNumber()));
        boolean found1063 = lines.stream().anyMatch(l -> "1063".equals(l.supplierArticleNumber()));
        boolean found708 = lines.stream().anyMatch(l -> "708".equals(l.supplierArticleNumber()));
        
        assertTrue(found425, "Should detect article 425");
        assertTrue(found1063, "Should detect article 1063");
        assertTrue(found708, "Should detect article 708 (TRANSPORT)");
    }
}
