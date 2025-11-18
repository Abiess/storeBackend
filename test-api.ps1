# API Test Script
$baseUrl = "http://localhost:8080"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  API Tests - Schritt für Schritt" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test 1: Register
Write-Host "`n[Test 1] Registriere neuen Benutzer..." -ForegroundColor Yellow
try {
    $registerBody = @{
        email = "neuertester@example.com"
        password = "Test123!Sicher"
    } | ConvertTo-Json

    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $registerBody `
        -ErrorAction Stop

    Write-Host "✅ Registrierung erfolgreich!" -ForegroundColor Green
    Write-Host "User ID: $($registerResponse.userId)" -ForegroundColor Green
} catch {
    Write-Host "❌ Registrierung fehlgeschlagen!" -ForegroundColor Red
    Write-Host "Fehler: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
}

# Test 2: Login
Write-Host "`n[Test 2] Melde Benutzer an..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "neuertester@example.com"
        password = "Test123!Sicher"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -ErrorAction Stop

    $token = $loginResponse.token
    $userId = $loginResponse.userId

    Write-Host "✅ Login erfolgreich!" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor Green
    Write-Host "User ID: $userId" -ForegroundColor Green
} catch {
    Write-Host "❌ Login fehlgeschlagen!" -ForegroundColor Red
    Write-Host "Fehler: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Test 3: Get Plans
Write-Host "`n[Test 3] Hole verfügbare Plans..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }

    $plans = Invoke-RestMethod -Uri "$baseUrl/api/plans" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "✅ Plans abgerufen!" -ForegroundColor Green
    $plans | ForEach-Object {
        Write-Host "  - $($_.name): Max $($_.maxStores) Stores, $($_.maxProducts) Produkte" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Plans abrufen fehlgeschlagen!" -ForegroundColor Red
    Write-Host "Fehler: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Create Store
Write-Host "`n[Test 4] Erstelle einen Store..." -ForegroundColor Yellow
try {
    $storeBody = @{
        name = "Mein Testshop"
        slug = "testshop"
    } | ConvertTo-Json

    $storeResponse = Invoke-RestMethod -Uri "$baseUrl/api/me/stores" `
        -Method POST `
        -ContentType "application/json" `
        -Headers $headers `
        -Body $storeBody `
        -ErrorAction Stop

    $storeId = $storeResponse.id

    Write-Host "✅ Store erstellt!" -ForegroundColor Green
    Write-Host "Store ID: $storeId" -ForegroundColor Green
    Write-Host "Name: $($storeResponse.name)" -ForegroundColor Green
    Write-Host "Slug: $($storeResponse.slug)" -ForegroundColor Green
} catch {
    Write-Host "❌ Store erstellen fehlgeschlagen!" -ForegroundColor Red
    Write-Host "Fehler: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Get Store Details
if ($storeId) {
    Write-Host "`n[Test 5] Hole Store Details..." -ForegroundColor Yellow
    try {
        $store = Invoke-RestMethod -Uri "$baseUrl/api/stores/$storeId" `
            -Method GET `
            -Headers $headers `
            -ErrorAction Stop

        Write-Host "✅ Store Details abgerufen!" -ForegroundColor Green
        Write-Host "Name: $($store.name)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Store Details abrufen fehlgeschlagen!" -ForegroundColor Red
        Write-Host "Fehler: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Test 6: Create Product
    Write-Host "`n[Test 6] Erstelle ein Produkt..." -ForegroundColor Yellow
    try {
        $productBody = @{
            title = "Erstes Test-Produkt"
            description = "Ein tolles Produkt zum Testen"
            basePrice = 19.99
            status = "ACTIVE"
        } | ConvertTo-Json

        $productResponse = Invoke-RestMethod -Uri "$baseUrl/api/stores/$storeId/products" `
            -Method POST `
            -ContentType "application/json" `
            -Headers $headers `
            -Body $productBody `
            -ErrorAction Stop

        $productId = $productResponse.id

        Write-Host "✅ Produkt erstellt!" -ForegroundColor Green
        Write-Host "Produkt ID: $productId" -ForegroundColor Green
        Write-Host "Titel: $($productResponse.title)" -ForegroundColor Green
        Write-Host "Preis: $($productResponse.basePrice) EUR" -ForegroundColor Green
    } catch {
        Write-Host "❌ Produkt erstellen fehlgeschlagen!" -ForegroundColor Red
        Write-Host "Fehler: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Test 7: Public API - Store Resolution
    Write-Host "`n[Test 7] Teste Public API (Store Resolution)..." -ForegroundColor Yellow
    try {
        $publicStore = Invoke-RestMethod -Uri "$baseUrl/api/public/store/by-slug/testshop" `
            -Method GET `
            -ErrorAction Stop

        Write-Host "✅ Public API funktioniert!" -ForegroundColor Green
        Write-Host "Store Name: $($publicStore.name)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Public API fehlgeschlagen!" -ForegroundColor Red
        Write-Host "Fehler: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Tests abgeschlossen!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

