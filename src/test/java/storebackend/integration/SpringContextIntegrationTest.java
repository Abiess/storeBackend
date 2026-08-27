package storebackend.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@DisplayName("Spring Context Integration Test")
public class SpringContextIntegrationTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private RequestMappingHandlerMapping requestMappingHandlerMapping;

    @Test
    @DisplayName("Spring Context startet erfolgreich")
    void contextLoads() {
        assertNotNull(applicationContext);
        assertNotNull(requestMappingHandlerMapping);
    }

    @Test
    @DisplayName("DHL Slot-Endpunkte eindeutig in DhlSlotController")
    void dhlSlotEndpointsUnique() {
        Map<RequestMappingInfo, HandlerMethod> handlerMethods = 
            requestMappingHandlerMapping.getHandlerMethods();

        List<String> slotEndpoints = handlerMethods.entrySet().stream()
            .filter(entry -> entry.getKey().getPatternsCondition() != null 
                && entry.getKey().getPatternsCondition().getPatterns().stream()
                    .anyMatch(p -> p.contains("/dhl/slots")))
            .map(entry -> {
                String pattern = entry.getKey().getPatternsCondition().getPatterns().iterator().next();
                String controller = entry.getValue().getBeanType().getSimpleName();
                return String.format("%s -> %s", pattern, controller);
            })
            .collect(Collectors.toList());

        long otherControllerCount = slotEndpoints.stream()
            .filter(e -> !e.contains("DhlSlotController"))
            .count();

        if (otherControllerCount > 0) {
            fail("DHL Slot-Endpunkte außerhalb von DhlSlotController gefunden");
        }

        assertTrue(slotEndpoints.size() >= 4);
    }
}
