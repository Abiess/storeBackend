package storebackend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "saas")
@Data
public class SaasProperties {

    private String baseDomain = "markt.ma";
    private String platformDomain = "app.markt.ma";
    private String subdomainPattern = "{slug}.markt.ma";

    private DomainVerification domainVerification = new DomainVerification();

    @Data
    public static class DomainVerification {
        private String txtRecordPrefix = "_marktma-verification";
        private int tokenLength = 32;
    }

    public String generateSubdomain(String slug) {
        return slug + "." + baseDomain;
    }

    public boolean isSubdomainOfBaseDomain(String host) {
        return host.endsWith("." + baseDomain);
    }

    public String extractSlugFromSubdomain(String host) {
        if (!isSubdomainOfBaseDomain(host)) {
            return null;
        }
        return host.substring(0, host.indexOf("." + baseDomain));
    }
}
