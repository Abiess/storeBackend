"""
Invoice AI Service - FastAPI

Rechnungsverarbeitung mit Ollama qwen2.5vl:3b

Endpoints:
  GET  /health
  POST /api/invoices/parse

Port: 127.0.0.1:8010 (intern)
Extern: https://ai.markt.ma/api/invoices/parse
"""

import os
import tempfile
import time
import asyncio
import base64
import json
from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, File, UploadFile, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
import uvicorn
from PIL import Image

from models import InvoiceResult, InvoicePosition, OllamaInvoiceData

# ══════════════════════════════════════════════════════════════
# KONFIGURATION
# ══════════════════════════════════════════════════════════════

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
MODEL_NAME = "qwen2.5vl:3b"

MAX_FILE_SIZE_MB = 10
MAX_PDF_PAGES = 5
PDF_DPI = 150

# Token aus Environment (wird von systemd aus /etc/markt-ma/invoice-ai.env geladen)
INVOICE_AI_TOKEN = os.environ.get("INVOICE_AI_TOKEN", "")

if not INVOICE_AI_TOKEN:
    print("⚠️  WARNING: INVOICE_AI_TOKEN not set!")
    print("   Service will reject all requests.")

# ══════════════════════════════════════════════════════════════
# RATE LIMITING & CONCURRENCY
# ══════════════════════════════════════════════════════════════

# Maximal 2 Requests pro Minute
RATE_LIMIT_REQUESTS = 2
RATE_LIMIT_WINDOW_SECONDS = 60
request_timestamps = []

# Maximal 1 paralleler KI-Job
processing_lock = asyncio.Lock()

# ══════════════════════════════════════════════════════════════
# FASTAPI APP
# ══════════════════════════════════════════════════════════════

app = FastAPI(
    title="Invoice AI Service",
    description="Rechnungsverarbeitung mit Ollama",
    version="1.0.0",
    docs_url=None,  # Keine Swagger UI (interner Service)
    redoc_url=None
)

security = HTTPBearer()

# ══════════════════════════════════════════════════════════════
# TOKEN AUTH
# ══════════════════════════════════════════════════════════════

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Prüft Bearer Token gegen INVOICE_AI_TOKEN.
    
    Fehlendes oder falsches Token → 401 Unauthorized
    """
    if not INVOICE_AI_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="Service not configured (INVOICE_AI_TOKEN missing)"
        )
    
    if credentials.credentials != INVOICE_AI_TOKEN:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )
    
    return credentials.credentials

# ══════════════════════════════════════════════════════════════
# RATE LIMITING
# ══════════════════════════════════════════════════════════════

async def check_rate_limit():
    """
    Maximal 2 Requests pro Minute.
    
    Raises HTTPException 429 bei Überschreitung.
    """
    global request_timestamps
    
    now = time.time()
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS
    
    # Alte Timestamps entfernen
    request_timestamps = [ts for ts in request_timestamps if ts > cutoff]
    
    if len(request_timestamps) >= RATE_LIMIT_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: max {RATE_LIMIT_REQUESTS} requests per {RATE_LIMIT_WINDOW_SECONDS}s"
        )
    
    request_timestamps.append(now)

# ══════════════════════════════════════════════════════════════
# PDF → IMAGES
# ══════════════════════════════════════════════════════════════

def pdf_to_images(pdf_path: Path, dpi: int = PDF_DPI) -> list[Path]:
    """
    Konvertiert PDF zu PNG-Bildern mit pdftoppm.
    
    Args:
        pdf_path: Pfad zur PDF-Datei
        dpi: Auflösung (Standard: 150)
    
    Returns:
        Liste von Bildpfaden
    
    Raises:
        RuntimeError: Bei Konvertierungsfehler
    """
    import subprocess
    
    output_dir = pdf_path.parent
    output_prefix = pdf_path.stem
    
    try:
        subprocess.run(
            [
                "pdftoppm",
                "-png",
                "-r", str(dpi),
                str(pdf_path),
                str(output_dir / output_prefix)
            ],
            check=True,
            capture_output=True,
            text=True
        )
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"PDF conversion failed: {e.stderr}")
    except FileNotFoundError:
        raise RuntimeError("pdftoppm not found. Install with: sudo apt-get install poppler-utils")
    
    # Finde generierte PNG-Dateien
    images = sorted(output_dir.glob(f"{output_prefix}-*.png"))
    
    if not images:
        raise RuntimeError("PDF conversion produced no images")
    
    # Maximal 5 Seiten
    return images[:MAX_PDF_PAGES]

# ══════════════════════════════════════════════════════════════
# OLLAMA CALL
# ══════════════════════════════════════════════════════════════

async def call_ollama_with_image(image_path: Path) -> dict:
    """
    Ruft Ollama mit Bild auf und fordert JSON-Response an.
    
    Args:
        image_path: Pfad zum Bild
    
    Returns:
        Dict mit Ollama-Response
    
    Raises:
        HTTPException: Bei Ollama-Fehler oder ungültigem JSON
    """
    # Bild als Base64
    with open(image_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode("utf-8")
    
    prompt = """Du bist ein Experte für Rechnungsverarbeitung. Analysiere diese Rechnung und extrahiere:

- supplier: Lieferantenname
- invoiceNumber: Rechnungsnummer
- invoiceDate: Rechnungsdatum (Format: YYYY-MM-DD)
- positions: Liste aller Positionen mit:
  - articleNumber: Artikelnummer
  - description: Produktbeschreibung
  - quantity: Menge
  - unit: Einheit (z.B. "Stück", "kg")
  - packagingUnit: Verpackungseinheit (VPE, z.B. 6, 12, 24)
  - unitPrice: Einzelpreis
  - lineTotal: Gesamtbetrag der Position
  - taxRate: Mehrwertsteuersatz in Prozent

