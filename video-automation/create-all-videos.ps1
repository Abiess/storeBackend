#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Erstellt Videos für alle 4 Sprachen nacheinander

.DESCRIPTION
    Dieses Skript führt die Tests für alle Sprachen einzeln aus und
    kopiert die Videos in einen sicheren Ordner, damit nichts überschrieben wird.

.PARAMETER OutputDir
    Ausgabeverzeichnis für Videos (Standard: output/videos)

.EXAMPLE
    .\create-all-videos.ps1
    # Erstellt alle 4 Videos

.EXAMPLE
    .\create-all-videos.ps1 -OutputDir "C:\Videos"
    # Speichert Videos in angegebenem Verzeichnis
#>

param(
    [string]$OutputDir = "output/videos"
)

$ErrorActionPreference = 'Stop'

# Colors
$ColorSuccess = 'Green'
$ColorInfo = 'Cyan'
$ColorWarning = 'Yellow'
$ColorError = 'Red'

# Banner
Write-Host ""
Write-Host "===============================================================================" -ForegroundColor $ColorInfo
Write-Host "  markt.ma - Video-Erstellung für alle Sprachen" -ForegroundColor $ColorInfo
Write-Host "===============================================================================" -ForegroundColor $ColorInfo
Write-Host ""

# Check if in correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "[X] Fehler: package.json nicht gefunden" -ForegroundColor $ColorError
    Write-Host "   Bitte führen Sie das Skript im video-automation Verzeichnis aus" -ForegroundColor $ColorWarning
    exit 1
}

# Create output directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    Write-Host "[OK] Ausgabeverzeichnis erstellt: $OutputDir" -ForegroundColor $ColorSuccess
}

# Language configuration
$languages = @(
    @{ Code = 'de'; Name = 'Deutsch'; Flag = '🇩🇪' }
    @{ Code = 'en'; Name = 'Englisch'; Flag = '🇬🇧' }
    @{ Code = 'fr'; Name = 'Französisch'; Flag = '🇫🇷' }
    @{ Code = 'ar'; Name = 'Arabisch'; Flag = '🇸🇦' }
)

$results = @()
$startTime = Get-Date

Write-Host "[i] Erstelle Videos für $($languages.Count) Sprachen..." -ForegroundColor $ColorInfo
Write-Host "   Output: $OutputDir" -ForegroundColor $ColorInfo
Write-Host "   Language-Parameter werden automatisch zur URL hinzugefügt (z.B. ?lang=de)" -ForegroundColor $ColorInfo
Write-Host ""

foreach ($lang in $languages) {
    $langCode = $lang.Code
    $langName = $lang.Name
    $langFlag = $lang.Flag

    Write-Host "===============================================================================" -ForegroundColor $ColorInfo
    Write-Host "  $langFlag $langName ($langCode)" -ForegroundColor $ColorInfo
    Write-Host "===============================================================================" -ForegroundColor $ColorInfo
    Write-Host ""

    try {
        $testStartTime = Get-Date

        # Run test
        Write-Host "[>] Starte Test..." -ForegroundColor $ColorInfo
        .\run-multilang-tests.ps1 -Language $langCode

        $testDuration = (Get-Date) - $testStartTime

        # Find and copy video
        Write-Host ""
        Write-Host "[i] Suche Video..." -ForegroundColor $ColorInfo

        $videoFiles = Get-ChildItem -Path "test-results" -Recurse -Filter "video.webm" -ErrorAction SilentlyContinue

        if ($videoFiles) {
            # Get the most recent video
            $latestVideo = $videoFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1

            $sizeKB = [math]::Round($latestVideo.Length / 1KB, 2)
            $sizeMB = [math]::Round($latestVideo.Length / 1MB, 2)

            # Copy video with language code
            $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
            $outputFileName = "quick-start-$langCode-$timestamp.webm"
            $outputPath = Join-Path $OutputDir $outputFileName

            Copy-Item $latestVideo.FullName -Destination $outputPath -Force

            Write-Host "[OK] Video gespeichert!" -ForegroundColor $ColorSuccess
            Write-Host "   Datei: $outputFileName" -ForegroundColor $ColorInfo
            Write-Host "   Groesse: $sizeMB MB ($sizeKB KB)" -ForegroundColor $ColorInfo
            Write-Host "   Pfad: $outputPath" -ForegroundColor $ColorInfo
            Write-Host ""

            $results += @{
                Language = $langName
                Code = $langCode
                Status = 'Success'
                Duration = $testDuration
                VideoPath = $outputPath
                Size = $sizeMB
            }
        } else {
            Write-Host "[!] Kein Video gefunden" -ForegroundColor $ColorWarning

            $results += @{
                Language = $langName
                Code = $langCode
                Status = 'NoVideo'
                Duration = $testDuration
            }
        }

    } catch {
        Write-Host "[X] Fehler beim Test" -ForegroundColor $ColorError
        Write-Host "   $($_.Exception.Message)" -ForegroundColor $ColorError

        $results += @{
            Language = $langName
            Code = $langCode
            Status = 'Failed'
            Error = $_.Exception.Message
        }
    }

    Write-Host ""
}

