package storebackend.service.seo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import storebackend.entity.SitemapConfig;
import storebackend.repository.ProductRepository;
import storebackend.repository.SitemapConfigRepository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Service for generating XML sitemaps per store/domain.
 * Supports pagination and multiple content types.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SitemapService {

    private final SitemapConfigRepository sitemapConfigRepository;
    private final ProductRepository productRepository;
    private final SeoSettingsService seoSettingsService;

    /**
     * Get or create sitemap configuration.
     */
    public SitemapConfig getConfig(Long storeId, Long domainId) {
        if (domainId != null) {
            return sitemapConfigRepository.findByStoreIdAndDomainId(storeId, domainId)
                    .orElseGet(() -> sitemapConfigRepository.findByStoreIdAndDomainIdIsNull(storeId)
                            .orElse(createDefaultConfig(storeId)));
        }
        return sitemapConfigRepository.findByStoreIdAndDomainIdIsNull(storeId)
                .orElse(createDefaultConfig(storeId));
    }

    /**
     * Generate sitemap index XML.
     */
    public String generateSitemapIndex(Long storeId, Long domainId, String baseUrl) {
        SitemapConfig config = getConfig(storeId, domainId);
        StringBuilder xml = new StringBuilder();

        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<sitemapindex xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        if (config.getIncludeProducts()) {
            long productCount = productRepository.countByStoreId(storeId);
            int pages = (int) Math.ceil((double) productCount / config.getSplitThreshold());
            for (int i = 1; i <= pages; i++) {
                xml.append(sitemapEntry(baseUrl + "/sitemap-products.xml?page=" + i));
            }
        }

        if (config.getIncludeCollections()) {
            xml.append(sitemapEntry(baseUrl + "/sitemap-collections.xml"));
        }

        if (config.getIncludeBlog()) {
            xml.append(sitemapEntry(baseUrl + "/sitemap-blog.xml"));
        }

        if (config.getIncludePages()) {
            xml.append(sitemapEntry(baseUrl + "/sitemap-pages.xml"));
        }

        xml.append("</sitemapindex>");
        return xml.toString();
    }

    /**
     * Generate product sitemap page.
     */
    public String generateProductSitemap(Long storeId, int page, String canonicalBase) {
        SitemapConfig config = getConfig(storeId, null);
        int offset = (page - 1) * config.getSplitThreshold();

        // Fetch products with pagination
        var products = productRepository.findByStoreId(storeId); // Add pagination in real implementation

        StringBuilder xml = new StringBuilder();
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        products.stream()
                .skip(offset)
                .limit(config.getSplitThreshold())
                .forEach(product -> {
                    String url = canonicalBase + "/products/" + product.getSlug();
                    xml.append(urlEntry(url, product.getUpdatedAt(), "weekly", "0.8"));
                });

        xml.append("</urlset>");
        return xml.toString();
    }

    /**
     * Generate robots.txt based on SEO settings.
     */
    public String generateRobotsTxt(Long storeId, Long domainId, String sitemapUrl) {
        var settings = seoSettingsService.getEffectiveSettings(storeId, domainId);

        StringBuilder txt = new StringBuilder();
        txt.append("User-agent: *\n");

        if (settings.getRobotsIndex()) {
            txt.append("Allow: /\n");
        } else {
            txt.append("Disallow: /\n");
        }

        txt.append("\n");
        txt.append("Sitemap: ").append(sitemapUrl).append("\n");

        return txt.toString();
    }

    private SitemapConfig createDefaultConfig(Long storeId) {
        return SitemapConfig.builder()
                .storeId(storeId)
                .includeProducts(true)
                .includeCollections(true)
                .includeBlog(true)
                .includePages(true)
                .splitThreshold(5000)
                .build();
    }

    private String sitemapEntry(String loc) {
        return "  <sitemap>\n" +
               "    <loc>" + escapeXml(loc) + "</loc>\n" +
               "    <lastmod>" + now() + "</lastmod>\n" +
               "  </sitemap>\n";
    }

    private String urlEntry(String loc, LocalDateTime lastmod, String changefreq, String priority) {
        return "  <url>\n" +
               "    <loc>" + escapeXml(loc) + "</loc>\n" +
               "    <lastmod>" + format(lastmod) + "</lastmod>\n" +
               "    <changefreq>" + changefreq + "</changefreq>\n" +
               "    <priority>" + priority + "</priority>\n" +
               "  </url>\n";
    }

    private String now() {
        return LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
    }

    private String format(LocalDateTime dt) {
        return dt != null ? dt.format(DateTimeFormatter.ISO_LOCAL_DATE) : now();
    }

    private String escapeXml(String text) {
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&apos;");
    }
}
package storebackend.service.seo;

