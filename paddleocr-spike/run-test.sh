#!/bin/bash
#
# PaddleOCR Spike - Test ausführen mit System-Metriken
#

set -e

SPIKE_DIR="/opt/paddleocr-spike"
VENV_DIR="$SPIKE_DIR/venv"
OUTPUT_DIR="$SPIKE_DIR/local-test-output"

echo "======================================================================"
echo "PaddleOCR Spike - Test starten"
echo "======================================================================"

# 1. Prüfe Umgebung
if [ ! -d "$VENV_DIR" ]; then
    echo "❌ FEHLER: Virtual Environment nicht gefunden!"
    echo "Bitte zuerst install.sh ausführen"
    exit 1
fi

if [ ! -f "$SPIKE_DIR/local-test-data/marzouk-2026-00442.pdf" ]; then
    echo "❌ FEHLER: Testdokument nicht gefunden!"
    echo "Bitte ablegen: $SPIKE_DIR/local-test-data/marzouk-2026-00442.pdf"
    exit 1
fi

# 2. Umgebung anzeigen
echo ""
echo "System-Info:"
echo "  Hostname: $(hostname)"
echo "  Datum: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# RAM vor Test
free -h | grep "Mem:"
echo ""

# CPU Info
echo "CPU:"
lscpu | grep "Model name:" | sed 's/Model name:/  /'
echo "  Cores: $(nproc)"
echo ""

# Aktive Services
echo "Services:"
if systemctl is-active --quiet storebackend; then
    echo "  ✅ storebackend läuft"
else
    echo "  ⚠️  storebackend läuft NICHT"
fi
echo ""

# 3. Virtual Environment aktivieren
source "$VENV_DIR/bin/activate"

echo "Python-Umgebung:"
python --version
pip show paddlepaddle | grep "Version:"
pip show paddleocr | grep "Version:"
echo ""

# 4. Test ausführen mit /usr/bin/time
echo "======================================================================"
echo "Starte PaddleOCR-Test..."
echo "======================================================================"
echo ""

# Führe Test mit time aus
/usr/bin/time -v python "$SPIKE_DIR/test_paddleocr.py" 2>&1 | tee "$OUTPUT_DIR/test-output.log"

TIME_EXIT_CODE=${PIPESTATUS[0]}

# 5. System-Metriken aus /usr/bin/time extrahieren
echo ""
echo "======================================================================"
echo "System-Metriken (aus /usr/bin/time)"
echo "======================================================================"

if [ -f "$OUTPUT_DIR/test-output.log" ]; then
    echo ""
    echo "Elapsed Time:"
    grep "Elapsed (wall clock) time" "$OUTPUT_DIR/test-output.log" || echo "  (nicht verfügbar)"
    
    echo ""
    echo "Maximum Resident Set Size (RAM):"
    grep "Maximum resident set size" "$OUTPUT_DIR/test-output.log" || echo "  (nicht verfügbar)"
    
    echo ""
    echo "CPU Usage:"
    grep "Percent of CPU" "$OUTPUT_DIR/test-output.log" || echo "  (nicht verfügbar)"
fi

# 6. RAM nach Test
echo ""
echo "======================================================================"
echo "RAM nach Test:"
echo "======================================================================"
free -h | grep "Mem:"

# 7. Ergebnisse anzeigen
echo ""
echo "======================================================================"
echo "Test-Ergebnisse:"
echo "======================================================================"
echo ""

if [ -f "$OUTPUT_DIR/metrics.txt" ]; then
    cat "$OUTPUT_DIR/metrics.txt"
else
    echo "❌ metrics.txt nicht gefunden!"
fi

echo ""
echo "======================================================================"
echo "Dateien:"
echo "======================================================================"
ls -lh "$OUTPUT_DIR/" | tail -n +2

echo ""
echo "======================================================================"

if [ $TIME_EXIT_CODE -eq 0 ]; then
    echo "✅ Test erfolgreich abgeschlossen!"
else
    echo "❌ Test mit Fehler beendet (Exit Code: $TIME_EXIT_CODE)"
fi

echo "======================================================================"
echo ""
echo "Nächste Schritte:"
echo "  - Ergebnisse prüfen: cat $OUTPUT_DIR/metrics.txt"
echo "  - JSON prüfen: cat $OUTPUT_DIR/result.json"
echo "  - Visualisierung: ls $OUTPUT_DIR/*.jpg"
echo ""
