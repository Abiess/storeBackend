# Test mit detaillierter Fehlerausgabe
$baseUrl = "http://localhost:8080"

Write-Host "=== Schneller Test mit einem Request ===" -ForegroundColor Cyan

# Registrieren
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$registerBody = @{
    email = "quicktest$timestamp@example.com"
    password = "Test123!Sicher"
    firstName = "Quick"
    lastName = "Test"
} | ConvertTo-Json

$registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body $registerBody
$token = $registerResponse.token
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "User ID: $($registerResponse.userId)" -ForegroundColor Green

# Store erstellen
$storeBody = @{
    name = "Quick Shop"
    slug = "quickshop$timestamp"
} | ConvertTo-Json

$newStore = Invoke-RestMethod -Uri "$baseUrl/api/me/stores" -Method POST -ContentType "application/json" -Headers $headers -Body $storeBody
$storeId = $newStore.id

Write-Host "Store ID: $storeId" -ForegroundColor Green

# Warte kurz
Start-Sleep -Seconds 1

# Versuche Produkt zu erstellen mit vollständiger Fehlerausgabe
$productBody = @{
    name = "Test Produkt"
    description = "Test"
    price = 19.99
    sku = "TEST-$timestamp"
    stock = 100
    active = $true
} | ConvertTo-Json

Write-Host "`nVersuche Produkt zu erstellen in Store $storeId..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/stores/$storeId/products" `
        -Method POST `
        -ContentType "application/json" `
        -Headers $headers `
        -Body $productBody

    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | Format-List
} catch {
    Write-Host "FEHLER!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red

    # Versuche Response Body zu lesen
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    $responseBody = $reader.ReadToEnd()

    if ($responseBody) {
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    } else {
        Write-Host "Keine Response Body" -ForegroundColor Yellow
    }
}

Write-Host "`nBitte überprüfe die Backend-Logs für mehr Details!" -ForegroundColor Cyan

