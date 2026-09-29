package storebackend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import storebackend.repository.UserRepository;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

class JwtAuthenticationFilterProfileTest {
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(
        mock(JwtUtil.class), mock(UserRepository.class), new ObjectMapper());

    @Test
    void authenticatesCustomerProfileEndpointsButStillSkipsPublicApis() {
        assertFalse(filter.shouldNotFilter(request("/api/public/customer/profile")));
        assertFalse(filter.shouldNotFilter(request("/api/public/customer/profile/address")));
        assertFalse(filter.shouldNotFilter(request("/api/public/customer/change-password")));
        assertTrue(filter.shouldNotFilter(request("/api/public/store/resolve")));
    }

    private MockHttpServletRequest request(String path) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI(path);
        return request;
    }
}
