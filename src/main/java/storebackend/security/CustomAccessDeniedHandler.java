package storebackend.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Slf4j
public class CustomAccessDeniedHandler implements AccessDeniedHandler {

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException, ServletException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        log.error("=== 403 ACCESS DENIED ===");
        log.error("Request URI: {} {}", request.getMethod(), request.getRequestURI());
        log.error("Authentication: {}", auth != null ? auth.getName() : "NULL");
        log.error("Authorities: {}", auth != null ? auth.getAuthorities() : "NONE");
        log.error("Is Authenticated: {}", auth != null && auth.isAuthenticated());
        log.error("Exception: {}", accessDeniedException.getMessage());
        log.error("Authorization Header: {}", request.getHeader("Authorization") != null ? "Present" : "Missing");

        response.sendError(HttpServletResponse.SC_FORBIDDEN, "Access Denied: " + accessDeniedException.getMessage());
    }
}

