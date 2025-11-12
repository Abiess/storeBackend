package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "plans")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Plan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    private Integer maxStores;

    @Column(nullable = false)
    private Integer maxCustomDomains;

    @Column(nullable = false)
    private Integer maxSubdomains;

    @Column(nullable = false)
    private Integer maxStorageMb;

    @Column(nullable = false)
    private Integer maxProducts;

    @Column(nullable = false)
    private Integer maxImageCount;
}
