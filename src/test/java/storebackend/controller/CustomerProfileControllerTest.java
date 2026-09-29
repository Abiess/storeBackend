package storebackend.controller;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import storebackend.dto.CustomerProfileDTO;
import storebackend.entity.User;
import storebackend.service.CustomerProfileService;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class CustomerProfileControllerTest {
    private final CustomerProfileService service = mock(CustomerProfileService.class);
    private final CustomerProfileController controller = new CustomerProfileController(service);

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void anonymousPrincipalGetsUnauthorizedInsteadOfServerError() {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("anonymousUser", null, java.util.List.of()));

        assertEquals(401, controller.getProfile().getStatusCode().value());
        verifyNoInteractions(service);
    }

    @Test
    void authenticatedUserCanLoadProfile() {
        User user = new User();
        user.setId(42L);
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(user, null, java.util.List.of()));
        CustomerProfileDTO profile = new CustomerProfileDTO();
        when(service.getOrCreateProfile(42L)).thenReturn(profile);

        var response = controller.getProfile();

        assertEquals(200, response.getStatusCode().value());
        assertEquals(profile, response.getBody());
    }
}
