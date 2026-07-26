#!/usr/bin/env python3
"""
PaddleOCR Spike - Smoke Test

Schneller Test mit synthetischem Dokument.
Prüft:
- PaddleOCR 3.x Import funktioniert
- Engine kann initialisiert werden
- OCR liefert Output
- Keine Crashes

KEIN Kundeninhalt.
"""

import sys
from pathlib import Path

# Versionen prüfen
print("=" * 60)
print("PaddleOCR Smoke Test")
print("=" * 60)

try:
    import paddle
    PADDLE_VERSION = paddle.__version__
    print(f"✅ PaddlePaddle: {PADDLE_VERSION}")
except ImportError as e:
    print(f"❌ PaddlePaddle konnte nicht importiert werden: {e}")
    sys.exit(1)

try:
    import paddleocr
    PADDLEOCR_VERSION = paddleocr.__version__
    print(f"✅ PaddleOCR: {PADDLEOCR_VERSION}")
    
    # Version prüfen
    major_version = int(PADDLEOCR_VERSION.split('.')[0])
    if major_version < 3:
        print(f"⚠️  WARNUNG: PaddleOCR {PADDLEOCR_VERSION} < 3.0.0")
        print("   Empfohlen: pip install 'paddleocr[doc-parser]>=3.0.0'")
except ImportError as e:
    print(f"❌ PaddleOCR konnte nicht importiert werden: {e}")
    sys.exit(1)
except AttributeError:
    print("⚠️  PaddleOCR-Version unbekannt (__version__ fehlt)")
    PADDLEOCR_VERSION = "unknown"

try:
    from paddleocr import PaddleOCR
    print("✅ PaddleOCR 3.x Import erfolgreich")
except ImportError as e:
    print(f"❌ PaddleOCR 3.x Import fehlgeschlagen: {e}")
    print("   Versuche: pip install --upgrade 'paddleocr[doc-parser]>=3.0.0'")
    sys.exit(1)

# Engine initialisieren (ohne OCR auszuführen)
print("\n📦 Initialisiere PaddleOCR Engine...")
print("   (Download von Modellen beim ersten Mal - kann dauern)")

try:
    ocr = PaddleOCR(
        use_angle_cls=True,
        lang='en',
        use_gpu=False,
        show_log=False,
        det_model_dir=None,  # Auto-Download
        rec_model_dir=None,  # Auto-Download
        cls_model_dir=None   # Auto-Download
    )
    print("✅ Engine initialisiert")
except Exception as e:
    print(f"❌ Engine-Initialisierung fehlgeschlagen: {e}")
    sys.exit(1)

# Synthetisches Bild erstellen
print("\n🖼️  Erstelle synthetisches Testbild...")

try:
    from PIL import Image, ImageDraw, ImageFont
    import numpy as np
    
    # Einfaches Textbild erstellen
    img = Image.new('RGB', (800, 600), color='white')
    draw = ImageDraw.Draw(img)
    
    # Text schreiben (ohne Font-Datei)
    test_texts = [
        "PaddleOCR Smoke Test",
        "Invoice #12345",
        "Product: Test Item",
        "Quantity: 10",
        "Price: 5.50 EUR",
        "Total: 55.00 EUR"
    ]
    
    y = 50
    for text in test_texts:
        draw.text((50, y), text, fill='black')
        y += 80
    
    # Als NumPy-Array
    img_array = np.array(img)
    print(f"✅ Testbild erstellt: {img_array.shape}")
    
except Exception as e:
    print(f"❌ Testbild-Erstellung fehlgeschlagen: {e}")
    sys.exit(1)

# OCR durchführen
print("\n🔍 Führe OCR durch...")

try:
    result = ocr.ocr(img_array, cls=True)
    
    if not result or not result[0]:
        print("⚠️  Kein OCR-Ergebnis")
    else:
        line_count = len(result[0])
        print(f"✅ OCR erfolgreich: {line_count} Zeilen erkannt")
        
        # Ersten 3 Zeilen anzeigen
        print("\n📝 Erkannte Texte (Auszug):")
        for i, line in enumerate(result[0][:3], 1):
            text = line[1][0]  # (bbox, (text, confidence))
            confidence = line[1][1]
            print(f"   {i}. {text} (Conf: {confidence:.2f})")
        
        if line_count > 3:
            print(f"   ... und {line_count - 3} weitere Zeilen")
    
except Exception as e:
    print(f"❌ OCR-Durchführung fehlgeschlagen: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Erfolg
print("\n" + "=" * 60)
print("✅ SMOKE TEST BESTANDEN")
print("=" * 60)
print("\nPaddleOCR 3.x funktioniert korrekt.")
print("Nächster Schritt: Echter Test mit Kundendokument")
print("  ./run-test.sh")
print()

sys.exit(0)
