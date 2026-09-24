package storebackend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import storebackend.service.MetricsService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
@RequiredArgsConstructor
@Slf4j
public class MetricsInterceptor implements HandlerInterceptor {

    private final MetricsService metricsService;
    private static final String START_TIME_ATTRIBUTE = "startTime";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        request.setAttribute(START_TIME_ATTRIBUTE, System.currentTimeMillis());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {

        long startTime = (Long) request.getAttribute(START_TIME_ATTRIBUTE);
        long duration = System.currentTimeMillis() - startTime;

        String endpoint = request.getRequestURI();
        String method = request.getMethod();
        int status = response.getStatus();

        // Response-Zeit tracken
        metricsService.recordResponseTime(endpoint, method, duration);

        // Erfolg oder Fehler tracken
        if (status >= 200 && status < 300) {
            metricsService.recordApiSuccess(endpoint, method);
        } else if (status >= 400) {
            String errorType = determineErrorType(status);
            metricsService.recordApiError(endpoint, method, status, errorType);
        }

        log.debug("📊 API Call: {} {} - Status: {} - Duration: {}ms",
                  method, endpoint, status, duration);
    }

    private String determineErrorType(int status) {
        return switch (status) {
            case 400 -> "BAD_REQUEST";
            case 401 -> "UNAUTHORIZED";
            case 403 -> "FORBIDDEN";
            case 404 -> "NOT_FOUND";
            case 500 -> "INTERNAL_ERROR";
            case 503 -> "SERVICE_UNAVAILABLE";
            default -> "ERROR_" + status;
        };
    }
}

