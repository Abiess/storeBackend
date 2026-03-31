# Hugging Face API Key Setup Guide

## Quick Start

To enable the AI-assisted product creation feature, you need to configure the Hugging Face API key.

---

## Step 1: Get Your API Key

1. Go to **https://huggingface.co**
2. Click **Sign Up** (or **Login** if you have an account)
3. After login, navigate to **Settings** → **Access Tokens**
   - URL: https://huggingface.co/settings/tokens
4. Click **New token**
5. Give it a name (e.g., "StoreBackend AI")
6. Select **Read** permissions (this is sufficient)
7. Click **Generate token**
8. **Copy the token** - you won't see it again!

---

## Step 2: Set Environment Variable

### Local Development (Windows PowerShell)

```powershell
# Set for current session
$env:HUGGINGFACE_API_KEY = "hf_xxxxxxxxxxxxxxxxxxxxxxxxxx"

# Set permanently (System-wide)
[System.Environment]::SetEnvironmentVariable('HUGGINGFACE_API_KEY', 'hf_xxxxxxxxxxxxxxxxxxxxxxxxxx', 'User')

# Verify
echo $env:HUGGINGFACE_API_KEY
```

### Local Development (Windows CMD)

```cmd
REM Set for current session
set HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxx

REM Set permanently
setx HUGGINGFACE_API_KEY "hf_xxxxxxxxxxxxxxxxxxxxxxxxxx"

REM Verify
echo %HUGGINGFACE_API_KEY%
```

### Local Development (Linux/Mac)

```bash
# Set for current session
export HUGGINGFACE_API_KEY="hf_xxxxxxxxxxxxxxxxxxxxxxxxxx"

# Set permanently (add to ~/.bashrc or ~/.zshrc)
echo 'export HUGGINGFACE_API_KEY="hf_xxxxxxxxxxxxxxxxxxxxxxxxxx"' >> ~/.bashrc
source ~/.bashrc

# Verify
echo $HUGGINGFACE_API_KEY
```

---

## Step 3: Production Deployment

### GitHub Actions

Add to your repository secrets:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `HUGGINGFACE_API_KEY`
4. Value: `hf_xxxxxxxxxxxxxxxxxxxxxxxxxx`
5. Add to your workflow:

```yaml
env:
  HUGGINGFACE_API_KEY: ${{ secrets.HUGGINGFACE_API_KEY }}
```

### Docker

```yaml
# docker-compose.yml
services:
  backend:
    environment:
      - HUGGINGFACE_API_KEY=${HUGGINGFACE_API_KEY}
```

```bash
# Run with env variable
docker run -e HUGGINGFACE_API_KEY=hf_xxx your-image
```

### Spring Boot application.properties

**❌ NOT RECOMMENDED** (for security reasons)

```properties
# application.properties - DO NOT USE IN PRODUCTION
huggingface.api.key=hf_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Step 4: Verify Setup

### Start your backend

```bash
cd storeBackend
mvnw spring-boot:run
```

### Check logs

You should NOT see this error:
```
Hugging Face API key is not configured. Please set HUGGINGFACE_API_KEY environment variable.
```

### Test the endpoint

```bash
curl -X POST "http://localhost:8080/api/stores/1/products/ai-suggest" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@test-product.jpg"
```

Expected response:
```json
{
  "title": "A red sports car",
  "description": "A red sports car\n\nThis product description was generated using AI...",
  "generatedCaption": "a red sports car"
}
```

---

## Troubleshooting

### Error: "API key is not configured"

**Solution:** Environment variable not set or not loaded by Spring Boot
```bash
# Check if variable is set
echo $HUGGINGFACE_API_KEY  # Linux/Mac
echo %HUGGINGFACE_API_KEY%  # Windows CMD
echo $env:HUGGINGFACE_API_KEY  # PowerShell

# Restart your IDE after setting the variable
# Spring Boot needs to reload environment variables
```

### Error: "401 Unauthorized" from Hugging Face

**Solution:** Invalid or expired API key
- Generate a new token at https://huggingface.co/settings/tokens
- Make sure you copied the entire token (starts with `hf_`)

### Error: "Model is loading" (503)

**Solution:** Hugging Face is loading the model (first request)
- Wait 30-60 seconds and try again
- The model will be cached after first use

### Error: Connection timeout

**Solution:** Check your internet connection
- Hugging Face API requires internet access
- Check firewall/proxy settings

---

## Security Best Practices

✅ **DO:**
- Use environment variables
- Store in GitHub Secrets for CI/CD
- Use Docker secrets in production
- Rotate keys regularly

❌ **DON'T:**
- Commit API keys to Git
- Hardcode in source code
- Share keys in public channels
- Use production keys in development

---

## Alternative: Using application.yml (with env reference)

```yaml
# application.yml
huggingface:
  api:
    key: ${HUGGINGFACE_API_KEY:}
```

This still reads from environment variable but with Spring Boot configuration.

---

## Free Tier Limits

Hugging Face API (Free):
- ✅ 30,000 requests/month
- ✅ Sufficient for most small-medium stores
- ✅ No credit card required

If you need more:
- Upgrade to PRO: $9/month (1M requests)
- Enterprise: Custom pricing

---

## Testing Without API Key

If you want to test the UI without Hugging Face:

1. Mock the response in development:
```typescript
// product.service.ts - temporary mock
generateAiProductSuggestion(storeId: number, imageFile: File): Observable<AiProductSuggestion> {
  // Return mock data for testing
  return of({
    title: 'Test Product from Image',
    description: 'This is a mock description for testing purposes.',
    generatedCaption: 'a test product'
  }).pipe(delay(2000)); // Simulate API delay
}
```

2. Or use a fallback in the backend:
```java
// For development only
if (apiKey == null || apiKey.isBlank()) {
    log.warn("Using mock AI response - API key not configured");
    return new AiProductSuggestionDTO(
        "Sample Product",
        "Sample description for testing",
        "sample caption"
    );
}
```

---

## Next Steps

After setup:
1. ✅ Restart your Spring Boot application
2. ✅ Open the frontend
3. ✅ Navigate to Product Creation
4. ✅ Click on "🤖 KI-Assistent" tab
5. ✅ Upload an image and test!

---

**Questions?** Check the main documentation: `AI_PRODUCT_CREATION_IMPLEMENTATION.md`

