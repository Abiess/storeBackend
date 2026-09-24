package storebackend.service;

import com.maxmind.geoip2.DatabaseReader;
import com.maxmind.geoip2.exception.GeoIp2Exception;
import com.maxmind.geoip2.model.CityResponse;
import com.maxmind.geoip2.record.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import storebackend.dto.GeoIpData;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.File;
import java.io.IOException;
import java.net.InetAddress;

/**
 * GeoIP Service - MaxMind GeoLite2 Integration
 * 
 * Liefert geografische und ASN-Informationen für IP-Adressen.
 * Verwendet lokale MMDB-Datei (keine API-Calls, <1ms Lookup).
 * 
 * Setup:
 * 1. Download GeoLite2-City.mmdb von MaxMind
 * 2. Platzieren in: src/main/resources/geoip/GeoLite2-City.mmdb
 * 3. Property: geoip.database.path=classpath:geoip/GeoLite2-City.mmdb
 */
@Service
@Slf4j
public class GeoIpService {

    @Value("${geoip.database.path:}")
    private String databasePath;

    @Value("${geoip.enabled:false}")
    private boolean enabled;

    private DatabaseReader cityReader;
    private DatabaseReader asnReader;

    @PostConstruct
    public void init() {
        if (!enabled) {
            log.info("GeoIP disabled (geoip.enabled=false)");
            return;
        }

        if (databasePath == null || databasePath.isEmpty()) {
            log.warn("GeoIP enabled but no database path configured (geoip.database.path)");
            return;
        }

        try {
            // Load City database (includes location data)
            File cityDatabase = loadDatabaseFile(databasePath);
            if (cityDatabase != null && cityDatabase.exists()) {
                cityReader = new DatabaseReader.Builder(cityDatabase).build();
                log.info("✅ GeoIP City database loaded: {}", cityDatabase.getAbsolutePath());
            } else {
                log.warn("⚠️ GeoIP City database not found: {}", databasePath);
            }

            // Try to load ASN database (optional, for provider info)
            String asnPath = databasePath.replace("City", "ASN");
            File asnDatabase = loadDatabaseFile(asnPath);
            if (asnDatabase != null && asnDatabase.exists()) {
                asnReader = new DatabaseReader.Builder(asnDatabase).build();
                log.info("✅ GeoIP ASN database loaded: {}", asnDatabase.getAbsolutePath());
            } else {
                log.debug("GeoIP ASN database not found (optional): {}", asnPath);
            }

        } catch (IOException e) {
            log.error("Failed to initialize GeoIP database: {}", e.getMessage());
        }
    }

    @PreDestroy
    public void cleanup() {
        try {
            if (cityReader != null) {
                cityReader.close();
                log.debug("GeoIP City reader closed");
            }
            if (asnReader != null) {
                asnReader.close();
                log.debug("GeoIP ASN reader closed");
            }
        } catch (IOException e) {
            log.warn("Error closing GeoIP readers: {}", e.getMessage());
        }
    }

    /**
     * Lookup GeoIP data for IP address
     * 
     * @param ipAddress IP address (e.g., "8.8.8.8")
     * @return GeoIpData or null if lookup failed
     */
    public GeoIpData lookup(String ipAddress) {
        if (!enabled || cityReader == null) {
            return null;
        }

        if (ipAddress == null || ipAddress.isEmpty()) {
            return null;
        }

        // Skip private/local IPs
        if (isPrivateIp(ipAddress)) {
            log.debug("Skipping private IP: {}", ipAddress);
            return null;
        }

        try {
            InetAddress inetAddress = InetAddress.getByName(ipAddress);
            CityResponse response = cityReader.city(inetAddress);

            Country country = response.getCountry();
            City city = response.getCity();
            Location location = response.getLocation();
            Continent continent = response.getContinent();

            // Get ASN info if available
            Integer asn = null;
            String asnOrg = null;
            String isp = null;

            if (asnReader != null) {
                try {
                    var asnResponse = asnReader.asn(inetAddress);
                    asn = asnResponse.getAutonomousSystemNumber() != null 
                        ? asnResponse.getAutonomousSystemNumber().intValue() 
                        : null;
                    asnOrg = asnResponse.getAutonomousSystemOrganization();
                    
                    // ISP often same as ASN org, but can be different
                    isp = asnOrg; // GeoLite2 doesn't have separate ISP field
                } catch (Exception e) {
                    log.debug("ASN lookup failed for {}: {}", ipAddress, e.getMessage());
                }
            }

            return GeoIpData.builder()
                .countryCode(country != null ? country.getIsoCode() : null)
                .countryName(country != null ? country.getName() : null)
                .city(city != null ? city.getName() : null)
                .latitude(location != null ? location.getLatitude() : null)
                .longitude(location != null ? location.getLongitude() : null)
                .continent(continent != null ? continent.getName() : null)
                .asn(asn)
                .asnOrg(asnOrg)
                .isp(isp)
                .build();

        } catch (GeoIp2Exception e) {
            log.debug("GeoIP lookup failed for {}: {}", ipAddress, e.getMessage());
            return null;
        } catch (IOException e) {
            log.warn("GeoIP database error for {}: {}", ipAddress, e.getMessage());
            return null;
        }
    }

    /**
     * Check if IP is private/local (no GeoIP lookup needed)
     */
    private boolean isPrivateIp(String ip) {
        if (ip == null) return true;
        
        // Local/Private ranges
        return ip.startsWith("127.") ||
               ip.startsWith("10.") ||
               ip.startsWith("192.168.") ||
               ip.startsWith("172.16.") ||
               ip.startsWith("172.17.") ||
               ip.startsWith("172.18.") ||
               ip.startsWith("172.19.") ||
               ip.startsWith("172.20.") ||
               ip.startsWith("172.21.") ||
               ip.startsWith("172.22.") ||
               ip.startsWith("172.23.") ||
               ip.startsWith("172.24.") ||
               ip.startsWith("172.25.") ||
               ip.startsWith("172.26.") ||
               ip.startsWith("172.27.") ||
               ip.startsWith("172.28.") ||
               ip.startsWith("172.29.") ||
               ip.startsWith("172.30.") ||
               ip.startsWith("172.31.") ||
               ip.equals("localhost") ||
               ip.equals("::1");
    }

    /**
     * Load database file from classpath or filesystem
     */
    private File loadDatabaseFile(String path) {
        if (path == null || path.isEmpty()) {
            return null;
        }

        // Try classpath first
        if (path.startsWith("classpath:")) {
            String resourcePath = path.substring("classpath:".length());
            try {
                var resource = getClass().getClassLoader().getResource(resourcePath);
                if (resource != null) {
                    return new File(resource.toURI());
                }
            } catch (Exception e) {
                log.debug("Classpath resource not found: {}", resourcePath);
            }
        }

        // Try as absolute/relative file path
        File file = new File(path);
        if (file.exists()) {
            return file;
        }

        return null;
    }

    public boolean isEnabled() {
        return enabled && cityReader != null;
    }
}
