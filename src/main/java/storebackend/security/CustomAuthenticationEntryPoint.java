package storebackend.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Slf4j
public class CustomAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException, ServletException {

        log.error("=== 401/403 AUTHENTICATION FAILED ===");
        log.error("Request URI: {} {}", request.getMethod(), request.getRequestURI());
        log.error("Authorization Header: {}", request.getHeader("Authorization") != null ? "Present" : "Missing");
        log.error("SecurityContext Authentication: {}",
            SecurityContextHolder.getContext().getAuthentication() != null ?
            SecurityContextHolder.getContext().getAuthentication().getName() : "NULL");
        log.error("Exception: {}", authException.getMessage());
        log.error("Exception Type: {}", authException.getClass().getSimpleName());

        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Authentication Failed: " + authException.getMessage());
    }
}
