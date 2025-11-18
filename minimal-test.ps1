# Minimaler Test - Eine komplette Sequenz
$baseUrl = "http://localhost:8080"

Write-Host "Minimaler API-Test" -ForegroundColor Cyan

# Registrieren
$ts = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$body = "{`"email`":`"u$ts@t.com`",`"password`":`"Test123!Sicher`",`"firstName`":`"T`",`"lastName`":`"U`"}"
$r = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body $body
Write-Host "User: $($r.userId)" -ForegroundColor Green
$h = @{"Authorization"="Bearer $($r.token)"}

# Store
$sb = "{`"name`":`"Shop`",`"slug`":`"s$ts`"}"
$s = Invoke-RestMethod -Uri "$baseUrl/api/me/stores" -Method POST -ContentType "application/json" -Headers $h -Body $sb
Write-Host "Store: $($s.id)" -ForegroundColor Green

# Produkt
$pb = "{`"name`":`"P1`",`"description`":`"T`",`"price`":9.99,`"sku`":`"S$ts`",`"stock`":10,`"active`":true}"
try {
    $p = Invoke-RestMethod -Uri "$baseUrl/api/stores/$($s.id)/products" -Method POST -ContentType "application/json" -Headers $h -Body $pb
    Write-Host "SUCCESS! Produkt: $($p.id)" -ForegroundColor Green
} catch {
    Write-Host "FEHLER 403!" -ForegroundColor Red

    # Teste die Ownership direkt in der DB
    Write-Host "`nDiagnose:" -ForegroundColor Yellow
    Write-Host "User ID: $($r.userId)" -ForegroundColor Cyan
    Write-Host "Store ID: $($s.id)" -ForegroundColor Cyan
    Write-Host "`nDas Backend blockiert trotz korrekter IDs." -ForegroundColor Red
    Write-Host "Die isStoreOwnedByUser Methode gibt wahrscheinlich FALSE zurück." -ForegroundColor Red
}

