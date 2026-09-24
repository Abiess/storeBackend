package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

/**
 * V2 DTO for AI product suggestions with structured data
 * Returns parsed JSON fields instead of plain text
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AiProductSuggestionV2DTO {
    private String title;
    private String description;
    private String category;
    private List<String> tags;
    private String seoTitle;
    private String metaDescription;
    private String slug;
    private BigDecimal suggestedPrice;
    
    // Explicit getters/setters for Lombok compatibility
    public String getTitle() {
        return this.title;
    }
    
    public void setTitle(String title) {
        this.title = title;
    }
    
    public String getDescription() {
        return this.description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public String getCategory() {
        return this.category;
    }
    
    public void setCategory(String category) {
        this.category = category;
    }
    
    public List<String> getTags() {
        return this.tags;
    }
    
    public void setTags(List<String> tags) {
        this.tags = tags;
    }
    
    public String getSeoTitle() {
        return this.seoTitle;
    }
    
    public void setSeoTitle(String seoTitle) {
        this.seoTitle = seoTitle;
    }
    
    public String getMetaDescription() {
        return this.metaDescription;
    }
    
    public void setMetaDescription(String metaDescription) {
        this.metaDescription = metaDescription;
    }
    
    public String getSlug() {
        return this.slug;
    }
    
    public void setSlug(String slug) {
        this.slug = slug;
    }
    
    public BigDecimal getSuggestedPrice() {
        return this.suggestedPrice;
    }
    
    public void setSuggestedPrice(BigDecimal suggestedPrice) {
        this.suggestedPrice = suggestedPrice;
    }
}

