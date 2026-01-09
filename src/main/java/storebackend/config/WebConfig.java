package storebackend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final MetricsInterceptor metricsInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(metricsInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/actuator/**", "/swagger-ui/**", "/v3/api-docs/**");
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Erlaubte Origins - Frontend-Domains
        configuration.setAllowedOriginPatterns(Arrays.asList(
            "http://localhost:*",              // Local development (alle Ports)
            "https://markt.ma",                // Production frontend
            "http://markt.ma",                 // Production frontend (HTTP)
            "https://www.markt.ma",            // Production frontend with www
            "http://www.markt.ma",             // Production frontend with www (HTTP)
            "https://*.markt.ma",              // Alle Subdomains von markt.ma
            "http://*.markt.ma",               // Alle Subdomains von markt.ma (HTTP)
            "https://api.markt.ma",            // Backend domain
            "http://api.markt.ma"              // Backend domain (HTTP)
        ));

        // Erlaubte HTTP-Methoden
        configuration.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));

        // Erlaubte Headers
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "Accept",
            "Origin",
            "X-Requested-With",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers"
        ));

        // Credentials erlauben (für Cookies/Auth-Headers)
        configuration.setAllowCredentials(true);

        // Exposed Headers (für Client-Zugriff)
        configuration.setExposedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "Access-Control-Allow-Origin"
        ));

        // Max Age für Preflight-Requests (1 Stunde)
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
