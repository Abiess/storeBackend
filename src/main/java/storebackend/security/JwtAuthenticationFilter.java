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
        logger.info("=== JWT Filter - Processing request to: {} ===", requestURI);
        logger.debug("Authorization header: {}", authHeader != null ? "Present (Bearer)" : "Missing");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            logger.debug("Extracted token (first 20 chars): {}...", token.length() > 20 ? token.substring(0, 20) : token);
            try {
                String email = jwtUtil.extractEmail(token);
                logger.info("Extracted email from token: {}", email);

                if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    User user = userRepository.findByEmail(email).orElse(null);

                    if (user == null) {
                        logger.error("❌ User not found in database: {}", email);
                    } else {
                        logger.info("✅ Found user in database: {} (ID: {})", user.getEmail(), user.getId());
                        logger.debug("User roles from database: {}", user.getRoles());

                        boolean isValid = jwtUtil.validateToken(token, email);
                        logger.info("Token validation result: {}", isValid ? "VALID ✅" : "INVALID ❌");

                        if (isValid) {
                            var authorities = user.getRoles().stream()
                                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role.name()))
                                    .collect(Collectors.toList());

                            logger.info("Setting authorities: {}", authorities);

                            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                    user, null, authorities);
                            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                            SecurityContextHolder.getContext().setAuthentication(authToken);
                            logger.info("✅ Successfully authenticated user: {} with roles: {}", email, authorities);
                        } else {
                            logger.error("❌ Token validation failed for user: {}", email);
                        }
                    }
                } else if (email == null) {
                    logger.error("❌ Could not extract email from token");
                } else {
                    logger.debug("Authentication already exists in SecurityContext");
                }
            } catch (Exception e) {
                logger.error("❌ Error processing JWT token: {} - {}", e.getClass().getSimpleName(), e.getMessage());
                logger.error("Full stack trace: ", e);
            }
        } else {
            logger.debug("No Bearer token found in Authorization header for: {}", requestURI);
        }

        filterChain.doFilter(request, response);
    }
}
