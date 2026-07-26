#!/bin/bash
#
# PaddleOCR Spike - Installation für Ubuntu VPS
# Erstellt isolierte Umgebung unter /opt/paddleocr-spike
#

set -e  # Bei Fehler abbrechen

SPIKE_DIR="/opt/paddleocr-spike"
VENV_DIR="$SPIKE_DIR/venv"
DATA_DIR="$SPIKE_DIR/local-test-data"
OUTPUT_DIR="$SPIKE_DIR/local-test-output"

echo "======================================================================"
echo "PaddleOCR Spike - Installation"
echo "======================================================================"

# 1. System-Requirements prüfen
echo ""
echo "1️⃣  Prüfe System-Requirements..."

# RAM prüfen
TOTAL_RAM=$(free -m | awk 'NR==2{print $2}')
FREE_RAM=$(free -m | awk 'NR==2{print $7}')
echo "   RAM Total: ${TOTAL_RAM} MB"
echo "   RAM Frei:  ${FREE_RAM} MB"

if [ "$FREE_RAM" -lt 3000 ]; then
    echo "   ❌ WARNUNG: Weniger als 3 GB freier RAM verfügbar!"
    echo "   Empfehlung: Andere Services stoppen oder später testen"
    read -p "Trotzdem fortfahren? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Disk Space prüfen
DISK_FREE=$(df -BG /opt | awk 'NR==2{print $4}' | sed 's/G//')
echo "   Disk Frei: ${DISK_FREE} GB"

if [ "$DISK_FREE" -lt 2 ]; then
    echo "   ❌ FEHLER: Weniger als 2 GB freier Speicher!"
    exit 1
fi

# CPU Cores
CPU_CORES=$(nproc)
echo "   CPU Cores: ${CPU_CORES}"

# 2. Ports prüfen
echo ""
echo "2️⃣  Prüfe Port-Verfügbarkeit..."

if ss -ltnp | grep -q ':8002 '; then
    echo "   ❌ FEHLER: Port 8002 ist bereits belegt!"
    echo "   Belegte Ports:"
    ss -ltnp | grep -E ':800[0-9] '
    exit 1
fi
echo "   ✅ Port 8002 ist frei"

# 3. Services prüfen (nicht stören)
echo ""
echo "3️⃣  Prüfe bestehende Services..."

if systemctl is-active --quiet storebackend; then
    echo "   ✅ storebackend läuft"
else
    echo "   ⚠️  storebackend läuft NICHT"
fi

if ss -ltnp | grep -q ':8001 '; then
    echo "   ✅ Port 8001 ist belegt (erwartet)"
fi

# 4. Python prüfen
echo ""
echo "4️⃣  Prüfe Python..."

if ! command -v python3 &> /dev/null; then
    echo "   ❌ FEHLER: python3 nicht gefunden!"
    echo "   Installiere mit: sudo apt-get install python3 python3-venv python3-pip"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo "   ✅ $PYTHON_VERSION"

# 5. System-Dependencies installieren
echo ""
echo "5️⃣  Installiere System-Dependencies..."

if ! dpkg -l | grep -q poppler-utils; then
    echo "   Installiere poppler-utils..."
    sudo apt-get update -qq
    sudo apt-get install -y poppler-utils libglib2.0-0 libsm6 libxrender1 libxext6 libgomp1
else
    echo "   ✅ poppler-utils bereits installiert"
fi

# 6. Spike-Verzeichnis erstellen
echo ""
echo "6️⃣  Erstelle Spike-Verzeichnis..."

sudo mkdir -p "$SPIKE_DIR"
sudo chown $(whoami):$(whoami) "$SPIKE_DIR"
mkdir -p "$DATA_DIR"
mkdir -p "$OUTPUT_DIR"

echo "   ✅ $SPIKE_DIR erstellt"

# 7. Python Virtual Environment
echo ""
echo "7️⃣  Erstelle Python Virtual Environment..."

if [ -d "$VENV_DIR" ]; then
    echo "   ⚠️  venv existiert bereits, überspringe"
else
    python3 -m venv "$VENV_DIR"
    echo "   ✅ Virtual Environment erstellt"
fi

# 8. Python-Pakete installieren
echo ""
echo "8️⃣  Installiere Python-Pakete..."

source "$VENV_DIR/bin/activate"

# Pip upgrade
pip install --upgrade pip -q

echo "   Installiere: paddlepaddle paddleocr..."
pip install paddlepaddle==2.6.0 -q
pip install paddleocr==2.7.3 -q

echo "   Installiere: pdf2image psutil..."
pip install pdf2image psutil pillow -q

echo ""
echo "   📦 Installierte Versionen:"
python --version
pip show paddlepaddle | grep "Version:"
pip show paddleocr | grep "Version:"

# 9. Installationsgröße messen
echo ""
echo "9️⃣  Messe Installationsgröße..."

VENV_SIZE=$(du -sh "$VENV_DIR" | cut -f1)
echo "   Virtual Environment: $VENV_SIZE"

PADDLEOCR_CACHE="$HOME/.paddleocr"
if [ -d "$PADDLEOCR_CACHE" ]; then
    CACHE_SIZE=$(du -sh "$PADDLEOCR_CACHE" | cut -f1)
    echo "   PaddleOCR Cache: $CACHE_SIZE"
fi

# 10. Test-Dateien kopieren
echo ""
echo "🔟  Kopiere Test-Skripte..."

# Skripte werden manuell in den Ordner kopiert
# test_paddleocr.py, run-test.sh, cleanup.sh, README.md

echo ""
echo "======================================================================"
echo "✅ Installation abgeschlossen!"
echo "======================================================================"
echo ""
echo "Nächste Schritte:"
echo ""
echo "1. PDF-Testdokument ablegen:"
echo "   cp /pfad/zu/marzouk-2026-00442.pdf $DATA_DIR/"
echo ""
echo "2. Test ausführen:"
echo "   cd $SPIKE_DIR"
echo "   ./run-test.sh"
echo ""
echo "3. Ergebnisse prüfen:"
echo "   cat $OUTPUT_DIR/metrics.txt"
echo "   cat $OUTPUT_DIR/result.json"
echo ""
echo "4. Aufräumen (wenn fertig):"
echo "   ./cleanup.sh"
echo ""
echo "======================================================================"
