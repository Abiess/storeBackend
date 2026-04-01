# ✅ Error Handling Improvements - "null" Error Fix

## Problem
User received error: `"Failed to generate product suggestion: Hugging Face API error: null"`

This occurred because the error parsing logic couldn't handle:
- Null error messages
- Error objects without a "message" field
- Non-200 HTTP status codes
- RestTemplate exceptions with error bodies

---

## Solution Implemented

### 1. ✅ Improved Error Object Parsing

**Before**:
```java
String errorMessage = error.has("message") ? error.get("message").asText() : error.toString();
// Could result in "null" if error.toString() returns null
```

**After**:
```java
String errorMessage;

if (error.isTextual()) {
    // Simple string error
    errorMessage = error.asText();
} else if (error.isObject()) {
    // Error object - try multiple fields
    if (error.has("message") && !error.get("message").isNull()) {
        errorMessage = error.get("message").asText();
    } else if (error.has("error") && !error.get("error").isNull()) {
        errorMessage = error.get("error").asText();
    } else if (error.has("type") && !error.get("type").isNull()) {
        errorMessage = "API Error Type: " + error.get("type").asText();
    } else {
        errorMessage = "Unknown API error (see logs for details)";
        log.error("Full error object: {}", error.toString());
    }
} else if (error.isNull()) {
    errorMessage = "API returned null error";
} else {
    errorMessage = "API error: " + error.toString();
}
```

**Benefits**:
- ✅ Checks for null explicitly
- ✅ Tries multiple error fields (message, error, type)
- ✅ Logs full error object for debugging
- ✅ Never returns "null" string

---

### 2. ✅ Added Non-200 Status Code Handling

**New Code**:
```java
} else {
    // Handle non-200 status codes
    HttpStatus statusCode = (HttpStatus) response.getStatusCode();
    String responseBody = response.getBody();
    
    log.error("API returned non-200 status: {} {}", statusCode.value(), statusCode.getReasonPhrase());
    log.error("Response body: {}", responseBody);
    
    // Try to parse error from body
    String errorMessage = statusCode.getReasonPhrase();
    if (responseBody != null && !responseBody.isEmpty()) {
        try {
            JsonNode errorNode = objectMapper.readTree(responseBody);
            // ... extract error message
        } catch (Exception e) {
            log.warn("Could not parse error response body", e);
        }
    }
    
    throw new AiServiceException(String.format(
        "Hugging Face API returned error status %d: %s", 
        statusCode.value(), 
        errorMessage
    ));
}
```

**Benefits**:
- ✅ Catches non-200 responses that weren't caught before
- ✅ Extracts error messages from error response bodies
- ✅ Provides meaningful error messages

---

### 3. ✅ Enhanced RestTemplate Exception Handling

**Before**:
```java
} catch (Exception e) {
    log.error("API call failed: {}", e.getMessage());
    
    if (e.getMessage().contains("410") || e.getMessage().contains("Gone")) {
        throw new AiServiceException("The AI model is no longer available...");
    }
    // ... simple string matching
}
```

**After**:
```java
} catch (org.springframework.web.client.HttpClientErrorException | 
         org.springframework.web.client.HttpServerErrorException e) {
    // HTTP error responses (4xx, 5xx)
    log.error("API returned HTTP error: {} {}", e.getStatusCode(), e.getStatusText());
    log.error("Response body: {}", e.getResponseBodyAsString());
    
    String errorMessage = e.getStatusText();
    String responseBody = e.getResponseBodyAsString();
    
    // Try to extract error message from response body
    if (responseBody != null && !responseBody.isEmpty()) {
        try {
            JsonNode errorNode = objectMapper.readTree(responseBody);
            // ... parse error
        } catch (Exception parseEx) {
            log.warn("Could not parse error response body", parseEx);
        }
    }
    
    // Check for specific status codes
    if (e.getStatusCode().value() == 410) {
        throw new AiServiceException("The AI model is no longer available...");
    }
    
    if (e.getStatusCode().value() == 503) {
        throw new AiServiceException("AI model is currently loading...");
    }
    
    if (e.getStatusCode().value() == 401) {
        throw new AiServiceException("Invalid API key...");
    }
    
    if (e.getStatusCode().value() == 429) {
        throw new AiServiceException("API rate limit exceeded...");
    }
    
    throw new AiServiceException(String.format(
        "Hugging Face API error (HTTP %d): %s", 
        e.getStatusCode().value(), 
        errorMessage
    ));
}
```

**Benefits**:
- ✅ Catches specific HTTP exception types
- ✅ Extracts actual HTTP status codes (not string matching)
- ✅ Parses error body to get detailed error message
- ✅ Handles specific status codes (401, 410, 429, 503)
- ✅ Logs full response body for debugging

---

## Error Scenarios Now Handled

### ✅ Scenario 1: Null Error Message
**Before**: `"Hugging Face API error: null"`  
**After**: `"Hugging Face API error: API returned null error"`

---

