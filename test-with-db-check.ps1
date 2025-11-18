# Test mit H2 Console Check
$baseUrl = "http://localhost:8080"

Write-Host "Test mit H2-Datenbank-Prüfung" -ForegroundColor Cyan

# Registrieren
$ts = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$body = "{`"email`":`"dbtest$ts@t.com`",`"password`":`"Test123!Sicher`",`"firstName`":`"DB`",`"lastName`":`"Test`"}"
$r = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body $body
Write-Host "User ID: $($r.userId)" -ForegroundColor Green
$h = @{"Authorization"="Bearer $($r.token)"}

# Store erstellen
$sb = "{`"name`":`"DB Shop`",`"slug`":`"dbshop$ts`"}"
$s = Invoke-RestMethod -Uri "$baseUrl/api/me/stores" -Method POST -ContentType "application/json" -Headers $h -Body $sb
Write-Host "Store ID: $($s.id)" -ForegroundColor Green
Write-Host "Store Slug: $($s.slug)" -ForegroundColor Green

Write-Host "`nH2 Console ist verfügbar unter:" -ForegroundColor Yellow
Write-Host "http://localhost:8080/h2-console" -ForegroundColor Cyan
Write-Host "`nJDBC URL: jdbc:h2:mem:storedb" -ForegroundColor Cyan
Write-Host "Username: sa" -ForegroundColor Cyan
Write-Host "Password: (leer)" -ForegroundColor Cyan

Write-Host "`nFühre folgende SQL-Abfragen in H2 Console aus:" -ForegroundColor Yellow
Write-Host "SELECT * FROM STORES WHERE ID = $($s.id);" -ForegroundColor White
Write-Host "SELECT * FROM USERS WHERE ID = $($r.userId);" -ForegroundColor White

Read-Host "`nDrücke Enter nach DB-Prüfung, um Produkt zu erstellen"

# Produkt erstellen
$pb = "{`"name`":`"DBProd`",`"description`":`"Test`",`"price`":9.99,`"sku`":`"DBSKU$ts`",`"stock`":10,`"active`":true}"
try {
    $p = Invoke-RestMethod -Uri "$baseUrl/api/stores/$($s.id)/products" -Method POST -ContentType "application/json" -Headers $h -Body $pb
    Write-Host "`nSUCCESS! Produkt ID: $($p.id)" -ForegroundColor Green
} catch {
    Write-Host "`nFEHLER 403 - Produkt konnte nicht erstellt werden" -ForegroundColor Red
}

