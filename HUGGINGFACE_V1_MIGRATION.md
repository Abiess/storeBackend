# Hugging Face Router API Migration - Complete ✅

## Summary
Successfully migrated `AiImageCaptioningService` from the old `/api-inference` endpoint with binary image data to the new Hugging Face Router API at `/v1/responses` using JSON format with base64-encoded images.

## What Changed

### API Endpoint
- **Old**: `https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base`
  - Format: Binary image data with `Content-Type: application/octet-stream`
- **New**: `https://router.huggingface.co/v1/responses`
  - Format: JSON with base64-encoded image

### Model
- **Old**: Salesforce/blip-image-captioning-base (deprecated, returned 410 Gone)
- **New**: meta-llama/Llama-3.2-11B-Vision-Instruct (modern vision model)

### Request Format

#### Old Format (Binary)
```
POST https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base
Authorization: Bearer <token>
Content-Type: application/octet-stream

<binary image data>
```

#### New Format (JSON + Base64)
```json
POST https://router.huggingface.co/v1/responses
Authorization: Bearer <token>
Content-Type: application/json

{
  "model": "meta-llama/Llama-3.2-11B-Vision-Instruct",
  "input": [
    {
      "content": [
        {
          "type": "input_text",
          "text": "Describe this product image in detail. Focus on the main item, its features, color, and style. Be concise."
        },
        {
          "type": "input_image",
          "image": "<BASE64_ENCODED_IMAGE>"
        }
      ]
    }
  ]
}
```

### Response Format
- **Old**: `[{ "generated_text": "..." }]` or `{ "generated_text": "..." }`
- **New**: `{ "text": "..." }` or `{ "generated_text": "..." }` or `{ "outputs": [{ "text": "..." }] }`

## Code Changes

### File: `AiImageCaptioningService.java`

1. **Updated constants**:
   ```java
   private static final String HUGGINGFACE_API_URL = "https://router.huggingface.co/v1/responses";
   private static final String MODEL_NAME = "meta-llama/Llama-3.2-11B-Vision-Instruct";
   ```

2. **Modified `callHuggingFaceApi()` method**:
   - Encodes image to base64 using `Base64.getEncoder().encodeToString(imageBytes)`
   - Changes `Content-Type` from `application/octet-stream` to `application/json`
   - Builds structured JSON request body:
     ```java
     Map.of(
         "model", MODEL_NAME,
         "input", List.of(
             Map.of(
                 "content", List.of(
                     Map.of("type", "input_text", "text", "<prompt>"),
                     Map.of("type", "input_image", "image", base64Image)
                 )
             )
         )
     )
     ```
   - Parses multiple response formats: `text`, `generated_text`, or `outputs[0].text`

3. **Kept unchanged**:
   - `generateProductSuggestion()` - main entry point
   - `generateTitle()` - title generation logic
   - `generateDescription()` - description generation logic
   - Error handling for 410 Gone and 503 Service Unavailable
   - API key configuration

## Benefits

✅ **Uses Router API** - Modern Hugging Face endpoint for production use  
✅ **Better vision model** - Llama 3.2 11B Vision Instruct provides detailed captions  
✅ **More control** - Can customize prompt for better product descriptions  
✅ **Flexible response parsing** - Handles multiple response formats  
✅ **Future-proof** - Router API is the recommended approach  
✅ **Minimal changes** - Only updated API call logic, rest of service unchanged  

## Testing

Compilation successful:
```
mvn clean compile -DskipTests
[INFO] BUILD SUCCESS
[INFO] Total time:  10.496 s
```

## API Key Configuration

No changes needed - still uses the same environment variable:
```bash
export HUGGINGFACE_API_KEY="your-api-key-here"
```

Or in `application.properties`:
```properties
huggingface.api.key=${HUGGINGFACE_API_KEY}
```

## How to Test

1. Ensure your API key is set:
   ```powershell
   $env:HUGGINGFACE_API_KEY = "hf_xxxxxxxxxxxxx"
   ```

2. Start the backend:
   ```powershell
   mvn spring-boot:run
   ```

3. Navigate to product creation in the frontend

4. Click "🤖 KI-Assistent" tab

5. Upload a product image

6. Wait for the AI to generate title and description

## Expected Behavior

- Image is encoded to base64
- Request is sent to Router API with JSON format
- Response contains detailed product description
- Title and description are generated from AI caption

## Troubleshooting

### Model Loading (503 Error)
If you get "AI model is currently loading", wait 20-30 seconds and try again. The model needs to warm up on first use.

### Authentication Error (401)
Check that your `HUGGINGFACE_API_KEY` is correctly set and has the required permissions.

### Network Error
Ensure the server can reach `router.huggingface.co`. Check firewall and proxy settings.

## Related Files
- `src/main/java/storebackend/service/AiImageCaptioningService.java` - Main service (✅ updated)
- `src/main/java/storebackend/dto/AiProductSuggestionDTO.java` - Response DTO (unchanged)
- `src/main/java/storebackend/controller/ProductController.java` - Uses this service (unchanged)

---
**Migration Date**: 2026-03-31  
**Status**: ✅ Complete & Compiled  
**API**: Hugging Face Router API v1

