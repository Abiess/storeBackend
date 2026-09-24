package storebackend.util;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Utility-Klasse zum Extrahieren der echten Client-IP-Adresse
 * Berücksichtigt Proxies und Load Balancer (X-Forwarded-For, X-Real-IP)
 */
public class IpAddressUtil {

    /**
     * Extrahiert die echte Client-IP-Adresse aus dem Request
     * Berücksichtigt Reverse Proxies und Load Balancer
     *
     * @param request HTTP Request
     * @return IP-Adresse als String
     */
    public static String getClientIpAddress(HttpServletRequest request) {
        // Prüfe verschiedene Header (in der Reihenfolge der Priorität)
        String[] headers = {
            "X-Forwarded-For",
            "Proxy-Client-IP",
            "WL-Proxy-Client-IP",
            "HTTP_X_FORWARDED_FOR",
            "HTTP_X_FORWARDED",
            "HTTP_X_CLUSTER_CLIENT_IP",
            "HTTP_CLIENT_IP",
            "HTTP_FORWARDED_FOR",
            "HTTP_FORWARDED",
            "HTTP_VIA",
            "REMOTE_ADDR",
            "X-Real-IP"
        };

        for (String header : headers) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                // X-Forwarded-For kann mehrere IPs enthalten (getrennt durch Komma)
                // Die erste IP ist die echte Client-IP
                if (ip.contains(",")) {
                    ip = ip.split(",")[0].trim();
                }
                return ip;
            }
        }

        // Fallback auf Remote Address
        String remoteAddr = request.getRemoteAddr();
        return remoteAddr != null ? remoteAddr : "unknown";
    }
}

