# Einfacher direkter Test
$baseUrl = "http://localhost:8080"

Write-Host "=== Schnelltest ===" -ForegroundColor Cyan

# 1. Registrieren
$ts = Get-Date -Format "yyyyMMddHHmmss"
$regBody = '{"email":"user' + $ts + '@test.com","password":"Test123!Sicher","firstName":"Test","lastName":"User"}'
$reg = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body $regBody
Write-Host "User ID: $($reg.userId)" -ForegroundColor Green

$headers = @{ "Authorization" = "Bearer $($reg.token)" }

# 2. Store erstellen
$storeBody = '{"name":"TestShop","slug":"shop' + $ts + '"}'
$store = Invoke-RestMethod -Uri "$baseUrl/api/me/stores" -Method POST -ContentType "application/json" -Headers $headers -Body $storeBody
Write-Host "Store ID: $($store.id)" -ForegroundColor Green

# 3. Produkt erstellen
$prodBody = '{"name":"Produkt1","description":"Test","price":9.99,"sku":"SKU' + $ts + '","stock":10,"active":true}'

Write-Host "`nTeste Produkt-Erstellung in Store $($store.id)..." -ForegroundColor Yellow

try {
    $prod = Invoke-RestMethod -Uri "$baseUrl/api/stores/$($store.id)/products" -Method POST -ContentType "application/json" -Headers $headers -Body $prodBody
    Write-Host "SUCCESS! Produkt ID: $($prod.id)" -ForegroundColor Green
} catch {
    Write-Host "FEHLER 403 - Berechtigung verweigert" -ForegroundColor Red

    # Prüfe ob User und Store übereinstimmen
    Write-Host "`nAnalyse:" -ForegroundColor Yellow
    Write-Host "- User ID: $($reg.userId)" -ForegroundColor Cyan
    Write-Host "- Store ID: $($store.id)" -ForegroundColor Cyan
    Write-Host "- Store Owner ID: Nicht im Response sichtbar" -ForegroundColor Cyan
    Write-Host "`nDas Backend blockiert die Anfrage wegen fehlender Berechtigung." -ForegroundColor Red
    Write-Host "Der Store-Owner wird wahrscheinlich nicht korrekt geladen." -ForegroundColor Red
}

