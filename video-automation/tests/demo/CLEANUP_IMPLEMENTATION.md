# Demo Test Cleanup Implementation

## Status

| Test File | Cleanup Helper | API Listener | Status |
|-----------|---------------|--------------|--------|
| `boutique-sans-inscription.spec.js` | ✅ | ✅ | **COMPLETE** |
| `quick-start-demo.spec.js` | ❌ | ❌ | TODO |
| `marktma-platform-demo.spec.js` | ❌ | ❌ | TODO |
| `marktma-mobile-demo.spec.js` | ❌ | ❌ | TODO |

---

## Implementation Guide

### Step 1: Import CleanupHelper

```javascript
const { CleanupHelper } = require('../utils/cleanup-helper');
```

### Step 2: Add cleanup variable to test.describe

```javascript
test.describe('My Demo Test', () => {
  let recorder;
  let cleanup; // ADD THIS

  test.beforeEach(async ({ page }) => {
    recorder = new FlowRecorder(page, 'my-demo');
    cleanup = new CleanupHelper(); // ADD THIS
    await recorder.start();
  });

  test.afterEach(async () => {
    // ADD THIS BLOCK
    const baseUrl = process.env.BASE_URL || 'https://markt.ma';
    await cleanup.cleanupAll(baseUrl);
  });
});
```

### Step 3: Listen for store creation response

Find the step where the "Create Store" button is clicked and wrap it:

**BEFORE:**
```javascript
await recorder.step('5. Créer le store', async () => {
  const createButton = page.getByRole('button', { name: /create/i });
  await createButton.click();
  await page.waitForLoadState('networkidle');
  await recorder.pause(1500);
});
```

**AFTER:**
```javascript
await recorder.step('5. Créer le store', async () => {
  // Listen for store creation API response
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/api/public/stores') && response.status() === 201,
    { timeout: 15000 }
  ).catch(() => null);

  const createButton = page.getByRole('button', { name: /create/i });
  await createButton.click();
  await page.waitForLoadState('networkidle');

  // Extract store ID and token from response
  const response = await responsePromise;
  if (response) {
    try {
      const data = await response.json();
      if (data.storeId && data.token) {
        cleanup.trackStore(data.storeId, data.token);
        console.log(`📦 Store created: ID=${data.storeId}, Slug=${data.storeSlug || 'N/A'}`);
      }
    } catch (e) {
      console.log('⚠️ Could not extract store data from response');
    }
  }

  await recorder.pause(1500);
});
```

---

## API Endpoints

### Store Creation Response

**Endpoint:** `POST /api/public/stores`

**Response (201 Created):**
```json
{
  "token": "eyJhbGciOi...",
  "storeId": 123,
  "storeSlug": "my-store",
  "storeUrl": "https://my-store.markt.ma",
  "userId": 456,
  "userEmail": "user@example.com",
  "isAnonymous": true,
  "message": "Store created successfully"
}
```

### Store Deletion

**Endpoint:** `DELETE /api/stores/{storeId}`

**Headers:**
- `Authorization: Bearer {token}`
- `Content-Type: application/json`

**Response (200 OK):**
```json
{
  "message": "Store deleted successfully"
}
```

---

## Testing

### Run single test:
```bash
npm run demo:boutique
```

### Verify cleanup:
1. Check console output for:
   - `📦 Store created: ID=123, Slug=...`
   - `🧹 Cleaning up 1 store(s)...`
   - `✅ Deleted store ID 123`
   - `✅ Cleanup complete: 1/1 stores deleted`

2. Check database:
   ```sql
   SELECT * FROM stores WHERE name LIKE 'Boutique%' ORDER BY created_at DESC LIMIT 10;
   ```

### Skip cleanup (for debugging):
Set environment variable:
```bash
SKIP_CLEANUP=true npm run demo:boutique
```

---

## Troubleshooting

### Problem: Store not deleted

**Possible causes:**
1. Token is invalid or expired
2. Store deletion API endpoint doesn't exist
3. Store was created by a different user
4. Network error

**Solution:**
- Check API logs for DELETE request
- Verify token in response
- Manual cleanup: `DELETE FROM stores WHERE id = {storeId};`

### Problem: Response not captured

**Possible causes:**
1. API endpoint URL changed
2. Response status is not 201
3. Timeout too short

**Solution:**
- Increase timeout: `{ timeout: 30000 }`
- Check Network tab in Playwright trace
- Verify API endpoint in backend logs

---

## Best Practices

1. **Always use CleanupHelper** for demo tests
2. **Never skip cleanup** in CI/CD pipelines
3. **Log store creation** for debugging
4. **Handle errors gracefully** (don't fail test if cleanup fails)
5. **Use unique store names** (timestamp-based)
6. **Test cleanup locally** before pushing

---

## Next Steps

1. ✅ Implement cleanup in `boutique-sans-inscription.spec.js`
2. ⏳ Implement cleanup in `quick-start-demo.spec.js`
3. ⏳ Implement cleanup in `marktma-platform-demo.spec.js`
4. ⏳ Implement cleanup in `marktma-mobile-demo.spec.js`
5. ⏳ Add SKIP_CLEANUP environment variable support
6. ⏳ Document cleanup in main README.md
