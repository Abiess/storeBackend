package storebackend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;
import storebackend.security.CustomAccessDeniedHandler;
import storebackend.security.CustomAuthenticationEntryPoint;
import storebackend.security.CustomUserDetailsService;
import storebackend.security.JwtAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomUserDetailsService userDetailsService;
    private final CorsConfigurationSource corsConfigurationSource;
    private final CustomAccessDeniedHandler accessDeniedHandler;
    private final CustomAuthenticationEntryPoint authenticationEntryPoint;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource))  // Verwende das injizierte Feld
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // OPTIONS requests müssen immer durchgelassen werden (CORS Preflight)
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // Auth endpoints
                .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/validate").permitAll()
                // Error endpoint - muss öffentlich sein für Spring Boot Error Handling
                .requestMatchers("/error").permitAll()
                // Public API endpoints
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/public/**").permitAll()
                // Slug-Verfügbarkeitsprüfung - öffentlich zugänglich für Registrierung
                .requestMatchers(HttpMethod.GET, "/api/me/stores/check-slug/**").permitAll()
                // Subscription plans - öffentlich sichtbar
                .requestMatchers(HttpMethod.GET, "/api/subscriptions/plans").permitAll()
                // Storefront public endpoints - Stores und Produkte können öffentlich angesehen werden
                .requestMatchers(HttpMethod.GET, "/api/stores/*/public/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/stores/public/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/stores/*").permitAll() // Allow public access to store details
                .requestMatchers(HttpMethod.GET, "/api/stores/*/products").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/stores/*/products/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/stores/*/categories").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/stores/*/categories/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/stores/by-domain/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/themes/**").permitAll()
                // Cart and Checkout - können öffentlich sein (verwenden Session)
                .requestMatchers("/api/cart/**").permitAll()
                .requestMatchers("/api/checkout/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/phone-verification/**").permitAll()
                // h2 cosnole
                .requestMatchers("/h2-console/**").permitAll()
                // Health check
                .requestMatchers("/actuator/**").permitAll()
                // Swagger UI Endpunkte
                .requestMatchers("/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/v3/api-docs/**", "/v3/api-docs").permitAll()
                .requestMatchers("/swagger-resources/**").permitAll()
                .requestMatchers("/webjars/**").permitAll()
                // Alle anderen Anfragen benötigen Authentifizierung
                // POST/PUT/DELETE zu /api/stores/*/products erfordert Authentifizierung (wird im Controller geprüft)
                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(exceptions -> exceptions
                .accessDeniedHandler(accessDeniedHandler)
                .authenticationEntryPoint(authenticationEntryPoint)
            );
        http.headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()));
        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
