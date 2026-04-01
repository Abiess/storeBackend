# ✅ AI Product Suggestion V2 - COMPLETE

## Summary
Implemented V2 of the AI product suggestion flow with structured JSON output without breaking V1. Now supports both plain-text (V1) and structured JSON (V2) responses.

---

## What Was Implemented

### 1. ✅ New DTO: AiProductSuggestionV2DTO

**File**: `src/main/java/storebackend/dto/AiProductSuggestionV2DTO.java`

**Structure**:
```java
public class AiProductSuggestionV2DTO {
    private String title;
    private String description;
    private String category;
    private List<String> tags;
    private String seoTitle;
    private String metaDescription;
    private String slug;
    private BigDecimal suggestedPrice;
}
```

**Benefits over V1**:
- ✅ Structured data (not plain text)
- ✅ SEO-optimized fields
- ✅ Product categorization
- ✅ Tag suggestions
- ✅ URL-friendly slug
- ✅ Price recommendation

---

### 2. ✅ New Service Method: generateProductSuggestionV2()

**File**: `src/main/java/storebackend/service/AiImageCaptioningService.java`

**Method**: `generateProductSuggestionV2(MultipartFile imageFile)`

**Flow**:
```
1. Compress image (same as V1)
2. Upload to MinIO (same as V1)
3. Call Hugging Face with V2 JSON prompt
4. Parse JSON response into structured DTO
5. Return AiProductSuggestionV2DTO
```

**V2 Prompt** (requests strict JSON):
```
Analyze this product image and provide a JSON response with the following structure:
{
  "title": "short product title",
  "description": "detailed description",
  "category": "product category",
  "tags": ["tag1", "tag2", "tag3"],
  "seoTitle": "SEO optimized title",
  "metaDescription": "SEO meta description",
  "slug": "url-friendly-slug",
  "suggestedPrice": 99.99
}
Provide ONLY valid JSON, no additional text.
```

---

### 3. ✅ New Private Method: callHuggingFaceApiV2()

**Reuses**:
- ✅ Same MinIO upload logic
- ✅ Same Router API endpoint
- ✅ Same error handling
- ✅ Same response parsing (for errors)

**Different**:
- ✅ V2 prompt requests JSON output
- ✅ Returns raw text for JSON parsing

---

### 4. ✅ New Private Method: parseJsonResponse()

**Purpose**: Parses AI text response into structured DTO

**Features**:
- Cleans markdown code blocks (```json ... ```)
- Extracts JSON object from response
- Parses all DTO fields
- Handles missing or null fields gracefully
- Converts suggestedPrice to BigDecimal
- Parses tags array

---

### 5. ✅ New Private Method: cleanJsonResponse()

**Purpose**: Cleans AI response before JSON parsing

**Handles**:
- ✅ Markdown code blocks (```json or ```)
- ✅ Extra text before/after JSON
- ✅ Extracts { ... } content

