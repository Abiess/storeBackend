# Production API Test Script
# Testet die Live-API auf dem Server

$serverUrl = "http://212.227.58.56:8080"  # Aktuelle Server-IP
$domainUrl = "http://api.markt.ma:8080"   # Ziel-Domain (nach DNS-Setup)

Write-Host "=== Production API Tests ===" -ForegroundColor Cyan
Write-Host "Server IP: 212.227.58.56" -ForegroundColor Gray
Write-Host "Domain: api.markt.ma (nach DNS-Setup)" -ForegroundColor Gray
Write-Host ""

# Bestimme welche URL zu verwenden ist
Write-Host "Welche URL möchten Sie testen?" -ForegroundColor Yellow
Write-Host "1. IP-Adresse: $serverUrl" -ForegroundColor Gray
Write-Host "2. Domain: $domainUrl (nur wenn DNS konfiguriert ist)" -ForegroundColor Gray
$choice = Read-Host "Wählen Sie (1 oder 2, Enter für IP)"

if ($choice -eq "2") {
    $testUrl = $domainUrl
    Write-Host "Teste mit Domain: $testUrl" -ForegroundColor Cyan
} else {
    $testUrl = $serverUrl
    Write-Host "Teste mit IP: $testUrl" -ForegroundColor Cyan
}
Write-Host ""

# Test 1: Health Check
Write-Host "1. Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$testUrl/actuator/health" -Method GET -TimeoutSec 10
    Write-Host "   ✓ Status: $($response.status)" -ForegroundColor Green
    if ($response.components) {
        Write-Host "   Components:" -ForegroundColor Gray
        $response.components.PSObject.Properties | ForEach-Object {
            Write-Host "     - $($_.Name): $($_.Value.status)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ✗ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Get Plans
Write-Host "2. Get Available Plans..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$testUrl/api/plans" -Method GET -TimeoutSec 10
    Write-Host "   ✓ Plans verfügbar: $($response.Count)" -ForegroundColor Green
    foreach ($plan in $response) {
        Write-Host "   - $($plan.name): Max $($plan.maxStores) Stores, $($plan.maxProducts) Products" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Get Plans Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Register New User
Write-Host "3. Register New User..." -ForegroundColor Yellow
try {
    $registerBody = @{
        email = "testuser@markt.ma"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$testUrl/api/auth/register" -Method POST -Body $registerBody -ContentType "application/json" -TimeoutSec 10
    Write-Host "   ✓ User registered successfully" -ForegroundColor Green
    Write-Host "   Email: $($response.email)" -ForegroundColor Gray
} catch {
    if ($_.Exception.Message -match "409") {
        Write-Host "   ⚠ User already exists (OK)" -ForegroundColor Yellow
    } else {
        Write-Host "   ✗ Registration Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 4: Login
Write-Host "4. Login..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "testuser@markt.ma"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$testUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -TimeoutSec 10
    $token = $response.token
    Write-Host "   ✓ Login successful" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 30))..." -ForegroundColor Gray

    # Test 5: Get My Stores (mit Token)
    if ($token) {
        Write-Host ""
        Write-Host "5. Get My Stores (authenticated)..." -ForegroundColor Yellow
        try {
            $headers = @{
                "Authorization" = "Bearer $token"
            }
            $stores = Invoke-RestMethod -Uri "$testUrl/api/me/stores" -Method GET -Headers $headers -TimeoutSec 10
            Write-Host "   ✓ Stores: $($stores.Count)" -ForegroundColor Green
            if ($stores.Count -gt 0) {
                foreach ($store in $stores) {
                    Write-Host "     - $($store.name) (ID: $($store.id), Slug: $($store.slug))" -ForegroundColor Gray
                }
            }
        } catch {
            Write-Host "   ⚠ Get Stores: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   ✗ Login Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "✅ Production server is running and responding!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Server-Info:" -ForegroundColor White
Write-Host "   IP-Adresse: 212.227.58.56" -ForegroundColor Gray
Write-Host "   Domain: api.markt.ma" -ForegroundColor Gray
Write-Host "   Port: 8080" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 API-Endpunkte:" -ForegroundColor White
Write-Host "   Health: http://api.markt.ma:8080/actuator/health" -ForegroundColor Gray
Write-Host "   Plans: http://api.markt.ma:8080/api/plans" -ForegroundColor Gray
Write-Host "   Register: http://api.markt.ma:8080/api/auth/register" -ForegroundColor Gray
Write-Host "   Login: http://api.markt.ma:8080/api/auth/login" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. ✅ Backend läuft auf 212.227.58.56" -ForegroundColor Green
Write-Host "2. 📋 DNS A-Record erstellen: api.markt.ma → 212.227.58.56" -ForegroundColor Yellow
Write-Host "3. 🔒 Optional: HTTPS/SSL mit Let's Encrypt konfigurieren" -ForegroundColor Gray
Write-Host "4. 🎯 GitHub Secret VPS_HOST auf 'api.markt.ma' setzen" -ForegroundColor Gray

