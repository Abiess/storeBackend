package storebackend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;
import storebackend.entity.DhlParcel;
import storebackend.entity.DhlShelfSlot;
import storebackend.entity.Order;
import storebackend.entity.User;
import storebackend.enums.AppKey;
import storebackend.enums.AppScopeSource;
import storebackend.repository.DhlParcelRepository;
import storebackend.repository.DhlShelfSlotRepository;
import storebackend.repository.OrderRepository;
import storebackend.util.AppAccessChecker;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Phase 3 (Backend App-Isolation).
 *
 * Zentrale, einmalige Durchsetzung des App-Zugriffs für alle mit
 * {@link RequiresApp} annotierten Controller/Methoden. Ersetzt NICHTS
 * Bestehendes:
 * <ul>
 *   <li>Spring Security (JwtAuthenticationFilter, SecurityConfig) validiert
 *       Auth/JWT weiterhin unverändert VOR diesem Interceptor.</li>
 *   <li>{@code StoreAccessChecker} / {@code @PreAuthorize} / {@code StoreRole.permissions}
 *       laufen unverändert danach in der Business-Methode weiter.</li>
 * </ul>
 * Dieser Interceptor prüft ausschließlich die zusätzliche äußere Schranke
 * "App-Zugriff" mittels des bestehenden {@link AppAccessChecker} (Phase 1).
 *
 * Endpunkte OHNE {@link RequiresApp} (weder Methode noch Klasse) sind von
 * diesem Interceptor unberührt - für sie gilt exakt das bisherige Verhalten
 * (PLATFORM_SHARED/PUBLIC).
 *
 * Sicherheitsgrundsatz: Kann der Scope einer STORE-App nicht zweifelsfrei
 * aufgelöst werden, wird IMMER verweigert (deny-by-default) - niemals
 * stillschweigend "User hat irgendwo Zugriff" angenommen.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AppAccessInterceptor implements HandlerInterceptor {

    private final AppAccessChecker appAccessChecker;
    private final OrderRepository orderRepository;
    private final DhlParcelRepository dhlParcelRepository;
    private final DhlShelfSlotRepository dhlShelfSlotRepository;
    private final ObjectMapper objectMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }

        RequiresApp requiresApp = handlerMethod.getMethodAnnotation(RequiresApp.class);
        if (requiresApp == null) {
            requiresApp = handlerMethod.getBeanType().getAnnotation(RequiresApp.class);
        }
        if (requiresApp == null) {
            // Kein App-Gate deklariert -> PLATFORM_SHARED/PUBLIC, bestehendes Verhalten unverändert.
            return true;
        }

        AppKey app = requiresApp.value();

        User user = resolveCurrentUser();
        if (user == null) {
            // Bei .authenticated()-Endpunkten hat Spring Security dies bereits
            // ausgeschlossen; defensiv trotzdem verweigern statt stillschweigend erlauben.
            log.warn("[APP-ACCESS-DENIED] Kein authentifizierter User für App {} auflösbar", app);
            denyAccess(response, app);
            return false;
        }

        Long storeId;
        try {
            storeId = resolveStoreId(requiresApp, request);
        } catch (ScopeUnresolvableException ex) {
            log.warn("[APP-ACCESS-DENIED] Scope für App {} ({}) nicht auflösbar: {}",
                    app, requiresApp.scope(), ex.getMessage());
            denyAccess(response, app);
            return false;
        }

        boolean allowed;
        try {
            allowed = appAccessChecker.hasAppAccess(user.getId(), storeId, app);
        } catch (IllegalArgumentException ex) {
            // Scope/AppKey-Inkonsistenz (siehe AppAccessChecker.validateScope) -> deny, nicht allow.
            log.warn("[APP-ACCESS-DENIED] Scope-Validierung fehlgeschlagen für App {}: {}", app, ex.getMessage());
            denyAccess(response, app);
            return false;
        }

        if (!allowed) {
            denyAccess(response, app);
            return false;
        }

        return true;
    }

    private Long resolveStoreId(RequiresApp requiresApp, HttpServletRequest request) {
        AppScopeSource source = requiresApp.scope();

        return switch (source) {
            case NONE -> null;
            case STORE_ID_PARAM -> requirePathVariableAsLong(request, paramName(requiresApp, "storeId"));
            case ORDER_ID_PARAM -> {
                Long orderId = requirePathVariableAsLong(request, paramName(requiresApp, "orderId"));
                Order order = orderRepository.findById(orderId)
                        .orElseThrow(() -> new ScopeUnresolvableException("Order " + orderId + " nicht gefunden"));
                yield order.getStore().getId();
            }
            case DHL_PARCEL_ID_PARAM -> {
                Long parcelId = requirePathVariableAsLong(request, paramName(requiresApp, "parcelId"));
                DhlParcel parcel = dhlParcelRepository.findById(parcelId)
                        .orElseThrow(() -> new ScopeUnresolvableException("DhlParcel " + parcelId + " nicht gefunden"));
                yield parcel.getStore().getId();
            }
            case DHL_SLOT_ID_PARAM -> {
                Long slotId = requirePathVariableAsLong(request, paramName(requiresApp, "slotId"));
                DhlShelfSlot slot = dhlShelfSlotRepository.findById(slotId)
                        .orElseThrow(() -> new ScopeUnresolvableException("DhlShelfSlot " + slotId + " nicht gefunden"));
                yield slot.getStore().getId();
            }
        };
    }

    private String paramName(RequiresApp requiresApp, String defaultName) {
        return requiresApp.paramName().isBlank() ? defaultName : requiresApp.paramName();
    }

    @SuppressWarnings("unchecked")
    private Long requirePathVariableAsLong(HttpServletRequest request, String name) {
        Object attribute = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
        if (!(attribute instanceof Map<?, ?> variables)) {
            throw new ScopeUnresolvableException("Keine Pfad-Parameter im Request vorhanden");
        }
        Object raw = variables.get(name);
        if (raw == null) {
            throw new ScopeUnresolvableException("Pfad-Parameter '" + name + "' fehlt");
        }
        try {
            return Long.valueOf(raw.toString());
        } catch (NumberFormatException ex) {
            throw new ScopeUnresolvableException("Pfad-Parameter '" + name + "' ist keine gültige ID: " + raw);
        }
    }

    private User resolveCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        return (principal instanceof User user) ? user : null;
    }

    private void denyAccess(HttpServletResponse response, AppKey app) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", "APP_ACCESS_DENIED");
        body.put("app", app.name());
        body.put("message", "Access to this app is not allowed");

        objectMapper.writeValue(response.getWriter(), body);
    }

    /**
     * Interner Marker: Scope konnte anhand der Annotation nicht zweifelsfrei
     * aufgelöst werden -> führt IMMER zu einer Ablehnung (deny-by-default),
     * niemals zu einem stillschweigenden "allow".
     */
    private static class ScopeUnresolvableException extends RuntimeException {
        ScopeUnresolvableException(String message) {
            super(message);
        }
    }
}