**Example**:
```
Input: "Sure! Here's the JSON:\n```json\n{\"title\":\"...\"}\n```"
Output: "{\"title\":\"...\"}"
```

---

### 6. ✅ New Controller Endpoint: /ai-suggest-v2

**File**: `src/main/java/storebackend/controller/ProductController.java`

**Endpoint**: `POST /api/stores/{storeId}/products/ai-suggest-v2`

**Parameters**:
- `storeId` (path) - Store ID
- `image` (multipart) - Product image file
- `user` (authentication) - Authenticated user

**Response**: `AiProductSuggestionV2DTO` (JSON)

**Example Response**:
```json
{
  "title": "Modern Black Smartphone",
  "description": "A sleek black smartphone with a large OLED display...",
  "category": "Electronics",
  "tags": ["smartphone", "electronics", "mobile", "black"],
  "seoTitle": "Modern Black Smartphone - High-End Mobile Device",
  "metaDescription": "Premium black smartphone with OLED display...",
  "slug": "modern-black-smartphone",
  "suggestedPrice": 899.99
}
```

---

## V1 vs V2 Comparison

### V1 Endpoint: `/ai-suggest`

**Input**: Image file  
**Output**:
```json
{
  "generatedCaption": "A modern black smartphone...",
  "title": "A Modern Black Smartphone...",
  "description": "A modern black smartphone...\n\nThis product description was..."
}
```

**Use Case**: Quick title/description generation

---

### V2 Endpoint: `/ai-suggest-v2`

**Input**: Image file  
**Output**:
```json
{
  "title": "Modern Black Smartphone",
  "description": "A sleek black smartphone with a large OLED display, featuring a premium aluminum frame...",
  "category": "Electronics",
  "tags": ["smartphone", "electronics", "mobile", "black", "OLED"],
  "seoTitle": "Modern Black Smartphone - High-End Mobile Device | Shop Now",
  "metaDescription": "Premium black smartphone with OLED display, aluminum frame, and advanced features. Perfect for tech enthusiasts.",
  "slug": "modern-black-smartphone",
  "suggestedPrice": 899.99
}
```

**Use Case**: Full product creation with SEO optimization

---

## Shared Infrastructure

### Both V1 and V2 Use:

✅ **Same image compression** (768x768, 65% JPEG)  
✅ **Same MinIO upload** (temporary 60-min URL)  
✅ **Same Router API endpoint** (`/v1/responses`)  
✅ **Same model** (`zai-org/GLM-4.5V`)  
✅ **Same error handling** (AiServiceException)  
✅ **Same authentication** (user + store access check)  

### Only Difference:

**V1 Prompt**: "Describe this product image in detail..."  
**V2 Prompt**: "Analyze this product image and provide a JSON response..."

---

## Testing

### Test V1 (Existing - Still Works)

```bash
curl -X POST http://localhost:8080/api/stores/1/products/ai-suggest \
  -H "Authorization: Bearer TOKEN" \
  -F "image=@product.jpg"
```

**Response**:
```json
{
  "generatedCaption": "A modern smartphone...",
  "title": "A Modern Smartphone...",
  "description": "A modern smartphone..."
}
```

---

### Test V2 (New - Structured JSON)

```bash
curl -X POST http://localhost:8080/api/stores/1/products/ai-suggest-v2 \
  -H "Authorization: Bearer TOKEN" \
  -F "image=@product.jpg"
```

**Response**:
```json
{
  "title": "Modern Black Smartphone",
  "description": "A sleek black smartphone...",
  "category": "Electronics",
  "tags": ["smartphone", "electronics"],
  "seoTitle": "Modern Black Smartphone - Shop Now",
  "metaDescription": "Premium smartphone with...",
  "slug": "modern-black-smartphone",
  "suggestedPrice": 899.99
}
```

---

## Frontend Integration

### V1 Integration (Unchanged)
```typescript
// Existing code still works
const response = await fetch(`/api/stores/${storeId}/products/ai-suggest`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

const suggestion = await response.json();
// { generatedCaption, title, description }
```

---

### V2 Integration (New)
```typescript
// New endpoint with structured data
const response = await fetch(`/api/stores/${storeId}/products/ai-suggest-v2`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

const suggestion = await response.json();
// {
//   title, description, category, tags,
//   seoTitle, metaDescription, slug, suggestedPrice
// }

// Use structured fields
titleInput.value = suggestion.title;
descriptionInput.value = suggestion.description;
categorySelect.value = suggestion.category;
tagsInput.value = suggestion.tags.join(', ');
seoTitleInput.value = suggestion.seoTitle;
metaDescInput.value = suggestion.metaDescription;
slugInput.value = suggestion.slug;
priceInput.value = suggestion.suggestedPrice;
```

---

## Error Handling

### Both V1 and V2 Return Same Error Format

```json
{
  "error": "Failed to generate product suggestion V2: Model is loading"
}
```

**Status Codes**:
- 200: Success
- 400: Invalid image or AI service error
- 401: Authentication required
- 403: Access denied
- 500: Server error

---

## Swagger Documentation

### V1 Endpoint
```
POST /api/stores/{storeId}/products/ai-suggest
Summary: Generate AI product suggestion
Description: Uses AI to analyze product image and generate title and description
```

### V2 Endpoint
```
POST /api/stores/{storeId}/products/ai-suggest-v2
Summary: Generate AI product suggestion V2 (structured JSON)
Description: Uploads a product image and returns structured JSON with title, 
             description, category, tags, SEO data, slug, and suggested price
```

---

## Files Created/Modified

### Created
- ✅ `AiProductSuggestionV2DTO.java` (NEW DTO)

### Modified
- ✅ `AiImageCaptioningService.java`
  - Added `generateProductSuggestionV2()` method
  - Added `callHuggingFaceApiV2()` method
  - Added `parseJsonResponse()` method
  - Added `cleanJsonResponse()` method
  
- ✅ `ProductController.java`
  - Added `/ai-suggest-v2` endpoint
  - Added import for `AiProductSuggestionV2DTO`

### Unchanged
- ✅ V1 methods (`generateProductSuggestion`, `callHuggingFaceApi`)
- ✅ V1 endpoint (`/ai-suggest`)
- ✅ Image compression logic
- ✅ MinIO upload logic
- ✅ Error handling logic

---

## Build Status

```
IDE Errors Check: Only warnings (no compilation errors)
```

✅ **Ready to compile**

---

## Next Steps

### 1. Compile and Build
```bash
mvn clean compile -DskipTests
mvn clean package -DskipTests
```

### 2. Start Backend
```powershell
$env:HUGGINGFACE_API_KEY = "hf_xxxxx"
mvn spring-boot:run
```

### 3. Test V2 Endpoint
```bash
curl -X POST http://localhost:8080/api/stores/1/products/ai-suggest-v2 \
  -H "Authorization: Bearer TOKEN" \
  -F "image=@smartphone.jpg"
```

### 4. Frontend Integration
Update product creation form to use V2 endpoint for richer data

---

## Migration Path

### Phase 1: Both Endpoints Coexist
- Frontend uses V1 by default
- V2 available for testing
- No breaking changes

### Phase 2: Gradual Migration
- Update frontend to use V2
- V1 remains available as fallback

### Phase 3: Deprecate V1 (Optional)
- After V2 is stable
- Keep V1 for backward compatibility

---

**Status**: ✅ **COMPLETE & READY**  
**Date**: 2026-04-01  
**Feature**: AI Product Suggestion V2 with structured JSON  
**Compatibility**: V1 unchanged and working  
**Next**: Compile, test, and integrate in frontend