Antworte ausschließlich mit validen JSON. Fehlende Werte als null.
"""
    
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {
                "role": "user",
                "content": prompt,
                "images": [image_b64]
            }
        ],
        "format": "json",
        "stream": False,
        "keep_alive": 0,  # Modell nach Request entladen
        "options": {
            "temperature": 0,
            "num_ctx": 2048
        }
    }
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(OLLAMA_URL, json=payload)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=502,
                detail=f"Ollama error: HTTP {e.response.status_code}"
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=502,
                detail=f"Ollama connection error: {str(e)}"
            )
    
    result = response.json()
    
    # Extrahiere JSON aus Ollama-Response
    if "message" not in result or "content" not in result["message"]:
        raise HTTPException(
            status_code=502,
            detail="Invalid Ollama response structure"
        )
    
    content = result["message"]["content"]
    
    try:
        invoice_data = json.loads(content)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Ollama returned invalid JSON: {str(e)}"
        )
    
    return invoice_data

# ══════════════════════════════════════════════════════════════
# MEHRSEITIGE VERARBEITUNG
# ══════════════════════════════════════════════════════════════

def merge_invoice_results(results: list[dict]) -> dict:
    """
    Führt Ergebnisse mehrerer Seiten zusammen.
    
    - Kopfdaten von Seite 1
    - Positionen aller Seiten
    - Offensichtliche Duplikate vermeiden (gleiche description)
    
    Args:
        results: Liste von Ollama-Results pro Seite
    
    Returns:
        Zusammengeführtes Ergebnis
    """
    if not results:
        return {
            "supplier": None,
            "invoiceNumber": None,
            "invoiceDate": None,
            "positions": []
        }
    
    # Kopfdaten von Seite 1
    first = results[0]
    merged = {
        "supplier": first.get("supplier"),
        "invoiceNumber": first.get("invoiceNumber"),
        "invoiceDate": first.get("invoiceDate"),
        "positions": []
    }
    
    # Positionen sammeln (Duplikatsprüfung)
    seen_descriptions = set()
    
    for page_result in results:
        positions = page_result.get("positions", [])
        
        for pos in positions:
            desc = pos.get("description", "").strip().lower()
            
            # Leere Beschreibung oder Duplikat?
            if not desc or desc in seen_descriptions:
                continue
            
            seen_descriptions.add(desc)
            merged["positions"].append(pos)
    
    return merged

# ══════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    """Health Check (ohne Auth)"""
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/api/invoices/parse", response_model=InvoiceResult)
async def parse_invoice(
    file: UploadFile = File(...),
    _token: str = Depends(verify_token),
    _rate_limit: None = Depends(check_rate_limit)
):
    """
    Verarbeitet Rechnung (PDF, PNG oder JPEG).
    
    Requires:
        - Authorization: Bearer <INVOICE_AI_TOKEN>
        - Content-Type: multipart/form-data
        - file: PDF, PNG oder JPEG (max 10 MB)
    
    Returns:
        InvoiceResult mit erkannten Daten
    """
    start_time = time.time()
    temp_files = []
    
    try:
        # Dateigröße prüfen
        content = await file.read()
        size_mb = len(content) / (1024 * 1024)
        
        if size_mb > MAX_FILE_SIZE_MB:
            raise HTTPException(
                status_code=413,
                detail=f"File too large: {size_mb:.1f} MB (max {MAX_FILE_SIZE_MB} MB)"
            )
        
        # MIME-Type prüfen
        content_type = file.content_type or ""
        is_pdf = content_type == "application/pdf" or file.filename.lower().endswith(".pdf")
        is_image = content_type.startswith("image/") or file.filename.lower().endswith((".png", ".jpg", ".jpeg"))
        
        if not (is_pdf or is_image):
            raise HTTPException(
                status_code=415,
                detail="Unsupported file type. Only PDF, PNG and JPEG allowed."
            )
        
        # Maximal 1 paralleler KI-Job
        if processing_lock.locked():
            raise HTTPException(
                status_code=503,
                detail="Service busy. Please retry later."
            )
        
        async with processing_lock:
            # Temporäre Datei erstellen
            suffix = ".pdf" if is_pdf else ".png"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(content)
                tmp_path = Path(tmp.name)
                temp_files.append(tmp_path)
            
            # PDF → Bilder oder direkt Image verwenden
            if is_pdf:
                images = pdf_to_images(tmp_path)
                temp_files.extend(images)
            else:
                images = [tmp_path]
            
            # Alle Seiten verarbeiten
            results = []
            for img_path in images:
                result = await call_ollama_with_image(img_path)
                results.append(result)
            
            # Ergebnisse zusammenführen
            merged_data = merge_invoice_results(results)
            
            # Pydantic-Validierung
            try:
                ollama_data = OllamaInvoiceData(**merged_data)
            except Exception as e:
                raise HTTPException(
                    status_code=502,
                    detail=f"Ollama response validation failed: {str(e)}"
                )
            
            # Finales Ergebnis
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            result = InvoiceResult(
                supplier=ollama_data.supplier,
                invoiceNumber=ollama_data.invoiceNumber,
                invoiceDate=ollama_data.invoiceDate,
                positions=ollama_data.positions,
                pagesProcessed=len(images),
                processingTimeMs=processing_time_ms,
                model=MODEL_NAME
            )
            
            return result
    
    finally:
        # Cleanup: Temporäre Dateien löschen
        for temp_file in temp_files:
            try:
                temp_file.unlink(missing_ok=True)
            except Exception:
                pass


# ══════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8010,
        log_level="info",
        access_log=False  # Keine Request-Logs (Datenschutz)
    )
