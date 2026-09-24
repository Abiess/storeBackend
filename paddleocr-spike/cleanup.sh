#!/bin/bash
#
# PaddleOCR Spike - Aufräumen
# Entfernt ALLE Spike-Dateien und Cache
#

set -e

SPIKE_DIR="/opt/paddleocr-spike"
PADDLEOCR_CACHE="$HOME/.paddleocr"

echo "======================================================================"
echo "PaddleOCR Spike - Cleanup"
echo "======================================================================"
echo ""
echo "⚠️  WARNUNG: Dies löscht:"
echo "  - $SPIKE_DIR"
echo "  - $PADDLEOCR_CACHE (Modelle)"
echo ""
read -p "Wirklich fortfahren? (y/N) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Abgebrochen."
    exit 0
fi

# 1. Spike-Verzeichnis löschen
if [ -d "$SPIKE_DIR" ]; then
    echo "🗑️  Lösche $SPIKE_DIR ..."
    sudo rm -rf "$SPIKE_DIR"
    echo "   ✅ Gelöscht"
else
    echo "   ⚠️  $SPIKE_DIR existiert nicht"
fi

# 2. PaddleOCR Cache löschen (optional)
if [ -d "$PADDLEOCR_CACHE" ]; then
    echo ""
    read -p "PaddleOCR Modelle auch löschen? (~140 MB) (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Lösche $PADDLEOCR_CACHE ..."
        rm -rf "$PADDLEOCR_CACHE"
        echo "   ✅ Gelöscht"
    else
        echo "   ⚠️  Modelle behalten (für zukünftige Tests)"
    fi
fi

# 3. Docker Container (falls vorhanden)
if command -v docker &> /dev/null; then
    if docker ps -a | grep -q "paddleocr-service"; then
        echo ""
        read -p "Docker Container 'paddleocr-service' auch löschen? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🗑️  Lösche Docker Container..."
            docker stop paddleocr-service 2>/dev/null || true
            docker rm paddleocr-service 2>/dev/null || true
            echo "   ✅ Gelöscht"
        fi
    fi
fi

echo ""
echo "======================================================================"
echo "✅ Cleanup abgeschlossen!"
echo "======================================================================"
echo ""
echo "Zum Neustart:"
echo "  1. Skripte erneut kopieren"
echo "  2. ./install.sh ausführen"
echo "  3. PDF ablegen"
echo "  4. ./run-test.sh ausführen"
echo ""
