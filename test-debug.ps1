# Debug Test für Store Backend
$baseUrl = "http://localhost:8080"
$ErrorActionPreference = "Continue"

Write-Host "=== Debug Test ===" -ForegroundColor Cyan

# Registrieren
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$registerBody = @{
    email = "debug$timestamp@example.com"
    password = "Test123!Sicher"
    firstName = "Debug"
    lastName = "User"
} | ConvertTo-Json

Write-Host "`nRegistriere Benutzer..." -ForegroundColor Yellow
$registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body $registerBody
$token = $registerResponse.token
$userId = $registerResponse.userId

Write-Host "✅ User ID: $userId" -ForegroundColor Green

$headers = @{ "Authorization" = "Bearer $token" }

# Store erstellen
$storeBody = @{
    name = "Debug Shop"
    slug = "debugshop$timestamp"
    description = "Debug"
} | ConvertTo-Json

Write-Host "`nErstelle Store..." -ForegroundColor Yellow
$newStore = Invoke-RestMethod -Uri "$baseUrl/api/me/stores" -Method POST -ContentType "application/json" -Headers $headers -Body $storeBody
$storeId = $newStore.id

Write-Host "✅ Store ID: $storeId" -ForegroundColor Green

# Versuche Produkt zu erstellen und zeige detaillierte Fehlerinformation
Write-Host "`nVersuche Produkt zu erstellen..." -ForegroundColor Yellow
$productBody = @{
    name = "Test Produkt"
    description = "Test"
    price = 19.99
    sku = "TEST-$timestamp"
    stock = 100
    active = $true
} | ConvertTo-Json

try {
    $newProduct = Invoke-WebRequest -Uri "$baseUrl/api/stores/$storeId/products" `
        -Method POST `
        -ContentType "application/json" `
        -Headers $headers `
        -Body $productBody

    Write-Host "✅ Produkt erstellt!" -ForegroundColor Green
    $newProduct.Content | ConvertFrom-Json | Format-List
} catch {
    Write-Host "❌ Fehler beim Erstellen:" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Status Description: $($_.Exception.Response.StatusDescription)" -ForegroundColor Red

    if ($_.ErrorDetails.Message) {
        Write-Host "Error Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }

    # Teste auch direkt die Auth
    Write-Host "`n--- Auth Info ---" -ForegroundColor Yellow
    $authInfo = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Headers $headers
    Write-Host "Auth User ID: $($authInfo.id)" -ForegroundColor Cyan
    Write-Host "Auth Email: $($authInfo.email)" -ForegroundColor Cyan
}

