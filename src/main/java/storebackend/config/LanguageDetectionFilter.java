package storebackend.config;

import jakarta.servlet.*;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Order(1)
public class LanguageDetectionFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String resolvedLanguage = detectLanguage(httpRequest);

        // Setze resolved language als Request Attribute
        httpRequest.setAttribute("resolvedLanguage", resolvedLanguage);

        // Setze Response Header
        httpResponse.setHeader("X-Resolved-Language", resolvedLanguage);

        chain.doFilter(request, response);
    }

    private String detectLanguage(HttpServletRequest request) {
        // Priorität 1: Cookie
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (LanguageConfig.COOKIE_NAME.equals(cookie.getName())) {
                    String lang = cookie.getValue();
                    if (LanguageConfig.isSupported(lang)) {
                        return lang;
                    }
                }
            }
        }

        // Priorität 2: Accept-Language Header
        String acceptLanguage = request.getHeader("Accept-Language");
        if (acceptLanguage != null && !acceptLanguage.isEmpty()) {
            String detected = LanguageConfig.parseAcceptLanguage(acceptLanguage);
            if (LanguageConfig.isSupported(detected)) {
                return detected;
            }
        }

        // Fallback
        return LanguageConfig.DEFAULT_LANGUAGE;
    }
}