$totalDuration = (Get-Date) - $startTime

# Summary
Write-Host ""
Write-Host "===============================================================================" -ForegroundColor $ColorInfo
Write-Host "  📊 ZUSAMMENFASSUNG" -ForegroundColor $ColorInfo
Write-Host "===============================================================================" -ForegroundColor $ColorInfo
Write-Host ""

$successCount = ($results | Where-Object { $_.Status -eq 'Success' }).Count
$failedCount = ($results | Where-Object { $_.Status -ne 'Success' }).Count

foreach ($result in $results) {
    $langIcon = ($languages | Where-Object { $_.Code -eq $result.Code }).Flag

    if ($result.Status -eq 'Success') {
        Write-Host "  $langIcon $($result.Language) - $($result.Duration.ToString('mm\:ss'))" -ForegroundColor $ColorSuccess
        Write-Host "      Video: $([System.IO.Path]::GetFileName($result.VideoPath)) ($($result.Size) MB)" -ForegroundColor $ColorInfo
    } elseif ($result.Status -eq 'NoVideo') {
        Write-Host "  [!] $($result.Language) - Kein Video erstellt" -ForegroundColor $ColorWarning
    } else {
        Write-Host "  [X] $($result.Language) - Fehlgeschlagen" -ForegroundColor $ColorError
    }
}

Write-Host ""
Write-Host "  Gesamt: $($results.Count) Sprachen" -ForegroundColor $ColorInfo
Write-Host "  Erfolgreich: $successCount" -ForegroundColor $ColorSuccess
Write-Host "  Fehlgeschlagen: $failedCount" -ForegroundColor $(if ($failedCount -gt 0) { $ColorError } else { $ColorInfo })
Write-Host "  Dauer: $($totalDuration.ToString('mm\:ss'))" -ForegroundColor $ColorInfo
Write-Host ""

# Show output directory
if ($successCount -gt 0) {
    Write-Host "===============================================================================" -ForegroundColor $ColorSuccess
    Write-Host "  ✅ VIDEOS ERSTELLT" -ForegroundColor $ColorSuccess
    Write-Host "===============================================================================" -ForegroundColor $ColorSuccess
    Write-Host ""
    Write-Host "  Ausgabeverzeichnis:" -ForegroundColor $ColorInfo
    Write-Host "  $((Resolve-Path $OutputDir).Path)" -ForegroundColor $ColorSuccess
    Write-Host ""

    # List all videos
    $allVideos = Get-ChildItem -Path $OutputDir -Filter "*.webm" | Sort-Object LastWriteTime -Descending

    if ($allVideos) {
        Write-Host "  Verfügbare Videos:" -ForegroundColor $ColorInfo
        foreach ($video in $allVideos) {
            $sizeMB = [math]::Round($video.Length / 1MB, 2)
            $time = $video.LastWriteTime.ToString("HH:mm:ss")
            Write-Host "    • $($video.Name) - $sizeMB MB ($time)" -ForegroundColor $ColorInfo
        }
        Write-Host ""
    }

    # Quick commands
    Write-Host "  Ordner öffnen:" -ForegroundColor $ColorInfo
    Write-Host "  Invoke-Item `"$OutputDir`"" -ForegroundColor $ColorWarning
    Write-Host ""
}

# Exit code
if ($failedCount -gt 0) {
    Write-Host "[!] Einige Tests sind fehlgeschlagen" -ForegroundColor $ColorWarning
    exit 1
} else {
    Write-Host "[OK] Alle Videos erfolgreich erstellt!" -ForegroundColor $ColorSuccess

    # Open output folder
    if ($successCount -gt 0) {
        Write-Host ""
        Write-Host "Ordner wird geöffnet..." -ForegroundColor $ColorInfo
        Start-Sleep -Seconds 1
        Invoke-Item (Resolve-Path $OutputDir).Path
    }

    exit 0
}

