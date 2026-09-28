package storebackend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import storebackend.enums.DomainType;
import storebackend.repository.DomainRepository;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import storebackend.security.AppAccessInterceptor;

import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final MetricsInterceptor metricsInterceptor;
    private final AppAccessInterceptor appAccessInterceptor;

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(metricsInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/actuator/**", "/swagger-ui/**", "/v3/api-docs/**");

        // Phase 3: App-Entitlement-Enforcement (zusätzliche äußere Schranke,
        // greift nur bei mit @RequiresApp annotierten Controllern/Methoden).
        registry.addInterceptor(appAccessInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/actuator/**", "/swagger-ui/**", "/v3/api-docs/**");
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(DomainRepository domainRepository) {
        CorsConfiguration configuration = new CorsConfiguration();

        // WICHTIG: Für Wildcard-Subdomains mit allowCredentials
        // müssen wir setAllowedOriginPatterns verwenden
        configuration.setAllowedOriginPatterns(Arrays.asList(
            "http://localhost:*",              // Local development (alle Ports)
            "https://localhost:*",             // Local development HTTPS
            "http://*.localhost:*",            // Local subdomains
            "https://*.localhost:*",           // Local subdomains HTTPS
            // Mobile Factory M2 – Capacitor Android/iOS (WebView-Origin OHNE Port):
            // "https://localhost:*" matcht NICHT "https://localhost" (kein Port),
            // da simpleMatch das literale ":" im Pattern verlangt. Capacitor sendet
            // aber exakt "https://localhost" als Origin (server.androidScheme: 'https',
            // kein server.url gesetzt) -> ohne diesen Eintrag 403 auf den Preflight.
            "https://localhost",               // Capacitor Android/iOS WebView (kein Port)
            "https://markt.ma",                // Production frontend
            "http://markt.ma",                 // Production frontend (HTTP)
            "https://www.markt.ma",            // Production frontend with www
            "http://www.markt.ma",             // Production frontend with www (HTTP)
            "https://*.markt.ma",              // ALLE Subdomains von markt.ma (inkl. dsfsdfds.markt.ma)
            "http://*.markt.ma" ,               // ALLE Subdomains von markt.ma (HTTP)

          // ✅ NEU: Für Testing mit Claude.ai
          "https://claude.ai",
          "https://*.claude.ai"
        ));

        // Erlaubte HTTP-Methoden
        configuration.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"
        ));

        // Erlaubte Headers - alle erlauben
        configuration.setAllowedHeaders(List.of("*"));

        // Credentials erlauben - funktioniert MIT allowedOriginPatterns
        configuration.setAllowCredentials(true);

        // Exposed Headers (für Client-Zugriff)
        configuration.setExposedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Credentials"
        ));

        // Max Age für Preflight-Requests (1 Stunde)
        configuration.setMaxAge(3600L);

        CorsConfiguration platformConfiguration = configuration;
        return request -> {
            String origin = request.getHeader("Origin");
            CorsConfiguration requestConfiguration = new CorsConfiguration();
            requestConfiguration.setAllowedOriginPatterns(platformConfiguration.getAllowedOriginPatterns());
            requestConfiguration.setAllowedMethods(platformConfiguration.getAllowedMethods());
            requestConfiguration.setAllowedHeaders(platformConfiguration.getAllowedHeaders());
            requestConfiguration.setExposedHeaders(platformConfiguration.getExposedHeaders());
            requestConfiguration.setAllowCredentials(platformConfiguration.getAllowCredentials());
            requestConfiguration.setMaxAge(platformConfiguration.getMaxAge());
            if (origin != null) {
                try {
                    URI originUri = URI.create(origin);
                    String host = originUri.getHost();
                    if ("https".equalsIgnoreCase(originUri.getScheme()) && host != null
                            && originUri.getPort() == -1 && originUri.getRawUserInfo() == null
                            && domainRepository.findActiveVerifiedDomainByHost(host.toLowerCase(Locale.ROOT))
                                    .map(domain -> domain.getType() == DomainType.CUSTOM)
                                    .orElse(false)) {
                        requestConfiguration.addAllowedOrigin(origin);
                    }
                } catch (IllegalArgumentException ignored) {
                    // Invalid Origin is not granted a dynamic CORS exception.
                }
            }
            return requestConfiguration;
        };
    }
}
