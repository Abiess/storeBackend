#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Fuehrt Playwright-Tests fuer alle Sprachen aus
.PARAMETER Language
    Einzelne Sprache (de, en, fr, ar) oder 'all'
.PARAMETER Headed
    Sichtbarer Browser
.PARAMETER UseDebugger
    Playwright Inspector
#>
param(
    [ValidateSet('de', 'en', 'fr', 'ar', 'all')]
    [string]$Language = 'all',
    [switch]$Headed,
    [switch]$UseDebugger
)
$ErrorActionPreference = 'Stop'
$ColorSuccess = 'Green'
$ColorInfo = 'Cyan'
$ColorWarning = 'Yellow'
$ColorError = 'Red'
Write-Host ""
Write-Host "===============================================================================" -ForegroundColor $ColorInfo
Write-Host "  markt.ma - Multilingual Video Automation" -ForegroundColor $ColorInfo
Write-Host "===============================================================================" -ForegroundColor $ColorInfo
Write-Host ""
if (-not (Test-Path "package.json")) {
    Write-Host "[X] Fehler: package.json nicht gefunden" -ForegroundColor $ColorError
    exit 1
}
$languageMap = @{
    'de' = 'German'
    'en' = 'English'
    'fr' = 'French'
    'ar' = 'Arabic'
}
$languagesToTest = if ($Language -eq 'all') { @('de', 'en', 'fr', 'ar') } else { @($Language) }
Write-Host "[i] Konfiguration:" -ForegroundColor $ColorInfo
Write-Host "   Sprachen: $($languagesToTest -join ', ')" -ForegroundColor $ColorInfo
Write-Host "   Headed: $Headed" -ForegroundColor $ColorInfo
Write-Host "   Debug: $UseDebugger" -ForegroundColor $ColorInfo
Write-Host ""
$testOptions = @()
if ($Headed) { $testOptions += '--headed' }
if ($UseDebugger) { $testOptions += '--debug' }
$results = @()
foreach ($lang in $languagesToTest) {
    $langLabel = $languageMap[$lang]
    Write-Host "===============================================================================" -ForegroundColor $ColorInfo
    Write-Host "[>] Starte Test: $langLabel" -ForegroundColor $ColorInfo
    Write-Host "===============================================================================" -ForegroundColor $ColorInfo
    Write-Host ""
    $grepPattern = $langLabel
    try {
        $startTime = Get-Date
        $command = "npx playwright test quick-start-multilang --grep `"$grepPattern`" --project=chromium $($testOptions -join ' ')"
        Write-Host "   Befehl: $command" -ForegroundColor $ColorInfo
        Write-Host ""
        Invoke-Expression $command
        $duration = (Get-Date) - $startTime
        Write-Host ""
        Write-Host "[OK] Test erfolgreich: $langLabel" -ForegroundColor $ColorSuccess
        Write-Host "   Dauer: $($duration.ToString('mm\:ss'))" -ForegroundColor $ColorSuccess
        Write-Host ""
        $results += @{
            Language = $lang
            Label = $langLabel
            Status = 'Success'
            Duration = $duration
        }
    }
    catch {
        Write-Host ""
        Write-Host "[X] Test fehlgeschlagen: $langLabel" -ForegroundColor $ColorError
        Write-Host "   Fehler: $($_.Exception.Message)" -ForegroundColor $ColorError
        Write-Host ""
        $results += @{
            Language = $lang
            Label = $langLabel
            Status = 'Failed'
            Error = $_.Exception.Message
        }
    }
}
Write-Host ""
Write-Host "===============================================================================" -ForegroundColor $ColorInfo
Write-Host "  Test-Zusammenfassung" -ForegroundColor $ColorInfo
Write-Host "===============================================================================" -ForegroundColor $ColorInfo
Write-Host ""
$successCount = ($results | Where-Object { $_.Status -eq 'Success' }).Count
$failedCount = ($results | Where-Object { $_.Status -eq 'Failed' }).Count
foreach ($result in $results) {
    if ($result.Status -eq 'Success') {
        Write-Host "  [OK] $($result.Label) - $($result.Duration.ToString('mm\:ss'))" -ForegroundColor $ColorSuccess
    } else {
        Write-Host "  [X] $($result.Label) - $($result.Error)" -ForegroundColor $ColorError
    }
}
Write-Host ""
Write-Host "  Gesamt: $($results.Count) Tests" -ForegroundColor $ColorInfo
Write-Host "  Erfolgreich: $successCount" -ForegroundColor $ColorSuccess
Write-Host "  Fehlgeschlagen: $failedCount" -ForegroundColor $(if ($failedCount -gt 0) { $ColorError } else { $ColorInfo })
Write-Host ""
if (Test-Path "test-results") {
    Write-Host "===============================================================================" -ForegroundColor $ColorInfo
    Write-Host "  Generierte Videos:" -ForegroundColor $ColorInfo
    Write-Host "===============================================================================" -ForegroundColor $ColorInfo
    Write-Host ""
    $videos = Get-ChildItem -Path "test-results" -Recurse -Filter "video.webm" -ErrorAction SilentlyContinue
    if ($videos) {
        foreach ($video in $videos) {
            $sizeKB = [math]::Round($video.Length / 1KB, 2)
            Write-Host "  [VIDEO] $($video.FullName) - ${sizeKB} KB" -ForegroundColor $ColorInfo
        }
    } else {
        Write-Host "  [!] Keine Videos gefunden" -ForegroundColor $ColorWarning
    }
    Write-Host ""
}
if (Test-Path "playwright-report/index.html") {
    Write-Host "===============================================================================" -ForegroundColor $ColorInfo
    Write-Host "  HTML Report:" -ForegroundColor $ColorInfo
    Write-Host "===============================================================================" -ForegroundColor $ColorInfo
    Write-Host ""
    Write-Host "  [OK] Report: playwright-report/index.html" -ForegroundColor $ColorSuccess
    Write-Host "  Oeffnen mit: npx playwright show-report" -ForegroundColor $ColorInfo
    Write-Host ""
}
if ($failedCount -gt 0) {
    Write-Host "[!] Einige Tests sind fehlgeschlagen" -ForegroundColor $ColorWarning
    exit 1
} else {
    Write-Host "[OK] Alle Tests erfolgreich!" -ForegroundColor $ColorSuccess
    exit 0
}
