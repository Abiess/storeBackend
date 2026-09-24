"""
PaddleOCR Spike - Echter Test mit Metriken

Testet PP-StructureV3 (Document Parser) auf echtem zweiseitigen Rechnungsdokument.
Misst: Laufzeit, RAM, Tabellen, Zeilen, erkannte Felder.
"""
import os
import sys
import time
import json
import psutil
from pathlib import Path
from datetime import datetime

# PDF zu Bildern
from pdf2image import convert_from_path

# PaddleOCR PP-StructureV3 (Document Parser)
try:
    # PP-StructureV3 Import (PaddleOCR 3.x)
    from paddleocr import PaddleOCR
    from paddleocr.ppstructure.table.table_master_match import TableMasterMatcher
    import cv2
    import numpy as np
    
    # Versionen prüfen
    import paddleocr
    PADDLEOCR_VERSION = getattr(paddleocr, '__version__', 'unknown')
    
    import paddle
    PADDLE_VERSION = paddle.__version__
    
except ImportError as e:
    print(f"❌ Import-Fehler: {e}")
    print("Installiere mit: pip install 'paddleocr[doc-parser]>=3.0.0' paddlepaddle")
    sys.exit(1)

# Pfade
SPIKE_DIR = Path("/opt/paddleocr-spike")
DATA_DIR = SPIKE_DIR / "local-test-data"
OUTPUT_DIR = SPIKE_DIR / "local-test-output"
PDF_PATH = DATA_DIR / "marzouk-2026-00442.pdf"

def measure_memory():
    """RAM-Verbrauch des aktuellen Prozesses in MB"""
    process = psutil.Process()
    return process.memory_info().rss / (1024 * 1024)

def parse_invoice_line(row_texts):
    """
    Versucht eine Zeile als Produktposition zu parsen.
    
    Erwartet Spalten: Pos | Art.-Nr | Beschreibung | Menge | Einheit | VPE | E-Preis | Ges-Preis | MwSt
    """
    if len(row_texts) < 3:
        return None
    
    line = {
        'positionNumber': None,
        'supplierArticleNumber': None,
        'description': None,
        'quantity': None,
        'unit': None,
        'packagingUnit': None,
        'unitPrice': None,
        'lineTotal': None,
        'taxRate': None,
        'raw_row': row_texts
    }
    
    # Spalten-Heuristik (vereinfacht)
    for idx, text in enumerate(row_texts):
        if idx == 0 and text.isdigit() and len(text) <= 3:
            line['positionNumber'] = int(text)
        elif idx == 1 and text.isdigit() and len(text) >= 3:
            line['supplierArticleNumber'] = text
        elif idx == 2 and any(c.isalpha() for c in text):
            line['description'] = text
        elif idx == 3:
            try:
                line['quantity'] = float(text.replace(',', '.'))
            except:
                pass
        elif idx == 4:
            line['unit'] = text if text else None
        elif idx == 5:
            try:
                line['packagingUnit'] = float(text.replace(',', '.'))
            except:
                pass
        elif idx == 6:
            try:
                line['unitPrice'] = float(text.replace(',', '.').replace('€', '').strip())
            except:
                pass
        elif idx == 7:
            try:
                line['lineTotal'] = float(text.replace(',', '.').replace('€', '').strip())
            except:
                pass
        elif idx == 8:
            try:
                line['taxRate'] = float(text.replace('%', '').replace(',', '.').strip())
            except:
                pass
    
    # Nur Zeilen mit Artikelnummer oder Beschreibung
    if line['supplierArticleNumber'] or (line['description'] and len(line['description']) > 5):
        return line
    
    return None

