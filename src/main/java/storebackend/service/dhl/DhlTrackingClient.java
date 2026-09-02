package storebackend.service.dhl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import storebackend.config.DhlProperties;
import storebackend.dto.dhl.DhlTrackingValidationResult;
import storebackend.dto.dhl.DhlTrackingValidationResult.DhlTrackingValidationStatus;
import storebackend.exception.DhlTrackingException;
import storebackend.exception.DhlTrackingException.DhlTrackingErrorCode;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * DHL Parcel DE Tracking Client
 * 
 * API: GET /parcel/de/tracking/v0/shipments
 * Operation: get-status-for-public-user
 * 
 * Authentifizierung (2 Ebenen):
 * 1. HTTP Basic Auth: clientId:clientSecret
 * 2. HTTP Header: DHL-API-Key: clientId
 * 3. XML Request: appname=username, password=password
 * 
 * Multi-Store Support:
 * - Nutzt DhlSettingsResolver für store-aware Credentials
 * - Unterstützt SANDBOX | STORE | PLATFORM Credentials
 * 
 * Security:
 * - Kein password/clientSecret loggen
 * - Kein XML loggen (enthält Passwort)
 * - XXE deaktiviert
 * - Nur maskierte clientId + trackingCode loggen
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DhlTrackingClient {
    
    private final DhlProperties dhlProperties;
    private final DhlSettingsResolver dhlSettingsResolver;
    private final RestTemplate restTemplate = new RestTemplate();
    
    /**
     * Validiert Tracking-Code für einen Store
     * 
     * @param storeId Store ID
     * @param trackingCode Barcode/Tracking-Code (wird normalisiert)
     * @return DhlTrackingValidationResult
     * @throws DhlTrackingException bei technischen/konfigurativen Fehlern
     */
    public DhlTrackingValidationResult validateTrackingCode(Long storeId, String trackingCode) {
        // 1. Input validieren
        if (trackingCode == null || trackingCode.isBlank()) {
            throw new IllegalArgumentException("Tracking code cannot be empty");
        }
        
        String normalizedCode = normalizeTrackingCode(trackingCode);
        
        // 2. Store Config resolven
        DhlSettingsResolver.ResolvedDhlConfig config = dhlSettingsResolver.resolve(storeId);
        
        // 3. Tracking URL ermitteln
        String trackingBaseUrl = getTrackingBaseUrl(config.getEnvironment());
        
        log.info("🔍 DHL Tracking validation: store={}, trackingCode={}, credentialsSource={}, env={}",
            storeId, normalizedCode, config.getCredentialsSource(), config.getEnvironment());
        
        try {
            // 4. XML Request bauen (KEINE Secrets loggen!)
            String xmlRequest = buildXmlRequest(config, normalizedCode);
            String encodedXml = URLEncoder.encode(xmlRequest, StandardCharsets.UTF_8);
            
            // 5. HTTP Request
            String url = trackingBaseUrl + "/shipments?xml=" + encodedXml;
            
            HttpHeaders headers = createHeaders(config);
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            log.debug("DHL Tracking Request: GET {} (clientId={}****)", 
                trackingBaseUrl + "/shipments",
                maskClientId(config.getClientId()));
            
            // 6. API Call
            ResponseEntity<String> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                request,
                String.class
            );
            
            // 7. Response parsen
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                DhlTrackingValidationResult result = parseXmlResponse(response.getBody(), normalizedCode);
                
                if (result.getStatus() == DhlTrackingValidationStatus.VALID) {
                    log.info("✅ DHL Tracking VALID: store={}, trackingCode={}, pieceCode={}, status={}",
                        storeId, normalizedCode, result.getPieceCode(), result.getShipmentStatus());
                } else {
                    log.info("⚠️ DHL Tracking NOT_FOUND: store={}, trackingCode={}, dhlCode={}",
                        storeId, normalizedCode, result.getDhlResponseCode());
                }
                
                return result;
            }
            
            throw new DhlTrackingException(
                DhlTrackingErrorCode.HTTP_ERROR,
                "DHL Tracking API returned unexpected status: " + response.getStatusCode(),
                "dhl.tracking.httpError"
            );
            
        } catch (HttpClientErrorException.Unauthorized e) {
            // 401: Basic Auth fehlgeschlagen (Client ID/Secret invalid)
            log.error("❌ DHL Tracking Basic Auth failed (401): clientId={}****, message={}",
                maskClientId(config.getClientId()), e.getMessage());
            throw new DhlTrackingException(
                DhlTrackingErrorCode.AUTHENTICATION_ERROR,
                "DHL API authentication failed. Please check Client ID and Client Secret.",
                "dhl.tracking.authFailed",
                e
            );
            
        } catch (HttpClientErrorException e) {
            // 4xx: Client Error
            log.error("❌ DHL Tracking failed ({}): {}", 
                e.getStatusCode(), e.getResponseBodyAsString());
            throw new DhlTrackingException(
                DhlTrackingErrorCode.HTTP_ERROR,
                "DHL Tracking API error: " + e.getStatusCode(),
                "dhl.tracking.httpError",
                e
            );
            
        } catch (HttpServerErrorException e) {
            // 5xx: Server Error
            log.error("❌ DHL Tracking server error ({}): {}", 
                e.getStatusCode(), e.getMessage());
            throw new DhlTrackingException(
                DhlTrackingErrorCode.DHL_TECHNICAL_ERROR,
                "DHL Tracking API server error",
                "dhl.tracking.serverError",
                e
            );
            
        } catch (ResourceAccessException e) {
            // Timeout / Connection Error
            log.error("❌ DHL Tracking connectivity error: {}", e.getMessage());
            throw new DhlTrackingException(
                DhlTrackingErrorCode.CONNECTIVITY_ERROR,
                "DHL Tracking API not reachable. Please try again later.",
                "dhl.tracking.connectivityError",
                e
            );
            
        } catch (DhlTrackingException e) {
            // Re-throw DhlTrackingException
            throw e;
            
        } catch (Exception e) {
            // Unerwarteter Fehler
            log.error("❌ DHL Tracking unexpected error: {}", e.getMessage(), e);
            throw new DhlTrackingException(
                DhlTrackingErrorCode.UNKNOWN_DHL_ERROR,
                "Unexpected error during DHL Tracking validation",
                "dhl.tracking.unexpectedError",
                e
            );
        }
    }
    
    /**
     * Normalisiert Tracking-Code
     * - trim
     * - uppercase
     * - Leerzeichen entfernen
     */
    private String normalizeTrackingCode(String rawCode) {
        return rawCode.trim().toUpperCase().replaceAll("\\s+", "");
    }
    
    /**
     * Ermittelt Tracking Base URL basierend auf Environment
     */
    private String getTrackingBaseUrl(String environment) {
        if ("SANDBOX".equalsIgnoreCase(environment)) {
            return dhlProperties.getTrackingSandboxBaseUrl();
        } else {
            return dhlProperties.getTrackingProductionBaseUrl();
        }
    }
    
    /**
     * Baut XML Request (OHNE Secrets zu loggen!)
     * 
     * Struktur:
     * <data request="get-status-for-public-user"
     *       appname="GKP_USERNAME"
     *       password="GKP_PASSWORD"
     *       language-code="de">
     *   <data piece-code="TRACKING_CODE" piece-customer-reference="" />
     * </data>
     */
    private String buildXmlRequest(DhlSettingsResolver.ResolvedDhlConfig config, String trackingCode) {
        return String.format(
            "<data request=\"get-status-for-public-user\" " +
            "appname=\"%s\" " +
            "password=\"%s\" " +
            "language-code=\"de\">" +
            "<data piece-code=\"%s\" piece-customer-reference=\"\" />" +
            "</data>",
            escapeXml(config.getUsername()),
            escapeXml(config.getPassword()),
            escapeXml(trackingCode)
        );
    }
    
    /**
     * Erstellt HTTP Headers (2-Ebenen-Auth)
     */
    private HttpHeaders createHeaders(DhlSettingsResolver.ResolvedDhlConfig config) {
        HttpHeaders headers = new HttpHeaders();
        
        // 1. Basic Auth: clientId:clientSecret
        String auth = config.getClientId() + ":" + config.getClientSecret();
        String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
        headers.set("Authorization", "Basic " + encodedAuth);
        
        // 2. DHL-API-Key Header
        headers.set("DHL-API-Key", config.getClientId());
        
        return headers;
    }
    
    /**
     * Parst XML Response (defensive Parsing mit XXE-Schutz)
     * 
     * Realistische Struktur:
     * <data request-id="...">
     *   <data name="piece-status-public-list" code="0">
     *     <data name="piece-status-public"
     *           searched-piece-code="..."
     *           piece-code="..."
     *           piece-identifier="..."
     *           status="..."
     *           product-name="..."
     *           standard-event-code="..."
     *           shipment-weight="..."
     *           product-code="..."
     *           dest-country="..."
     *           origin-country="..."
     *           last-event-timestamp="..."
     *           pslz-nr="..."
     *           ric="..."
     *           ice="..." />
     *   </data>
     * </data>
     *
     * Die zusätzlichen Felder (product-code, dest-country, origin-country,
     * last-event-timestamp, pslz-nr, ric, ice) sind optional - fehlen sie in
     * der Response, bleiben die entsprechenden DTO-Felder null.
     */
    private DhlTrackingValidationResult parseXmlResponse(String xml, String originalTrackingCode) {
        try {
            // XXE-Schutz + externe Entities deaktivieren
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setExpandEntityReferences(false);
            
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(new InputSource(new StringReader(xml)));
            
            // Root Element
            Element root = doc.getDocumentElement();
            
            // Suche <data name="piece-status-public-list" code="...">
            NodeList dataElements = root.getElementsByTagName("data");
            Element statusListElement = null;
            
            for (int i = 0; i < dataElements.getLength(); i++) {
                Element elem = (Element) dataElements.item(i);
                String name = elem.getAttribute("name");
                if ("piece-status-public-list".equals(name)) {
                    statusListElement = elem;
                    break;
                }
            }
            
            if (statusListElement == null) {
                log.error("❌ DHL XML missing 'piece-status-public-list' element");
                throw new DhlTrackingException(
                    DhlTrackingErrorCode.XML_PARSING_ERROR,
                    "DHL response missing expected 'piece-status-public-list' element",
                    "dhl.tracking.xmlParsingError"
                );
            }
            
            String code = statusListElement.getAttribute("code");
            log.debug("DHL Response Code: {}", code);
            
            // Code auswerten
            if ("0".equals(code)) {
                // VALID: Suche <data name="piece-status-public" ...>
                Element pieceStatusElement = findChildElementByName(statusListElement, "piece-status-public");
                
                if (pieceStatusElement == null) {
                    log.error("❌ DHL XML code=0 but missing 'piece-status-public' element");
                    throw new DhlTrackingException(
                        DhlTrackingErrorCode.XML_PARSING_ERROR,
                        "DHL response code=0 but missing shipment details",
                        "dhl.tracking.xmlParsingError"
                    );
                }
                
                // Felder extrahieren
                // Bekannte Basis-Felder (immer geprüft/verwendet) + zusätzliche
                // Metadaten-Felder aus der echten DHL Production-Response
                // (piece-code, piece-identifier, pslz-nr, status, last-event-timestamp,
                // standard-event-code, product-code, product-name, shipment-weight,
                // dest-country, origin-country, ric, ice). Alle zusätzlichen Felder
                // werden defensiv mit attrOrNull() gelesen: fehlt ein Attribut in der
                // Response, bleibt das Feld null statt eines leeren Strings.
                return DhlTrackingValidationResult.builder()
                    .status(DhlTrackingValidationStatus.VALID)
                    .trackingCode(originalTrackingCode)
                    .pieceCode(pieceStatusElement.getAttribute("piece-code"))
                    .pieceIdentifier(pieceStatusElement.getAttribute("piece-identifier"))
                    .shipmentStatus(pieceStatusElement.getAttribute("status"))
                    .standardEventCode(pieceStatusElement.getAttribute("standard-event-code"))
                    .productCode(attrOrNull(pieceStatusElement, "product-code"))
                    .productName(pieceStatusElement.getAttribute("product-name"))
                    .weightKg(parseWeight(pieceStatusElement.getAttribute("shipment-weight")))
                    .destinationCountry(attrOrNull(pieceStatusElement, "dest-country"))
                    .originCountry(attrOrNull(pieceStatusElement, "origin-country"))
                    .lastEventTimestamp(attrOrNull(pieceStatusElement, "last-event-timestamp"))
                    .pslzNumber(attrOrNull(pieceStatusElement, "pslz-nr"))
                    .ric(attrOrNull(pieceStatusElement, "ric"))
                    .ice(attrOrNull(pieceStatusElement, "ice"))
                    .dhlResponseCode(code)
                    .build();
                
            } else if ("100".equals(code)) {
                // NOT_FOUND: Barcode ungültig (KEIN Fehler!)
                return DhlTrackingValidationResult.builder()
                    .status(DhlTrackingValidationStatus.NOT_FOUND)
                    .trackingCode(originalTrackingCode)
                    .dhlResponseCode(code)
                    .dhlErrorMessage("Tracking code not found in DHL system")
                    .build();
                
            } else if ("5".equals(code)) {
                // AUTHENTICATION_ERROR
                log.error("❌ DHL Tracking Auth Error (code=5): GKP credentials invalid");
                throw new DhlTrackingException(
                    DhlTrackingErrorCode.AUTHENTICATION_ERROR,
                    "DHL GKP credentials invalid (code=5). Please check username and password.",
                    "dhl.tracking.gkpAuthFailed",
                    code
                );
                
            } else if ("-1000".equals(code)) {
                // DHL_TECHNICAL_ERROR
                log.error("❌ DHL Tracking Technical Error (code=-1000)");
                throw new DhlTrackingException(
                    DhlTrackingErrorCode.DHL_TECHNICAL_ERROR,
                    "DHL Tracking API technical error (code=-1000)",
                    "dhl.tracking.technicalError",
                    code
                );
                
            } else {
                // UNKNOWN_DHL_ERROR
                log.error("❌ DHL Tracking Unknown Error Code: {}", code);
                // Diagnose-Logging (KEINE Credentials!): erfasst rohe Response-Struktur
                // für bisher unbekannte DHL-Codes (z.B. code=40), damit deren fachliche
                // Bedeutung ohne Raten anhand echter Produktionsdaten geklärt werden kann.
                logUnknownCodeDiagnostics(statusListElement, code);
                throw new DhlTrackingException(
                    DhlTrackingErrorCode.UNKNOWN_DHL_ERROR,
                    "DHL Tracking API returned unknown error code: " + code,
                    "dhl.tracking.unknownError",
                    code
                );
            }
            
        } catch (DhlTrackingException e) {
            throw e;
        } catch (Exception e) {
            log.error("❌ DHL XML Parsing failed: {}", e.getMessage(), e);
            throw new DhlTrackingException(
                DhlTrackingErrorCode.XML_PARSING_ERROR,
                "Failed to parse DHL Tracking response XML",
                "dhl.tracking.xmlParsingError",
                e
            );
        }
    }
    
    /**
     * Sicheres Diagnose-Logging für bisher unbekannte DHL Response-Codes (z.B. code=40).
     *
     * Ziel: Beim nächsten Auftreten eines unbekannten Codes die tatsächliche
     * Response-Struktur (Elementnamen + Attribute) protokollieren, damit die fachliche
     * Bedeutung anhand echter Daten geklärt werden kann, statt geraten zu werden.
     *
     * Security: Es werden AUSSCHLIESSLICH Attribute der DHL-*Response* geloggt
     * (niemals des Requests). Sicherheitsrelevante Attributnamen (appname/password/
     * secret/auth/token/credential) werden zusätzlich defensiv herausgefiltert,
     * falls sie wider Erwarten in der Response auftauchen sollten.
     */
    private void logUnknownCodeDiagnostics(Element statusListElement, String code) {
        try {
            StringBuilder sb = new StringBuilder();
            sb.append(describeElementSafely(statusListElement));

            NodeList children = statusListElement.getChildNodes();
            for (int i = 0; i < children.getLength(); i++) {
                if (children.item(i) instanceof Element child) {
                    sb.append(" | ").append(describeElementSafely(child));
                }
            }

            log.warn("🔎 DHL unknown code diagnostic (code={}): {}", code, sb);
        } catch (Exception ex) {
            log.warn("⚠️ Failed to log DHL unknown code diagnostics for code={}: {}", code, ex.getMessage());
        }
    }

    /**
     * Beschreibt ein XML-Element (Tag-Name + Attribute) ohne sicherheitsrelevante Werte.
     */
    private String describeElementSafely(Element element) {
        StringBuilder sb = new StringBuilder(element.getTagName()).append('[');
        var attributes = element.getAttributes();
        for (int i = 0; i < attributes.getLength(); i++) {
            var attr = attributes.item(i);
            String attrName = attr.getNodeName();
            if (isSensitiveAttributeName(attrName)) {
                sb.append(attrName).append("=<redacted>,");
                continue;
            }
            sb.append(attrName).append('=').append(attr.getNodeValue()).append(',');
        }
        sb.append(']');
        return sb.toString();
    }

    /**
     * Defensive Prüfung auf sicherheitsrelevante Attributnamen (Credentials dürfen niemals
     * geloggt werden, auch nicht versehentlich über eine unerwartete DHL-Response).
     */
    private boolean isSensitiveAttributeName(String name) {
        String lower = name.toLowerCase();
        return lower.contains("password")
            || lower.contains("secret")
            || lower.contains("appname")
            || lower.contains("auth")
            || lower.contains("token")
            || lower.contains("credential");
    }

    /**
     * Findet Child-Element anhand 'name' Attribut
     */
    private Element findChildElementByName(Element parent, String targetName) {
        NodeList children = parent.getElementsByTagName("data");
        for (int i = 0; i < children.getLength(); i++) {
            Element child = (Element) children.item(i);
            String name = child.getAttribute("name");
            if (targetName.equals(name)) {
                return child;
            }
        }
        return null;
    }
    
    /**
     * Liest ein optionales XML-Attribut. Anders als {@link Element#getAttribute(String)}
     * (welches bei fehlendem Attribut "" statt null liefert) gibt diese Methode
     * bei fehlendem/leerem Attribut null zurück, damit optionale Metadaten-Felder
     * im DTO sauber zwischen "nicht vorhanden" und "leerer String" unterscheiden.
     */
    private String attrOrNull(Element element, String attributeName) {
        String value = element.getAttribute(attributeName);
        return (value == null || value.isBlank()) ? null : value;
    }

    /**
     * Parst Gewicht (z.B. "2.5" → BigDecimal)
     */
    private BigDecimal parseWeight(String weightStr) {
        if (weightStr == null || weightStr.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(weightStr);
        } catch (NumberFormatException e) {
            log.warn("Failed to parse weight: {}", weightStr);
            return null;
        }
    }
    
    /**
     * XML Escape für Attribute-Werte
     */
    private String escapeXml(String value) {
        if (value == null) {
            return "";
        }
        return value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&apos;");
    }
    
    /**
     * Maskiert Client ID für Logging (erste 4 Zeichen)
     */
    private String maskClientId(String clientId) {
        if (clientId == null || clientId.length() <= 4) {
            return "****";
        }
        return clientId.substring(0, 4);
    }
}