import com.github.mustachejava.DefaultMustacheFactory;
import com.github.mustachejava.Mustache;
import com.github.mustachejava.MustacheFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.seo.StructuredDataTemplateDTO;
import storebackend.entity.StructuredDataTemplate;
import storebackend.repository.StructuredDataTemplateRepository;

import java.io.StringReader;
import java.io.StringWriter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service for managing JSON-LD structured data templates.
 * Uses Mustache for variable substitution (e.g., {{product.title}}).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StructuredDataService {

    private final StructuredDataTemplateRepository templateRepository;
    private final MustacheFactory mustacheFactory = new DefaultMustacheFactory();

    /**
     * Get all templates for a store.
     */
    public List<StructuredDataTemplateDTO> getTemplates(Long storeId) {
        return templateRepository.findByStoreIdOrderByTypeAsc(storeId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get active templates only.
     */
    public List<StructuredDataTemplateDTO> getActiveTemplates(Long storeId) {
        return templateRepository.findByStoreIdAndIsActiveTrue(storeId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Create or update template.
     */
    @Transactional
    public StructuredDataTemplateDTO saveTemplate(StructuredDataTemplateDTO dto) {
        StructuredDataTemplate entity;

        if (dto.getId() != null) {
            entity = templateRepository.findById(dto.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Template not found"));
        } else {
            entity = new StructuredDataTemplate();
        }

        entity.setStoreId(dto.getStoreId());
        entity.setType(dto.getType());
        entity.setTemplateJson(dto.getTemplateJson());
        entity.setIsActive(dto.getIsActive());

        entity = templateRepository.save(entity);
        return mapToDTO(entity);
    }

    /**
     * Delete template.
     */
    @Transactional
    public void deleteTemplate(Long id) {
        templateRepository.deleteById(id);
    }

    /**
     * Render template with context variables using Mustache.
     * Example: {{product.title}} -> "Cool Hoodie"
     */
    public String render(String templateJson, Map<String, Object> context) {
        try {
            Mustache mustache = mustacheFactory.compile(new StringReader(templateJson), "template");
            StringWriter writer = new StringWriter();
            mustache.execute(writer, context);
            return writer.toString();
        } catch (Exception e) {
            log.error("Failed to render structured data template", e);
            throw new RuntimeException("Template rendering failed: " + e.getMessage());
        }
    }

    /**
     * Create default templates for a new store.
     */
    @Transactional
    public void createDefaultTemplates(Long storeId) {
        // Product template
        templateRepository.save(StructuredDataTemplate.builder()
                .storeId(storeId)
                .type(StructuredDataTemplate.TemplateType.PRODUCT)
                .templateJson(getDefaultProductTemplate())
                .isActive(true)
                .build());

        // Organization template
        templateRepository.save(StructuredDataTemplate.builder()
                .storeId(storeId)
                .type(StructuredDataTemplate.TemplateType.ORGANIZATION)
                .templateJson(getDefaultOrganizationTemplate())
                .isActive(true)
                .build());

        // Breadcrumb template
        templateRepository.save(StructuredDataTemplate.builder()
                .storeId(storeId)
                .type(StructuredDataTemplate.TemplateType.BREADCRUMB)
                .templateJson(getDefaultBreadcrumbTemplate())
                .isActive(true)
                .build());
    }

    private String getDefaultProductTemplate() {
        return """
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "{{product.title}}",
          "description": "{{product.description}}",
          "image": ["{{product.imageUrl}}"],
          "sku": "{{product.sku}}",
          "offers": {
            "@type": "Offer",
            "priceCurrency": "{{currency}}",
            "price": "{{price}}",
            "availability": "https://schema.org/{{availability}}",
            "url": "{{absoluteUrl}}"
          },
          "brand": {
            "@type": "Brand",
            "name": "{{store.siteName}}"
          }
        }
        """;
    }

    private String getDefaultOrganizationTemplate() {
        return """
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "{{store.siteName}}",
          "url": "{{store.url}}",
          "logo": "{{store.logoUrl}}",
          "sameAs": [
            "{{social.facebook}}",
            "{{social.instagram}}",
            "{{social.twitter}}"
          ]
        }
        """;
    }

    private String getDefaultBreadcrumbTemplate() {
        return """
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            {{#breadcrumbs}}
            {
              "@type": "ListItem",
              "position": {{position}},
              "name": "{{name}}",
              "item": "{{url}}"
            }{{^last}},{{/last}}
            {{/breadcrumbs}}
          ]
        }
        """;
    }

    private StructuredDataTemplateDTO mapToDTO(StructuredDataTemplate entity) {
        return StructuredDataTemplateDTO.builder()
                .id(entity.getId())
                .storeId(entity.getStoreId())
                .type(entity.getType())
                .templateJson(entity.getTemplateJson())
                .isActive(entity.getIsActive())
                .build();
    }
}