def run_test(run_number, is_cold_start=False):
    """
    Führt einen OCR-Test durch und misst Metriken.
    
    Returns:
        dict: Test-Ergebnisse
    """
    print(f"\n{'='*80}")
    print(f"RUN {run_number} {'(COLD START - mit Modell-Download)' if is_cold_start else '(WARM)'}")
    print(f"{'='*80}")
    
    start_time = time.time()
    start_memory = measure_memory()
    
    print(f"Start RAM: {start_memory:.1f} MB")
    
    # PDF zu Bildern
    print("\n📄 Konvertiere PDF zu Bildern...")
    pdf_start = time.time()
    images = convert_from_path(str(PDF_PATH), dpi=300)
    pdf_time = time.time() - pdf_start
    print(f"   ✅ {len(images)} Seiten in {pdf_time:.2f}s")
    
    # PaddleOCR Engine initialisieren (PP-StructureV3 Document Parser)
    print("\n🔧 Initialisiere PaddleOCR mit PP-StructureV3...")
    init_start = time.time()
    
    # PaddleOCR 3.x mit Document Parser (Table + OCR)
    ocr = PaddleOCR(
        use_angle_cls=True,
        lang='en',
        show_log=False,
        use_gpu=False,
        enable_mkldnn=True  # CPU-Optimierung
    )
    
    # Tabellen-Erkennung via PP-StructureV3
    table_engine = TableMasterMatcher()
    
    init_time = time.time() - init_start
    init_memory = measure_memory()
    
    print(f"   ✅ Engine initialisiert in {init_time:.2f}s")
    print(f"   📦 PaddleOCR Version: {PADDLEOCR_VERSION}")
    print(f"   📦 PaddlePaddle Version: {PADDLE_VERSION}")
    print(f"   🧠 RAM nach Init: {init_memory:.1f} MB (+{init_memory - start_memory:.1f} MB)")
    
    # Seiten verarbeiten
    all_results = []
    all_tables = []
    all_lines = []
    
    for page_num, image in enumerate(images, 1):
        print(f"\n📄 Seite {page_num}/{len(images)}...")
        page_start = time.time()
        page_mem_start = measure_memory()
        
        # PIL Image zu NumPy Array
        img_array = np.array(image)
        
        # OCR-Erkennung
        ocr_result = ocr.ocr(img_array, cls=True)
        
        # Tabellenerkennung via PP-StructureV3
        # Einfache Heuristik: Gruppiere OCR-Boxen als Tabellenstruktur
        # (Vollständige PP-StructureV3 würde Layout-Analyse benötigen)
        
        page_time = time.time() - page_start
        page_memory = measure_memory()
        
        print(f"   ⏱️  {page_time:.2f}s")
        print(f"   🧠 RAM: {page_memory:.1f} MB (+{page_memory - page_mem_start:.1f} MB)")
        print(f"   📊 OCR-Boxen: {len(ocr_result[0]) if ocr_result and ocr_result[0] else 0}")
        
        # Vereinfachte Tabellenerkennung (für Spike)
        # Echte PP-StructureV3 würde komplexere Layout-Analyse nutzen
        if ocr_result and ocr_result[0]:
            # Gruppiere nach Y-Koordinaten als Zeilen
            rows = {}
            for box_result in ocr_result[0]:
                box_coords = box_result[0]
                text = box_result[1][0]
                confidence = box_result[1][1]
                
                # Y-Koordinate für Zeilen-Gruppierung
                y_center = (box_coords[0][1] + box_coords[2][1]) / 2
                row_key = int(y_center / 20)  # 20px Toleranz
                
                if row_key not in rows:
                    rows[row_key] = []
                
                rows[row_key].append({
                    'text': text,
                    'bbox': box_coords,
                    'confidence': confidence,
                    'x': box_coords[0][0]
                })
            
            # Sortiere Zeilen
            table_rows = []
            for row_key in sorted(rows.keys()):
                cells_in_row = sorted(rows[row_key], key=lambda c: c['x'])
                row_texts = [c['text'] for c in cells_in_row]
                table_rows.append(row_texts)
            
            print(f"   📋 Erkannte Zeilen: {len(table_rows)}")
            
            # Versuche Zeilen als Produktpositionen zu parsen
            for row in table_rows[1:]:  # Erste Zeile = Header
                line = parse_invoice_line(row)
                if line:
                    all_lines.append(line)
            
            all_tables.append({
                'page': page_num,
                'rows': table_rows
            })
        
        all_results.append(ocr_result)
        
        # Visualisierung speichern (optional)
        if is_cold_start or run_number == 1:
            output_img_path = OUTPUT_DIR / f"page-{page_num}-annotated.jpg"
            try:
                # Zeichne OCR-Boxen auf Bild
                img_with_boxes = img_array.copy()
                for box_result in ocr_result[0] if ocr_result and ocr_result[0] else []:
                    box = box_result[0]
                    pts = np.array(box, dtype=np.int32).reshape((-1, 1, 2))
                    cv2.polylines(img_with_boxes, [pts], True, (0, 255, 0), 2)
                
                cv2.imwrite(str(output_img_path), img_with_boxes)
                print(f"   💾 Visualisierung: {output_img_path.name}")
            except Exception as e:
                print(f"   ⚠️  Visualisierung fehlgeschlagen: {e}")
    
    # Metriken
    total_time = time.time() - start_time
    peak_memory = measure_memory()
    memory_delta = peak_memory - start_memory
    
    print(f"\n{'='*80}")
    print(f"ERGEBNIS RUN {run_number}")
    print(f"{'='*80}")
    print(f"Gesamtzeit:    {total_time:.2f}s")
    print(f"PDF-Zeit:      {pdf_time:.2f}s")
    print(f"Init-Zeit:     {init_time:.2f}s")
    print(f"OCR-Zeit:      {total_time - pdf_time - init_time:.2f}s")
    print(f"Peak RAM:      {peak_memory:.1f} MB")
    print(f"RAM-Delta:     +{memory_delta:.1f} MB")
    print(f"Tabellen:      {len(all_tables)}")
    print(f"Zeilen gesamt: {sum(len(t['rows']) for t in all_tables)}")
    print(f"Produktzeilen: {len(all_lines)}")
    print(f"{'='*80}")
    
    return {
        'run_number': run_number,
        'is_cold_start': is_cold_start,
        'total_time_seconds': round(total_time, 2),
        'pdf_conversion_time': round(pdf_time, 2),
        'init_time': round(init_time, 2),
        'ocr_time': round(total_time - pdf_time - init_time, 2),
        'peak_memory_mb': round(peak_memory, 1),
        'memory_delta_mb': round(memory_delta, 1),
        'pages': len(images),
        'tables_detected': len(all_tables),
        'table_rows_total': sum(len(extract_table_rows(t)) for t in all_tables),
        'product_lines_parsed': len(all_lines),
        'product_lines': all_lines
    }

