package storebackend.dto;

import java.time.LocalDateTime;
import java.util.List;

/** DTO für Store-Rollen-Antworten (entspricht StoreRole-Interface im Frontend) */
public class StoreRoleDTO {
    public Long id;
    public Long userId;
    public String userEmail;
    public String userName;
    public Long storeId;
    public String role;
    public List<String> permissions;
    public LocalDateTime createdAt;
    public LocalDateTime updatedAt;
}

