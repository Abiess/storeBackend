# Vollständiger API Test für Store Backend
$baseUrl = "http://localhost:8080"
$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  API Tests - Store Backend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n[Test 1] Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/actuator/health" -Method GET -ErrorAction Stop
    Write-Host "✅ Backend ist erreichbar!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Health Check nicht verfügbar (normal wenn Actuator deaktiviert ist)" -ForegroundColor Yellow
}

# Test 2: Login
Write-Host "`n[Test 2] Benutzer anmelden..." -ForegroundColor Yellow
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
    Write-Host "   Token: $($token.Substring(0, 30))..." -ForegroundColor Cyan
    Write-Host "   User ID: $userId" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Login fehlgeschlagen!" -ForegroundColor Red
    Write-Host "   Fehler: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Test 3: Benutzerinfo abrufen
Write-Host "`n[Test 3] Benutzer-Info abrufen (/api/auth/me)..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }

    $userInfo = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "✅ Benutzer-Info abgerufen!" -ForegroundColor Green
    Write-Host "   Email: $($userInfo.email)" -ForegroundColor Cyan
    Write-Host "   Rollen: $($userInfo.roles -join ', ')" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Benutzer-Info abrufen fehlgeschlagen!" -ForegroundColor Red
    Write-Host "   Fehler: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Stores abrufen
Write-Host "`n[Test 4] Stores abrufen (/api/me/stores)..." -ForegroundColor Yellow
try {
    $stores = Invoke-RestMethod -Uri "$baseUrl/api/me/stores" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "✅ Stores abgerufen!" -ForegroundColor Green
    if ($stores.Count -gt 0) {
        Write-Host "   Anzahl Stores: $($stores.Count)" -ForegroundColor Cyan
        $stores | ForEach-Object {
            Write-Host "   - Store: $($_.name) (ID: $($_.id), Slug: $($_.slug))" -ForegroundColor Cyan
        }
        $global:storeId = $stores[0].id
    } else {
        Write-Host "   Keine Stores vorhanden" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Stores abrufen fehlgeschlagen!" -ForegroundColor Red
    Write-Host "   Fehler: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Neuen Store erstellen
Write-Host "`n[Test 5] Neuen Store erstellen (/api/me/stores)..." -ForegroundColor Yellow
try {
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    $storeBody = @{
        name = "Test Shop $timestamp"
        slug = "testshop$timestamp"
    } | ConvertTo-Json

    $newStore = Invoke-RestMethod -Uri "$baseUrl/api/me/stores" `
        -Method POST `
        -ContentType "application/json" `
        -Headers $headers `
        -Body $storeBody `
        -ErrorAction Stop

    $global:storeId = $newStore.id

    Write-Host "✅ Store erstellt!" -ForegroundColor Green
    Write-Host "   Store ID: $($newStore.id)" -ForegroundColor Cyan
    Write-Host "   Name: $($newStore.name)" -ForegroundColor Cyan
    Write-Host "   Slug: $($newStore.slug)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Store erstellen fehlgeschlagen!" -ForegroundColor Red
    Write-Host "   Fehler: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Produkte abrufen (wenn Store vorhanden)
if ($global:storeId) {
    Write-Host "`n[Test 6] Produkte abrufen (/api/stores/$global:storeId/products)..." -ForegroundColor Yellow
    try {
        $products = Invoke-RestMethod -Uri "$baseUrl/api/stores/$global:storeId/products" `
            -Method GET `
            -Headers $headers `
            -ErrorAction Stop

        Write-Host "✅ Produkte abgerufen!" -ForegroundColor Green
        Write-Host "   Anzahl Produkte: $($products.Count)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Produkte abrufen fehlgeschlagen!" -ForegroundColor Red
        Write-Host "   Fehler: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Test 7: Produkt erstellen
    Write-Host "`n[Test 7] Produkt erstellen (/api/stores/$global:storeId/products)..." -ForegroundColor Yellow
    try {
        $productBody = @{
            name = "Test Produkt"
            description = "Ein Test-Produkt"
            price = 19.99
            sku = "TEST-001"
            active = $true
        } | ConvertTo-Json

        $newProduct = Invoke-RestMethod -Uri "$baseUrl/api/stores/$global:storeId/products" `
            -Method POST `
            -ContentType "application/json" `
            -Headers $headers `
            -Body $productBody `
            -ErrorAction Stop

        Write-Host "✅ Produkt erstellt!" -ForegroundColor Green
        Write-Host "   Produkt ID: $($newProduct.id)" -ForegroundColor Cyan
        Write-Host "   Name: $($newProduct.name)" -ForegroundColor Cyan
        Write-Host "   Preis: $($newProduct.price) €" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Produkt erstellen fehlgeschlagen!" -ForegroundColor Red
        Write-Host "   Fehler: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Test 8: Kategorien abrufen
    Write-Host "`n[Test 8] Kategorien abrufen (/api/stores/$global:storeId/categories)..." -ForegroundColor Yellow
    try {
        $categories = Invoke-RestMethod -Uri "$baseUrl/api/stores/$global:storeId/categories" `
            -Method GET `
            -Headers $headers `
            -ErrorAction Stop

        Write-Host "✅ Kategorien abgerufen!" -ForegroundColor Green
        Write-Host "   Anzahl Kategorien: $($categories.Count)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Kategorien abrufen fehlgeschlagen!" -ForegroundColor Red
        Write-Host "   Fehler: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Alle Tests abgeschlossen!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

