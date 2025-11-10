package storebackend.dto;

import lombok.Data;
import storebackend.enums.Role;

import java.time.LocalDateTime;
import java.util.Set;

@Data
public class UserDTO {
    private Long id;
    private String email;
    private Set<Role> roles;
    private String planName;
    private LocalDateTime createdAt;
}

