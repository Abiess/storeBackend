# DHL Integration - GitHub Secrets Setup

## GitHub Secrets anlegen:

Repository → Settings → Secrets and variables → Actions → New repository secret

### DHL Shipping API (Label-Erstellung)

1. **DHL_ENABLED** = `true`
2. **DHL_ENV** = `sandbox` (oder `production`)
3. **DHL_CLIENT_ID** = `<from_dhl_portal>`
4. **DHL_CLIENT_SECRET** = `<from_dhl_portal>`
5. **DHL_AUTH_URL** = `https://api-sandbox.dhl.com/parcel/de/account/auth/ropc/v1/token`
6. **DHL_SHIPPING_BASE_URL** = `https://api-sandbox.dhl.com/parcel/de/shipping/v2`
7. **DHL_DEFAULT_BILLING_NUMBER** = `33333333330102`

### DHL Platform Credentials (markt.ma zentral)

8. **DHL_PLATFORM_CLIENT_ID** = `<plattform_client_id>`
9. **DHL_PLATFORM_CLIENT_SECRET** = `<plattform_client_secret>`
10. **DHL_PLATFORM_CREDENTIALS_ALLOWED** = `true`

### DHL Tracking API (Sendungsverfolgung - NEU)

11. **DHL_TRACKING_SANDBOX_BASE_URL** = `https://api-sandbox.dhl.com/parcel/de/tracking/v0`
12. **DHL_TRACKING_PRODUCTION_BASE_URL** = `https://api-eu.dhl.com/parcel/de/tracking/v0`
13. **DHL_TRACKING_TIMEOUT_MS** = `10000`

## Production URLs:

### Shipping API
- **DHL_AUTH_URL** = `https://api-eu.dhl.com/parcel/de/account/auth/ropc/v1/token`
- **DHL_SHIPPING_BASE_URL** = `https://api-eu.dhl.com/parcel/de/shipping/v2`

### Tracking API
- **DHL_TRACKING_PRODUCTION_BASE_URL** = `https://api-eu.dhl.com/parcel/de/tracking/v0`

## Hinweise:

- **Tracking API** nutzt DIESELBEN Credentials wie Shipping (clientId, clientSecret, username, password)
- **Authentifizierung Tracking:** Basic Auth + DHL-API-Key Header + XML appname/password
- **Tracking Timeout:** Empfohlen 10000ms (10 Sekunden)
