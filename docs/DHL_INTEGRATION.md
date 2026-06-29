# DHL Integration - GitHub Secrets Setup

## GitHub Secrets anlegen:

Repository → Settings → Secrets and variables → Actions → New repository secret

1. **DHL_ENABLED** = `true`
2. **DHL_ENV** = `sandbox` (oder `production`)
3. **DHL_CLIENT_ID** = `<from_dhl_portal>`
4. **DHL_CLIENT_SECRET** = `<from_dhl_portal>`
5. **DHL_AUTH_URL** = `https://api-sandbox.dhl.com/parcel/de/account/auth/ropc/v1/token`
6. **DHL_SHIPPING_BASE_URL** = `https://api-sandbox.dhl.com/parcel/de/shipping/v2`
7. **DHL_DEFAULT_BILLING_NUMBER** = `33333333330102`

## Production URLs:
- **DHL_AUTH_URL** = `https://api-eu.dhl.com/parcel/de/account/auth/ropc/v1/token`
- **DHL_SHIPPING_BASE_URL** = `https://api-eu.dhl.com/parcel/de/shipping/v2`
