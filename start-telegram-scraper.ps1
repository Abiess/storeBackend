# Windows PowerShell – Telegram Scraper lokal starten
# Voraussetzung: Python 3.10+ installiert

Set-Location -Path "$PSScriptRoot\telegram-scraper"

# Venv erstellen falls nicht vorhanden
if (-not (Test-Path ".venv")) {
    Write-Host "Erstelle Python-Umgebung..."
    python -m venv .venv
}

# Aktivieren
.\.venv\Scripts\Activate.ps1

# Dependencies installieren
pip install -r requirements.txt

# Starten
Write-Host "Starte Telegram MTProto Scraper auf http://localhost:8001"
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

