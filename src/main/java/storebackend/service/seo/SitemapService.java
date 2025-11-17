package storebackend.service.seo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import storebackend.entity.SitemapConfig;
import storebackend.repository.ProductRepository;
import storebackend.repository.SitemapConfigRepository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class SitemapService {

    private final SitemapConfigRepository sitemapConfigRepository;
    private final ProductRepository productRepository;
    private final SeoSettingsService seoSettingsService;

    public SitemapConfig getConfig(Long storeId, Long domainId) {
        if (domainId != null) {
            return sitemapConfigRepository.findByStoreIdAndDomainId(storeId, domainId)
                    .orElseGet(() -> sitemapConfigRepository.findByStoreIdAndDomainIdIsNull(storeId)
                            .orElse(createDefaultConfig(storeId)));
        }
        return sitemapConfigRepository.findByStoreIdAndDomainIdIsNull(storeId)
                .orElse(createDefaultConfig(storeId));
    }

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

    public String generateProductSitemap(Long storeId, int page, String canonicalBase) {
        SitemapConfig config = getConfig(storeId, null);
        int offset = (page - 1) * config.getSplitThreshold();

        var products = productRepository.findByStoreId(storeId);

        StringBuilder xml = new StringBuilder();
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

//        products.stream()
//                .skip(offset)
//                .limit(config.getSplitThreshold())
//                .forEach(product -> {
//                    String url = canonicalBase + "/products/" + product.getSlug();
//                    xml.append(urlEntry(url, product.getUpdatedAt(), "weekly", "0.8"));
//                });

        xml.append("</urlset>");
        return xml.toString();
    }

    public String generateRobotsTxt(Long storeId, Long domainId, String sitemapUrl) {
        var settings = seoSettingsService.getEffectiveSettings(storeId, domainId);

        StringBuilder txt = new StringBuilder();
        txt.append("User-agent: *\n");

//        if (settings.getRobotsIndex()) {
//            txt.append("Allow: /\n");
//        } else {
//            txt.append("Disallow: /\n");
//        }

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

