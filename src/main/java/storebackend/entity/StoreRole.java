package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "store_roles", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"store_id", "user_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoreRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "role", nullable = false, length = 50)
    private String role;

    /** Komma-separierte Liste von Permissions, z.B. "PRODUCT_READ,ORDER_READ" */
    @Column(name = "permissions", columnDefinition = "TEXT")
    private String permissions;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /** Hilfsmethode: Permissions als Liste zurückgeben */
    public List<String> getPermissionList() {
        if (permissions == null || permissions.isBlank()) return new ArrayList<>();
        return List.of(permissions.split(","));
    }

    /** Hilfsmethode: Permissions aus Liste setzen */
    public void setPermissionList(List<String> list) {
        this.permissions = list != null ? String.join(",", list) : "";
    }
}

