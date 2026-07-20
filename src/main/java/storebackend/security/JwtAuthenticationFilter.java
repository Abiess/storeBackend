package storebackend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import storebackend.entity.User;
import storebackend.repository.UserRepository;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public JwtAuthenticationFilter(JwtUtil jwtUtil, UserRepository userRepository, ObjectMapper objectMapper) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Prometheus-Scraping (/actuator/**) läuft alle 15 Sekunden – JWT-Filter überspringen.
     * Swagger und API-Docs brauchen ebenfalls keinen JWT-Check.
     * Public API endpoints (/api/public/**) ebenfalls überspringen.
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri.startsWith("/actuator/")
            || uri.startsWith("/actuator")
            || uri.startsWith("/swagger-ui/")
            || uri.startsWith("/swagger-ui.html")
            || uri.startsWith("/v3/api-docs/")
            || uri.startsWith("/v3/api-docs")
            || uri.startsWith("/api/public/")  // PayPal payment-methods und andere public APIs
            || uri.startsWith("/api/webhooks/");  // PayPal Webhooks (verifiziert eigene Signatur)
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        String requestURI = request.getRequestURI();
        String method = request.getMethod();

        // DEBUG statt INFO – verhindert Log-Spam bei jedem Request
        logger.debug("JWT Filter - {} {}", method, requestURI);

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            logger.debug("Bearer token present, length: {}", token.length());

            try {
                String email = jwtUtil.extractEmail(token);
                logger.debug("Extracted email from token: {}", email);

                if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    User user = userRepository.findByEmail(email).orElse(null);

                    if (user == null) {
                        logger.error("❌ User not found in database: {}", email);
                        logger.error("❌ This will result in 401 Unauthorized");
                    } else {
                        // Nur userId + email loggen – KEIN passwordHash, KEIN toString()
                        logger.debug("✅ Found user: id={}, email={}", user.getId(), user.getEmail());

                        try {
                            boolean isValid = jwtUtil.validateToken(token, email);
                            logger.debug("Token validation: {}", isValid ? "VALID" : "INVALID");

                            if (isValid) {
                                // SECURITY: Prüfe ob Email-Adresse bestätigt ist
                                if (!Boolean.TRUE.equals(user.getEmailVerified())) {
                                    logger.warn("❌ Email not verified for user: {}", email);
                                    logger.warn("❌ Access denied - returning 401 with EMAIL_NOT_VERIFIED");
                                    
                                    // Sende 401 Unauthorized mit JSON-Response
                                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                                    
                                    Map<String, String> error = new HashMap<>();
                                    error.put("code", "EMAIL_NOT_VERIFIED");
                                    error.put("message", "Please verify your email address before continuing");
                                    
                                    response.getWriter().write(objectMapper.writeValueAsString(error));
                                    return;  // Request wird HIER beendet, nicht weitergeleitet
                                }
                                
                                var authorities = user.getRoles().stream()
                                        .map(role -> {
                                            String roleName = role.name();
                                            return roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName;
                                        })
                                        .map(SimpleGrantedAuthority::new)
                                        .collect(Collectors.toList());

                                logger.debug("Setting authorities for {}: {}", email, authorities);

                                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                        user, null, authorities);
                                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                                SecurityContextHolder.getContext().setAuthentication(authToken);

                                logger.debug("✅ Authenticated: email={}, roles={}", email, authorities);
                            } else {
                                logger.error("❌ Token validation failed for user: {}", email);
                                logger.error("❌ This will result in 401 Unauthorized");
                            }
                        } catch (Exception validationEx) {
                            logger.error("❌ Exception during token validation: {}", validationEx.getMessage());
                            logger.error("❌ This will result in 401 Unauthorized");
                        }
                    }
                } else if (email == null) {
                    logger.error("❌ Could not extract email from token");
                } else {
                    logger.debug("Authentication already exists in SecurityContext: {}",
                        SecurityContextHolder.getContext().getAuthentication().getName());
                }
            } catch (Exception e) {
                logger.error("❌ Error processing JWT token: {} - {}", e.getClass().getSimpleName(), e.getMessage());
                if (logger.isDebugEnabled()) {
                    logger.debug("Full stack trace: ", e);
                }
            }
        } else {
            logger.debug("No Bearer token for {} {}", method, requestURI);
        }

        // Nur bei tatsächlichem Problem warnen
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                logger.warn("⚠️ Proceeding without valid authentication for {} {}", method, requestURI);
            }
        }

        filterChain.doFilter(request, response);
    }
}
