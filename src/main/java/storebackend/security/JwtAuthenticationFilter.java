package storebackend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import storebackend.entity.User;
import storebackend.repository.UserRepository;

import java.io.IOException;
import java.util.stream.Collectors;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtUtil jwtUtil, UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        String requestURI = request.getRequestURI();
        String method = request.getMethod();

        logger.info("=== JWT Filter - {} {} ===", method, requestURI);

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            logger.debug("Bearer token present, length: {}", token.length());

            try {
                String email = jwtUtil.extractEmail(token);
                logger.info("Extracted email from token: {}", email);

                if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    User user = userRepository.findByEmail(email).orElse(null);

                    if (user == null) {
                        logger.error("❌ User not found in database: {}", email);
                        logger.error("❌ This will result in 401 Unauthorized");
                    } else {
                        logger.info("✅ Found user in database: {} (ID: {})", user.getEmail(), user.getId());
                        logger.debug("User roles from database: {}", user.getRoles());

                        try {
                            boolean isValid = jwtUtil.validateToken(token, email);
                            logger.info("Token validation result: {}", isValid ? "VALID ✅" : "INVALID ❌");

                            if (isValid) {
                                var authorities = user.getRoles().stream()
                                        .map(role -> {
                                            String roleName = role.name();
                                            // Nur ROLE_ hinzufügen, wenn es noch nicht vorhanden ist
                                            return roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName;
                                        })
                                        .map(SimpleGrantedAuthority::new)
                                        .collect(Collectors.toList());

                                logger.info("Setting authorities: {}", authorities);

                                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                        user, null, authorities);
                                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                                SecurityContextHolder.getContext().setAuthentication(authToken);

                                logger.info("✅ Successfully authenticated user: {} with roles: {}", email, authorities);
                                logger.info("✅ SecurityContext now contains: {}",
                                    SecurityContextHolder.getContext().getAuthentication().getName());
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
                    logger.error("❌ This will result in 401 Unauthorized");
                } else {
                    logger.debug("Authentication already exists in SecurityContext: {}",
                        SecurityContextHolder.getContext().getAuthentication().getName());
                }
            } catch (Exception e) {
                logger.error("❌ Error processing JWT token: {} - {}", e.getClass().getSimpleName(), e.getMessage());
                logger.error("❌ This will result in 401 Unauthorized");
                if (logger.isDebugEnabled()) {
                    logger.debug("Full stack trace: ", e);
                }
            }
        } else {
            logger.debug("No Bearer token in Authorization header for {} {}", method, requestURI);
            logger.debug("This endpoint will require authentication if not public");
        }

        // Überprüfe vor dem Weiterleiten den SecurityContext-Status
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                logger.info("✅ Proceeding with authenticated user: {}", auth.getName());
            } else {
                logger.warn("⚠️ Proceeding without authentication - may result in 401");
            }
        }

        filterChain.doFilter(request, response);
    }
}
