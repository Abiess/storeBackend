# Sehr detaillierter Test mit Store-Info
$baseUrl = "http://localhost:8080"

Write-Host "=== Detaillierter Store-Owner Test ===" -ForegroundColor Cyan

# Registrieren
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$email = "owner$timestamp@example.com"
$registerBody = @{
    email = $email
    password = "Test123!Sicher"
    firstName = "Owner"
    lastName = "Test"
} | ConvertTo-Json

Write-Host "`n1. Registriere Benutzer..." -ForegroundColor Yellow
$registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body $registerBody
$token = $registerResponse.token
$userId = $registerResponse.userId
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "   User ID: $userId" -ForegroundColor Green
Write-Host "   Email: $email" -ForegroundColor Green

# Store erstellen
$storeSlug = "store$timestamp"
$storeBody = @{
    name = "Owner Test Store"
    slug = $storeSlug
    description = "Test Store"
} | ConvertTo-Json

Write-Host "`n2. Erstelle Store..." -ForegroundColor Yellow
$newStore = Invoke-RestMethod -Uri "$baseUrl/api/me/stores" -Method POST -ContentType "application/json" -Headers $headers -Body $storeBody
$storeId = $newStore.id

Write-Host "   Store ID: $storeId" -ForegroundColor Green
Write-Host "   Store Name: $($newStore.name)" -ForegroundColor Green
Write-Host "   Store Slug: $($newStore.slug)" -ForegroundColor Green

# Hole alle Stores des Benutzers
Write-Host "`n3. Hole alle Stores des Benutzers..." -ForegroundColor Yellow
$myStores = Invoke-RestMethod -Uri "$baseUrl/api/me/stores" -Headers $headers
Write-Host "   Anzahl Stores: $($myStores.Count)" -ForegroundColor Green

# Prüfe Auth
Write-Host "`n4. Prüfe Authentication..." -ForegroundColor Yellow
$authInfo = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Headers $headers
Write-Host "   Auth User ID: $($authInfo.id)" -ForegroundColor Green
Write-Host "   Auth Email: $($authInfo.email)" -ForegroundColor Green

# Versuche Produkt mit minimalen Daten zu erstellen
Write-Host "`n5. Versuche Produkt zu erstellen..." -ForegroundColor Yellow
$productBody = @{
    name = "Test Produkt $timestamp"
    description = "Ein Testprodukt"
    price = 9.99
    sku = "SKU-$timestamp"
    stock = 50
    active = $true
} | ConvertTo-Json

Write-Host "   Request URL: $baseUrl/api/stores/$storeId/products" -ForegroundColor Cyan
Write-Host "   User ID: $userId" -ForegroundColor Cyan
Write-Host "   Store ID: $storeId" -ForegroundColor Cyan

try {
    $product = Invoke-RestMethod -Uri "$baseUrl/api/stores/$storeId/products" `
        -Method POST `
        -ContentType "application/json" `
        -Headers $headers `
        -Body $productBody

    Write-Host "`n   ✅ ERFOLG! Produkt wurde erstellt!" -ForegroundColor Green
    Write-Host "   Produkt ID: $($product.id)" -ForegroundColor Green
    Write-Host "   Produkt Name: $($product.name)" -ForegroundColor Green
    Write-Host "   Preis: $($product.price) EUR" -ForegroundColor Green

} catch {
    Write-Host "`n   ❌ FEHLER beim Erstellen des Produkts!" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "   Fehler: $($_.Exception.Message)" -ForegroundColor Red

    Write-Host "`n   Mögliche Ursachen:" -ForegroundColor Yellow
    Write-Host "   - Store Owner wird nicht korrekt geladen (Lazy Loading Problem)" -ForegroundColor Yellow
    Write-Host "   - User ID stimmt nicht mit Owner ID überein" -ForegroundColor Yellow
    Write-Host "   - Backend verwendet noch alte kompilierte Klassen" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan

