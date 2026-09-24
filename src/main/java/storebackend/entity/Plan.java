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

    // Explizite Setter-Methoden (falls Lombok nicht korrekt funktioniert)
    public void setName(String name) {
        this.name = name;
    }

    public void setMaxStores(Integer maxStores) {
        this.maxStores = maxStores;
    }

    public void setMaxCustomDomains(Integer maxCustomDomains) {
        this.maxCustomDomains = maxCustomDomains;
    }

    public void setMaxSubdomains(Integer maxSubdomains) {
        this.maxSubdomains = maxSubdomains;
    }

    public void setMaxStorageMb(Integer maxStorageMb) {
        this.maxStorageMb = maxStorageMb;
    }

    public void setMaxProducts(Integer maxProducts) {
        this.maxProducts = maxProducts;
    }

    public void setMaxImageCount(Integer maxImageCount) {
        this.maxImageCount = maxImageCount;
    }
}
