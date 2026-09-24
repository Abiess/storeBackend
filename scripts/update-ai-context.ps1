# ============================================================
#  update-ai-context.ps1
#  Aktualisiert CODEBASE_CONTEXT.md + .github/copilot-instructions.md
#  nach jedem größeren Feature-Update automatisch.
#
#  Aufruf: .\scripts\update-ai-context.ps1
#          .\scripts\update-ai-context.ps1 -Feature "Neue Zahlungsintegration"
# ============================================================

param(
    [string]$Feature = "",
    [switch]$Dry
)

$Root     = Split-Path $PSScriptRoot -Parent
$CtxFile  = Join-Path $Root "CODEBASE_CONTEXT.md"
$CopilotFile = Join-Path $Root ".github\copilot-instructions.md"
$HookFile = Join-Path $Root ".git\hooks\pre-commit"
$Date     = Get-Date -Format "yyyy-MM-dd"
$Time     = Get-Date -Format "HH:mm"

Write-Host ""
Write-Host "🔄  AI-Kontext Updater – markt.ma" -ForegroundColor Cyan
Write-Host "    Datum: $Date $Time" -ForegroundColor Gray
Write-Host ""

# ── 1. Geänderte Dateien seit letztem Commit ermitteln ────────────────────────
$changed = git -C $Root diff --name-only HEAD 2>$null
$staged  = git -C $Root diff --cached --name-only 2>$null
$allChanged = ($changed + $staged) | Sort-Object -Unique | Where-Object { $_ -ne "" }

Write-Host "📂  Geänderte Dateien:" -ForegroundColor Yellow
if ($allChanged) {
    $allChanged | ForEach-Object { Write-Host "    · $_" -ForegroundColor White }
} else {
    Write-Host "    (keine uncommitted Änderungen)" -ForegroundColor Gray
}
Write-Host ""

# ── 2. Neue Komponenten automatisch erkennen ──────────────────────────────────
$newComponents = $allChanged | Where-Object {
    $_ -match "\.component\.ts$" -and $_ -notmatch "\.spec\."
} | ForEach-Object {
    $name = [System.IO.Path]::GetFileNameWithoutExtension($_)
    $name = $name -replace "\.component", ""
    "✅ ``$name``"
}

$newServices = $allChanged | Where-Object {
    $_ -match "\.service\.ts$"
} | ForEach-Object {
    [System.IO.Path]::GetFileNameWithoutExtension($_) -replace "\.service", ""
}

# ── 3. CODEBASE_CONTEXT.md – Letzte-Aktualisierung-Header setzen ─────────────
$ctx = Get-Content $CtxFile -Raw

# Header-Block aktualisieren oder einfügen
$newHeader = @"
<!-- LAST_UPDATED: $Date -->
<!-- AUTO: Diese Datei wird durch scripts/update-ai-context.ps1 aktualisiert -->
"@

if ($ctx -match "<!-- LAST_UPDATED:.*-->") {
    $ctx = $ctx -replace "<!-- LAST_UPDATED:.*-->`r?`n<!-- AUTO:.*-->`r?`n", "$newHeader`n"
} else {
    $ctx = "$newHeader`n" + $ctx
}

# Feature-Eintrag in Changelog-Sektion ergänzen
if ($Feature -ne "") {
    $featureEntry = "- **[$Date]** $Feature"
    if ($ctx -match "## Changelog") {
        $ctx = $ctx -replace "(## Changelog`r?`n)", "`$1$featureEntry`n"
    } else {
        $ctx += "`n---`n`n## Changelog`n$featureEntry`n"
    }
    Write-Host "📝  Feature eingetragen: $Feature" -ForegroundColor Green
}

# Neue Komponenten in "Bereits umgestellt"-Liste einfügen
if ($newComponents) {
    Write-Host "🆕  Neue Komponenten erkannt:" -ForegroundColor Cyan
    $newComponents | ForEach-Object { Write-Host "    $_" -ForegroundColor White }

    # Prüfen ob Komponenten schon in der Datei stehen
    $toAdd = $newComponents | Where-Object {
        $name = $_ -replace "✅ ``", "" -replace "``", ""
        $ctx -notmatch [regex]::Escape($name)
    }
    if ($toAdd -and ($ctx -match "## Bereits umgestellt")) {
        $addBlock = ($toAdd | ForEach-Object { $_ }) -join "`n"
        $ctx = $ctx -replace "(## Bereits umgestellt`r?`n)", "`$1$addBlock`n"
        Write-Host "    → In CODEBASE_CONTEXT.md eingetragen" -ForegroundColor Green
    }
}

# ── 4. Dateien schreiben ──────────────────────────────────────────────────────
if (-not $Dry) {
    Set-Content -Path $CtxFile -Value $ctx -Encoding UTF8
    Write-Host "✅  CODEBASE_CONTEXT.md aktualisiert" -ForegroundColor Green

    # copilot-instructions.md – nur Datum aktualisieren
    $cop = Get-Content $CopilotFile -Raw
    $cop = $cop -replace "# Zuletzt aktualisiert: .*", "# Zuletzt aktualisiert: $Date"
    if ($cop -notmatch "# Zuletzt aktualisiert:") {
        $cop = "# Zuletzt aktualisiert: $Date`n" + $cop
    }
    Set-Content -Path $CopilotFile -Value $cop -Encoding UTF8
    Write-Host "✅  .github/copilot-instructions.md aktualisiert" -ForegroundColor Green

    # Timestamp-Datei für Git Hook
    $Date | Set-Content -Path (Join-Path $Root ".ai-context-updated") -Encoding UTF8
} else {
    Write-Host "🔍  DRY RUN – keine Dateien geschrieben" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✨  Fertig! Committe jetzt:" -ForegroundColor Cyan
Write-Host "    git add CODEBASE_CONTEXT.md .github/copilot-instructions.md .ai-context-updated" -ForegroundColor Gray
Write-Host "    git commit -m 'docs: AI-Kontext aktualisiert ($Date)'" -ForegroundColor Gray
Write-Host ""