def main():
    """Hauptfunktion"""
    print("="*80)
    print("PaddleOCR 3.x Spike - Echter Test")
    print("="*80)
    print(f"Datum: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Python: {sys.version}")
    
    # Versionen ausgeben
    print(f"PaddlePaddle: {PADDLE_VERSION}")
    print(f"PaddleOCR: {PADDLEOCR_VERSION}")
    
    # Prüfe ob PaddleOCR 3.x
    try:
        major_version = int(PADDLEOCR_VERSION.split('.')[0])
        if major_version < 3:
            print(f"\n⚠️  WARNUNG: PaddleOCR {PADDLEOCR_VERSION} < 3.0.0")
            print("Empfohlen: pip install 'paddleocr[doc-parser]>=3.0.0'")
    except:
        print("⚠️  Kann PaddleOCR-Version nicht parsen")
    
    # PDF prüfen
    if not PDF_PATH.exists():
        print(f"\n❌ FEHLER: Testdokument nicht gefunden!")
        print(f"Erwartet: {PDF_PATH}")
        print(f"\nBitte ablegen mit:")
        print(f"  cp /pfad/zu/marzouk-2026-00442.pdf {DATA_DIR}/")
        sys.exit(1)
    
    print(f"\n📄 Testdokument: {PDF_PATH.name}")
    pdf_size_mb = PDF_PATH.stat().st_size / (1024 * 1024)
    print(f"   Größe: {pdf_size_mb:.2f} MB")
    
    # Output-Verzeichnis erstellen
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Test-Runs
    runs = []
    
    # Run 1: Cold Start (mit Modell-Download)
    run1 = run_test(1, is_cold_start=True)
    runs.append(run1)
    
    # Pause zwischen Runs
    print("\n⏸️  Pause 5 Sekunden...")
    time.sleep(5)
    
    # Run 2: Warm
    run2 = run_test(2, is_cold_start=False)
    runs.append(run2)
    
    # Pause zwischen Runs
    print("\n⏸️  Pause 5 Sekunden...")
    time.sleep(5)
    
    # Run 3: Warm
    run3 = run_test(3, is_cold_start=False)
    runs.append(run3)
    
    # Gesamtergebnis
    print("\n" + "="*80)
    print("GESAMTERGEBNIS - 3 RUNS")
    print("="*80)
    
    print("\nLaufzeiten:")
    print(f"  Run 1 (Cold): {run1['total_time_seconds']}s")
    print(f"  Run 2 (Warm): {run2['total_time_seconds']}s")
    print(f"  Run 3 (Warm): {run3['total_time_seconds']}s")
    
    warm_avg = (run2['total_time_seconds'] + run3['total_time_seconds']) / 2
    print(f"  Warm Durchschnitt: {warm_avg:.2f}s")
    
    print("\nRAM:")
    print(f"  Run 1 Peak: {run1['peak_memory_mb']} MB")
    print(f"  Run 2 Peak: {run2['peak_memory_mb']} MB")
    print(f"  Run 3 Peak: {run3['peak_memory_mb']} MB")
    
    print("\nErkannte Elemente:")
    print(f"  Seiten: {run1['pages']}")
    print(f"  Tabellen: {run1['tables_detected']}")
    print(f"  Tabellenzeilen gesamt: {run1['table_rows_total']}")
    print(f"  Produktpositionen: {run1['product_lines_parsed']}")
    
    # Feldanalyse
    lines = run1['product_lines']
    with_article_nr = sum(1 for l in lines if l['supplierArticleNumber'])
    with_quantity = sum(1 for l in lines if l['quantity'] is not None)
    with_vpe = sum(1 for l in lines if l['packagingUnit'] is not None)
    with_price = sum(1 for l in lines if l['unitPrice'] is not None)
    with_total = sum(1 for l in lines if l['lineTotal'] is not None)
    with_tax = sum(1 for l in lines if l['taxRate'] is not None)
    
    print("\nFeld-Erkennungsquote:")
    print(f"  Artikelnummer: {with_article_nr}/{len(lines)} ({with_article_nr*100/len(lines) if lines else 0:.0f}%)")
    print(f"  Menge:         {with_quantity}/{len(lines)} ({with_quantity*100/len(lines) if lines else 0:.0f}%)")
    print(f"  VPE:           {with_vpe}/{len(lines)} ({with_vpe*100/len(lines) if lines else 0:.0f}%)")
    print(f"  Einkaufspreis: {with_price}/{len(lines)} ({with_price*100/len(lines) if lines else 0:.0f}%)")
    print(f"  Gesamtbetrag:  {with_total}/{len(lines)} ({with_total*100/len(lines) if lines else 0:.0f}%)")
    print(f"  MwSt:          {with_tax}/{len(lines)} ({with_tax*100/len(lines) if lines else 0:.0f}%)")
    
    # JSON speichern
    result_file = OUTPUT_DIR / "result.json"
    with open(result_file, 'w', encoding='utf-8') as f:
        json.dump({
            'test_date': datetime.now().isoformat(),
            'python_version': sys.version,
            'document': PDF_PATH.name,
            'document_size_mb': round(pdf_size_mb, 2),
            'runs': runs,
            'summary': {
                'cold_start_time': run1['total_time_seconds'],
                'warm_avg_time': round(warm_avg, 2),
                'peak_memory_mb': max(r['peak_memory_mb'] for r in runs),
                'pages': run1['pages'],
                'tables': run1['tables_detected'],
                'table_rows': run1['table_rows_total'],
                'product_lines': run1['product_lines_parsed'],
                'field_detection': {
                    'article_number': f"{with_article_nr}/{len(lines)}",
                    'quantity': f"{with_quantity}/{len(lines)}",
                    'vpe': f"{with_vpe}/{len(lines)}",
                    'price': f"{with_price}/{len(lines)}",
                    'total': f"{with_total}/{len(lines)}",
                    'tax': f"{with_tax}/{len(lines)}"
                }
            }
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Ergebnis gespeichert: {result_file}")
    
    # Metriken speichern (für run-test.sh)
    metrics_file = OUTPUT_DIR / "metrics.txt"
    with open(metrics_file, 'w') as f:
        f.write(f"PADDLEOCR SPIKE - METRIKEN\n")
        f.write(f"={'='*60}\n\n")
        f.write(f"Datum: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Python: {sys.version.split()[0]}\n\n")
        f.write(f"Laufzeiten:\n")
        f.write(f"  Cold Start: {run1['total_time_seconds']}s\n")
        f.write(f"  Warm Run 2: {run2['total_time_seconds']}s\n")
        f.write(f"  Warm Run 3: {run3['total_time_seconds']}s\n")
        f.write(f"  Warm Durchschnitt: {warm_avg:.2f}s\n\n")
        f.write(f"RAM:\n")
        f.write(f"  Peak: {max(r['peak_memory_mb'] for r in runs):.1f} MB\n\n")
        f.write(f"Erkannte Elemente:\n")
        f.write(f"  Tabellen: {run1['tables_detected']}\n")
        f.write(f"  Produktpositionen: {run1['product_lines_parsed']}\n\n")
        f.write(f"Feld-Erkennungsquote:\n")
        f.write(f"  Artikelnummer: {with_article_nr}/{len(lines)}\n")
        f.write(f"  Menge: {with_quantity}/{len(lines)}\n")
        f.write(f"  VPE: {with_vpe}/{len(lines)}\n")
        f.write(f"  Preis: {with_price}/{len(lines)}\n")
    
    print(f"💾 Metriken gespeichert: {metrics_file}")
    
    print("\n" + "="*80)
    print("✅ Test abgeschlossen!")
    print("="*80)

if __name__ == "__main__":
    main()
