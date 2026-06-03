package storebackend.dto;

import java.util.List;

/** Request-Body zum Hinzufügen/Aktualisieren einer Store-Rolle */
public class StoreRoleRequest {
    public Long userId;
    public String role;
    public List<String> permissions;
}

