package storebackend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import storebackend.dto.seo.RedirectResolveResponse;
import storebackend.service.StoreService;
import storebackend.service.seo.RedirectService;

import java.io.IOException;

/**
 * WebFilter that intercepts requests and applies redirect rules.
 * Issues real HTTP 301/302 redirects for SEO purposes.
 * Only applies to public storefront routes (not /api or /admin).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RedirectFilter extends OncePerRequestFilter {

    private final RedirectService redirectService;
    private final StoreService storeService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();

        // Skip API, admin, and public endpoints
        if (path.startsWith("/api/") ||
            path.startsWith("/admin/") ||
            path.startsWith("/public/")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Resolve store from host
        String host = request.getHeader("Host");
        if (host == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            var storeConfig = storeService.resolveStoreByHost(host);
            if (storeConfig == null) {
                filterChain.doFilter(request, response);
                return;
            }

            // Check for redirect rule
            RedirectResolveResponse redirect = redirectService.resolve(
                storeConfig.getStoreId(),
                storeConfig.getDomainId(),
                path
            );

            if (redirect.isFound()) {
                log.debug("Applying redirect: {} -> {} ({})", path, redirect.getTargetUrl(), redirect.getHttpCode());

                // Issue real HTTP redirect
                response.setStatus(redirect.getHttpCode());
                response.setHeader("Location", redirect.getTargetUrl());
                response.setHeader("Cache-Control", "no-cache");
                return;
            }
        } catch (Exception e) {
            log.error("Error checking redirects for path: {}", path, e);
        }

        // No redirect found, continue
        filterChain.doFilter(request, response);
    }
}

