package storebackend.dto;

import lombok.Builder;
import lombok.Data;

/**
 * GeoIP Data DTO
 * 
 * Enthält geografische und ASN-Informationen für eine IP-Adresse.
 */
@Data
@Builder
public class GeoIpData {
    
    /** ISO Country Code (2 letters, e.g., "DE", "US", "CN") */
    private String countryCode;
    
    /** Country name in English (e.g., "Germany", "United States") */
    private String countryName;
    
    /** City name (e.g., "Berlin", "New York") - may be null */
    private String city;
    
    /** Latitude */
    private Double latitude;
    
    /** Longitude */
    private Double longitude;
    
    /** Continent name (e.g., "Europe", "North America") */
    private String continent;
    
    /** Autonomous System Number (ASN) */
    private Integer asn;
    
    /** ASN Organization (e.g., "Hetzner Online GmbH", "Amazon.com, Inc.") */
    private String asnOrg;
    
    /** Internet Service Provider (often same as asnOrg) */
    private String isp;
    
    /**
     * Detect if this IP is from a known hosting/cloud provider
     */
    public boolean isHostingProvider() {
        if (asnOrg == null) return false;
        
        String org = asnOrg.toLowerCase();
        return org.contains("hetzner") ||
               org.contains("ovh") ||
               org.contains("amazon") ||
               org.contains("digitalocean") ||
               org.contains("linode") ||
               org.contains("vultr") ||
               org.contains("google cloud") ||
               org.contains("microsoft") ||
               org.contains("azure") ||
               org.contains("aws") ||
               org.contains("cloudflare") ||
               org.contains("contabo") ||
               org.contains("netcup");
    }
    
    /**
     * Get cloud provider name if detected
     */
    public String getCloudProvider() {
        if (asnOrg == null) return null;
        
        String org = asnOrg.toLowerCase();
        if (org.contains("amazon") || org.contains("aws")) return "AWS";
        if (org.contains("google") || org.contains("gcp")) return "Google Cloud";
        if (org.contains("microsoft") || org.contains("azure")) return "Azure";
        if (org.contains("digitalocean")) return "DigitalOcean";
        if (org.contains("hetzner")) return "Hetzner";
        if (org.contains("ovh")) return "OVH";
        if (org.contains("linode")) return "Linode";
        if (org.contains("vultr")) return "Vultr";
        if (org.contains("cloudflare")) return "Cloudflare";
        if (org.contains("contabo")) return "Contabo";
        if (org.contains("netcup")) return "Netcup";
        
        return null;
    }
}
