package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import storebackend.config.SaasProperties;
import storebackend.dto.PublicStoreDTO;
import storebackend.entity.Domain;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.DomainType;
import storebackend.enums.StoreStatus;
import storebackend.repository.DomainRepository;
import storebackend.repository.StoreRepository;

import java.security.SecureRandom;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DomainService {

    private final DomainRepository domainRepository;
    private final StoreRepository storeRepository;
    private final SaasProperties saasProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    public List<Domain> getDomainsForStore(Long storeId, User currentUser) {
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new IllegalArgumentException("Store not found"));

        if (!store.getOwner().getId().equals(currentUser.getId())) {
            throw new SecurityException("Access denied");
        }

        return domainRepository.findByStore(store);
    }

    public Domain createSubdomain(Long storeId, User currentUser) {
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new IllegalArgumentException("Store not found"));

        if (!store.getOwner().getId().equals(currentUser.getId())) {
            throw new SecurityException("Access denied");
        }

        // Prüfe Plan-Limits
        long existingSubdomains = domainRepository.countByStoreAndType(store, DomainType.SUBDOMAIN);
        if (existingSubdomains >= currentUser.getPlan().getMaxSubdomains()) {
            throw new IllegalStateException("Maximum number of subdomains reached for your plan");
        }

        String subdomain = saasProperties.generateSubdomain(store.getSlug());

        if (domainRepository.existsByHost(subdomain)) {
            throw new IllegalStateException("Subdomain already exists");
        }

        Domain domain = new Domain();
        domain.setStore(store);
        domain.setHost(subdomain);
        domain.setType(DomainType.SUBDOMAIN);
        domain.setIsVerified(true); // Subdomains sind automatisch verifiziert
        domain.setIsPrimary(existingSubdomains == 0); // Erste Domain wird primary

        return domainRepository.save(domain);
    }

    public Domain createCustomDomain(Long storeId, String customHost, User currentUser) {
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new IllegalArgumentException("Store not found"));

        if (!store.getOwner().getId().equals(currentUser.getId())) {
            throw new SecurityException("Access denied");
        }

        // Prüfe Plan-Limits
        long existingCustomDomains = domainRepository.countByStoreAndType(store, DomainType.CUSTOM);
        if (existingCustomDomains >= currentUser.getPlan().getMaxCustomDomains()) {
            throw new IllegalStateException("Maximum number of custom domains reached for your plan");
        }

        if (domainRepository.existsByHost(customHost)) {
            throw new IllegalStateException("Domain already exists");
        }

        // Validiere dass es keine Subdomain unserer Platform ist
        if (saasProperties.isSubdomainOfBaseDomain(customHost)) {
            throw new IllegalArgumentException("Cannot use subdomain of platform domain as custom domain");
        }

        Domain domain = new Domain();
        domain.setStore(store);
        domain.setHost(customHost);
        domain.setType(DomainType.CUSTOM);
        domain.setIsVerified(false);
        domain.setVerificationToken(generateVerificationToken());
        domain.setIsPrimary(false);

        return domainRepository.save(domain);
    }

    @Transactional(readOnly = true)
    public Optional<Domain> resolveDomainByHost(String host) {
        String normalized = normalizeHost(host);
        if (normalized == null) {
            return Optional.empty();
        }
        return domainRepository.findActiveVerifiedDomainByHost(normalized);
    }

    /**
     * Lt eine Store-Konfiguration anhand eines Hostnamens auf.
     *
     * Robust gegen:
     * - Gro/Kleinschreibung
     * - Whitespace
     * - Port (":8080")
     * - Trailing dot ("example.com.")
     * - Protokoll/Path falls flschlich mitgegeben wurde ("https://x.y")
     *
     * Fallback:
     * Wenn es eine Subdomain unserer Base-Domain ist und kein exakter Domain-Host gefunden wurde,
     * wird ber den slug (Subdomain-Teil) auf die verifizierte SUBDOMAIN gemappt.
     */
    @Transactional(readOnly = true)
    public Optional<PublicStoreDTO> resolveStoreByHost(String host) {

        log.info("🔍 resolveStoreByHost called with host: '{}'", host);

        String normalized = normalizeHost(host);
        log.info("📝 Normalized host: '{}'", normalized);

        if (normalized == null) {
            log.warn("⚠️ Normalized host is null, returning empty");
            return Optional.empty();
        }

        // 1) Exaktes Host-Matching (nach Normalisierung)
        log.debug("🔎 Step 1: Searching for exact host match in database...");
        Optional<PublicStoreDTO> direct = domainRepository.findActiveVerifiedDomainWithStoreByHost(normalized)
                .map(domain -> {
                    Store store = domain.getStore();
                    log.info("✅ Found exact match - Store: {} (ID: {}), Domain: {}, IsVerified: {}",
                             store.getName(), store.getId(), domain.getHost(), domain.getIsVerified());

                    PublicStoreDTO dto = new PublicStoreDTO();
                    dto.setStoreId(store.getId());
                    dto.setName(store.getName());
                    dto.setSlug(store.getSlug());
                    dto.setDescription(store.getDescription());
                    dto.setPrimaryDomain(domain.getHost());
                    dto.setStatus(store.getStatus().name());
                    return dto;
                });

        if (direct.isPresent()) {
            log.info("✅ Returning direct match result");
            return direct;
        }

        log.debug("⚠️ No exact host match found, trying fallback...");

        // 2) Fallback für Platform-Subdomains: abdellah.markt.ma über slug finden
        boolean isSubdomain = saasProperties.isSubdomainOfBaseDomain(normalized);
        log.debug("🔎 Step 2: Is subdomain of base domain? {}", isSubdomain);

        if (isSubdomain) {
            String slug = saasProperties.extractSlugFromSubdomain(normalized);
            log.info("🔎 Extracted slug from subdomain: '{}'", slug);

            if (slug != null && !slug.isBlank()) {
                log.debug("🔍 Searching for verified subdomain by slug: '{}'", slug.toLowerCase());

                Optional<PublicStoreDTO> fallbackResult = domainRepository.findVerifiedSubdomainBySlug(slug.toLowerCase())
                        .filter(d -> {
                            boolean hasStore = d.getStore() != null;
                            boolean isActive = hasStore && d.getStore().getStatus() == StoreStatus.ACTIVE;
                            log.debug("📊 Domain check - HasStore: {}, IsActive: {}, IsVerified: {}",
                                     hasStore, isActive, d.getIsVerified());
                            return hasStore && isActive;
                        })
                        .map(domain -> {
                            Store store = domain.getStore();
                            log.info("✅ Found via slug fallback - Store: {} (ID: {}), Domain: {}, IsVerified: {}",
                                     store.getName(), store.getId(), domain.getHost(), domain.getIsVerified());

                            PublicStoreDTO dto = new PublicStoreDTO();
                            dto.setStoreId(store.getId());
                            dto.setName(store.getName());
                            dto.setSlug(store.getSlug());
                            dto.setDescription(store.getDescription());
                            dto.setPrimaryDomain(domain.getHost());
                            dto.setStatus(store.getStatus().name());
                            return dto;
                        });

                if (fallbackResult.isPresent()) {
                    log.info("✅ Returning fallback result");
                    return fallbackResult;
                } else {
                    log.warn("❌ No verified subdomain found for slug: '{}'", slug);
                }
            } else {
                log.warn("⚠️ Extracted slug is null or blank");
            }
        }

        log.warn("❌ No store found for host: '{}' (normalized: '{}')", host, normalized);
        return Optional.empty();
    }

    public String getVerificationInstructions(Long domainId, User currentUser) {
        Domain domain = domainRepository.findById(domainId)
            .orElseThrow(() -> new IllegalArgumentException("Domain not found"));

        if (!domain.getStore().getOwner().getId().equals(currentUser.getId())) {
            throw new SecurityException("Access denied");
        }

        if (domain.getType() == DomainType.SUBDOMAIN) {
            return "Subdomains are automatically verified";
        }

        return String.format(
            "Add a TXT record to your DNS:\n" +
            "Name: %s.%s\n" +
            "Value: %s\n" +
            "Then call the verification endpoint.",
            saasProperties.getDomainVerification().getTxtRecordPrefix(),
            domain.getHost(),
            domain.getVerificationToken()
        );
    }

    public boolean verifyDomain(Long domainId, User currentUser) {
        Domain domain = domainRepository.findById(domainId)
            .orElseThrow(() -> new IllegalArgumentException("Domain not found"));

        if (!domain.getStore().getOwner().getId().equals(currentUser.getId())) {
            throw new SecurityException("Access denied");
        }

        if (domain.getType() == DomainType.SUBDOMAIN) {
            return true; // Subdomains sind bereits verifiziert
        }

        // Hier würde die tatsächliche DNS-Verifikation stattfinden
        // Für jetzt simulieren wir es
        boolean verified = performDnsVerification(domain);

        if (verified) {
            domain.setIsVerified(true);
            domainRepository.save(domain);
            log.info("Domain {} verified successfully", domain.getHost());
        }

        return verified;
    }

    public void setPrimaryDomain(Long domainId, User currentUser) {
        Domain domain = domainRepository.findById(domainId)
            .orElseThrow(() -> new IllegalArgumentException("Domain not found"));

        if (!domain.getStore().getOwner().getId().equals(currentUser.getId())) {
            throw new SecurityException("Access denied");
        }

        if (!domain.getIsVerified()) {
            throw new IllegalStateException("Cannot set unverified domain as primary");
        }

        // Entferne primary flag von anderen domains
        domainRepository.findByStoreAndIsPrimary(domain.getStore(), true)
            .ifPresent(primaryDomain -> {
                primaryDomain.setIsPrimary(false);
                domainRepository.save(primaryDomain);
            });

        domain.setIsPrimary(true);
        domainRepository.save(domain);
    }

    public void deleteDomain(Long domainId, User currentUser) {
        Domain domain = domainRepository.findById(domainId)
            .orElseThrow(() -> new IllegalArgumentException("Domain not found"));

        if (!domain.getStore().getOwner().getId().equals(currentUser.getId())) {
            throw new SecurityException("Access denied");
        }

        if (domain.getIsPrimary()) {
            throw new IllegalStateException("Cannot delete primary domain");
        }

        domainRepository.delete(domain);
    }

    private String generateVerificationToken() {
        byte[] token = new byte[saasProperties.getDomainVerification().getTokenLength()];
        secureRandom.nextBytes(token);
        StringBuilder sb = new StringBuilder();
        for (byte b : token) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private boolean performDnsVerification(Domain domain) {
        // TODO: Implementiere tatsächliche DNS-Verifikation
        // Für jetzt return true zur Demonstration
        log.info("Performing DNS verification for domain: {}", domain.getHost());
        return true;
    }

    private String normalizeHost(String host) {
        if (host == null) {
            return null;
        }

        String h = host.trim();
        if (h.isEmpty()) {
            return null;
        }

        // Falls aus Versehen eine URL bergeben wird
        h = h.replace("http://", "").replace("https://", "");

        // Pfad/Query-Fragmente entfernen
        int slashIdx = h.indexOf('/');
        if (slashIdx >= 0) {
            h = h.substring(0, slashIdx);
        }

        // Port entfernen
        int colonIdx = h.indexOf(':');
        if (colonIdx >= 0) {
            h = h.substring(0, colonIdx);
        }

        // Trailing dot entfernen (DNS Fully Qualified)
        while (h.endsWith(".")) {
            h = h.substring(0, h.length() - 1);
        }

        return h.toLowerCase();
    }
}
