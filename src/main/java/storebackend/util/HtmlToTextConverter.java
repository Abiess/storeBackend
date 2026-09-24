package storebackend.util;

import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

/**
 * Konvertiert HTML zu sauberem, lesbarem Klartext.
 * 
 * Verwendung:
 * - WooCommerce-Produktbeschreibungen
 * - Externe HTML-Inhalte, die als Text angezeigt werden sollen
 * 
 * Features:
 * - Entfernt gefährliche Tags (script, style, iframe, etc.)
 * - Konvertiert HTML-Struktur zu lesbarem Text
 * - Dekodiert HTML-Entities (&amp;, &nbsp;, &eacute;, etc.)
 * - Erhält Zeilenumbrüche und Absätze
 * - Bereinigt überflüssige Leerzeilen
 */
@Component
@Slf4j
public class HtmlToTextConverter {

    /**
     * Konvertiert HTML zu lesbarem Klartext.
     * 
     * @param html HTML-String (z.B. WooCommerce-Beschreibung)
     * @return Sauberer Text ohne HTML-Tags, oder null wenn Input leer
     */
    public String convert(String html) {
        if (html == null || html.isBlank()) {
            return null;
        }

        try {
            // Parse HTML
            Document document = Jsoup.parse(html);

            // 1. Entferne gefährliche/unsichtbare Tags
            removeUnsafeTags(document);

            // 2. Füge Marker für Zeilenumbrüche ein BEVOR text() extrahiert wird
            // jsoup's text() würde sonst alle Struktur entfernen
            for (Element br : document.select("br")) {
                br.before("__BR__");
                br.remove();
            }

            // Block-Level-Elemente: Füge Doppel-Zeilenumbruch vor Element ein
            for (Element elem : document.select("p, div, h1, h2, h3, h4, h5, h6, li, tr")) {
                elem.before("__PARA__");
            }

            // Listen-Marker
            for (Element li : document.select("ul > li")) {
                li.prepend("• ");
            }

            // Nummerierte Listen
            for (Element ol : document.select("ol")) {
                int counter = 1;
                for (Element li : ol.select("> li")) {
                    li.prepend(counter + ". ");
                    counter++;
                }
            }

            // 3. Extrahiere Text (dekodiert automatisch HTML-Entities)
            String text = document.text();

            // 4. Ersetze Platzhalter durch echte Zeilenumbrüche
            text = text.replace("__BR__", "\n")
                       .replace("__PARA__", "\n\n");

            // 5. Bereinige Whitespace
            text = cleanupWhitespace(text);

            return text.isEmpty() ? null : text;

        } catch (Exception e) {
            log.warn("Failed to convert HTML to text: {}", e.getMessage());
            // Fallback: Versuche zumindest Rohtext zu extrahieren
            try {
                return Jsoup.parse(html).text().trim();
            } catch (Exception e2) {
                log.error("Complete failure in HTML conversion, returning null", e2);
                return null;
            }
        }
    }

    /**
     * Entfernt unsichere und unsichtbare Tags.
     */
    private void removeUnsafeTags(Document document) {
        // Gefährliche Tags
        document.select("script, style, iframe, object, embed, noscript").remove();
        
        // Kommentare entfernen
        document.select("*").forEach(element -> {
            element.childNodes().removeIf(node -> node.nodeName().equals("#comment"));
        });
    }

    /**
     * Bereinigt Whitespace und mehrfache Leerzeilen.
     */
    private String cleanupWhitespace(String text) {
        return text
            // Non-breaking spaces zu normalen Spaces
            .replace('\u00A0', ' ')
            
            // Mehrfache Spaces zu einzelnem Space
            .replaceAll("[ \\t]+", " ")
            
            // Leerzeichen am Zeilenanfang/ende entfernen
            .replaceAll("(?m)^[ \\t]+", "")
            .replaceAll("(?m)[ \\t]+$", "")
            
            // Mehr als 2 aufeinanderfolgende Zeilenumbrüche zu maximal 2
            .replaceAll("\\n{3,}", "\n\n")
            
            // Trim
            .trim();
    }
}