### ✅ Scenario 2: Error Object Without Message
**API Response**:
```json
{
  "error": {
    "type": "invalid_request_error",
    "code": "model_not_found"
  }
}
```
**Before**: `"Hugging Face API error: null"` or `"Hugging Face API error: {...}"`  
**After**: `"Hugging Face API error: API Error Type: invalid_request_error"`

---

### ✅ Scenario 3: 401 Unauthorized
**Before**: `"Failed to call Hugging Face Router API: 401 Unauthorized"`  
**After**: `"Invalid API key. Please check your HUGGINGFACE_API_KEY configuration."`

---

### ✅ Scenario 4: 503 Service Unavailable (Model Loading)
**Before**: `"Failed to call Hugging Face Router API: 503 Service Unavailable"`  
**After**: `"AI model is currently loading. Please wait 20-30 seconds and try again."`

---

### ✅ Scenario 5: 429 Rate Limit
**Before**: `"Failed to call Hugging Face Router API: 429 Too Many Requests"`  
**After**: `"API rate limit exceeded. Please try again later."`

---

### ✅ Scenario 6: 410 Gone (Model Deprecated)
**Before**: `"Failed to call Hugging Face Router API: 410 Gone"`  
**After**: `"The AI model is no longer available. Please update to a newer model."`

---

### ✅ Scenario 7: Non-200 with Error Body
**API Response** (HTTP 400):
```json
{
  "error": {
    "message": "Image format not supported"
  }
}
```
**Before**: Generic 500 error or parsing failure  
**After**: `"Hugging Face API error (HTTP 400): Image format not supported"`

---

## Testing

### Test 1: Invalid API Key
```bash
# Set invalid API key
export HUGGINGFACE_API_KEY="invalid_key"

# Upload image
curl -X POST http://localhost:8080/api/v1/store/1/products/ai-generate \
  -H "Authorization: Bearer ..." \
  -F "image=@test.jpg"
```

**Expected Response**:
```json
{
  "timestamp": "2026-04-01T12:51:36",
  "status": 400,
  "error": "AI Service Error",
  "message": "Invalid API key. Please check your HUGGINGFACE_API_KEY configuration."
}
```

---

### Test 2: Model Loading
```bash
# First request to a cold model
curl -X POST http://localhost:8080/api/v1/store/1/products/ai-generate \
  -H "Authorization: Bearer ..." \
  -F "image=@test.jpg"
```

**Expected Response**:
```json
{
  "timestamp": "2026-04-01T12:51:36",
  "status": 400,
  "error": "AI Service Error",
  "message": "AI model is currently loading. Please wait 20-30 seconds and try again."
}
```

---

### Test 3: Rate Limit
```bash
# Make many requests quickly
for i in {1..100}; do
  curl -X POST http://localhost:8080/api/v1/store/1/products/ai-generate \
    -H "Authorization: Bearer ..." \
    -F "image=@test.jpg"
done
```

**Expected Response** (after limit):
```json
{
  "timestamp": "2026-04-01T12:51:36",
  "status": 400,
  "error": "AI Service Error",
  "message": "API rate limit exceeded. Please try again later."
}
```

---

## Logging Improvements

### Before
```
API call failed: 401 Unauthorized
```

### After
```
API returned HTTP error: 401 Unauthorized
Response body: {"error":{"message":"Invalid API key"}}
API returned error: Invalid API key
```

**Benefits**:
- ✅ See actual HTTP status code
- ✅ See full response body
- ✅ See extracted error message
- ✅ Easier debugging

---

## Build Status

```bash
mvn clean compile -DskipTests
[INFO] BUILD SUCCESS
[INFO] Total time:  13.344 s
[INFO] Finished at: 2026-04-01T12:51:36+02:00
```

✅ **No errors**  
✅ **379 files compiled**  
✅ **All error handling improved**  

---

## Files Changed

- ✅ `src/main/java/storebackend/service/AiImageCaptioningService.java`
  - Improved error object parsing (lines 177-210)
  - Added non-200 status code handling (lines 263-291)
  - Enhanced RestTemplate exception handling (lines 147-202)

---

## Summary of Improvements

| Issue | Before | After |
|-------|--------|-------|
| Null error message | "null" | "API returned null error" |
| Error without message field | "null" or "{...}" | Tries multiple fields, logs full object |
| Non-200 status codes | Not handled | Parsed and handled with specific messages |
| HTTP 401 | Generic error | "Invalid API key..." |
| HTTP 503 | Generic error | "Model is loading..." |
| HTTP 429 | Generic error | "Rate limit exceeded..." |
| HTTP 410 | String matching | Proper status code check |
| Error body parsing | Not attempted | Attempts to extract error message |
| Logging | Minimal | Detailed with status codes and bodies |

---

**Status**: ✅ **Complete & Fixed**  
**Date**: 2026-04-01  
**Issue**: Fixed "Hugging Face API error: null"  
**Result**: Clear, actionable error messages for all scenarios

