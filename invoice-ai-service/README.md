# Invoice AI Service

FastAPI-Service für Rechnungsverarbeitung mit Ollama **qwen2.5vl:3b**.

## Übersicht

- **Endpoint:** `https://ai.markt.ma/api/invoices/parse`
- **Port (intern):** `127.0.0.1:8010`
- **Modell:** `qwen2.5vl:3b` (Ollama)
- **Auth:** Bearer Token aus `/etc/markt-ma/invoice-ai.env`

---

## Installation (VPS)

### 1. Service-Dateien deployen

Via GitHub Actions oder manuell:

```bash
sudo mkdir -p /opt/invoice-ai-service
sudo cp main.py models.py requirements.txt /opt/invoice-ai-service/
```

### 2. Python Virtual Environment

```bash
cd /opt/invoice-ai-service
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Token konfigurieren

```bash
sudo mkdir -p /etc/markt-ma
sudo bash -c 'cat > /etc/markt-ma/invoice-ai.env <<EOF
INVOICE_AI_TOKEN=$(openssl rand -base64 32)
EOF'
sudo chmod 600 /etc/markt-ma/invoice-ai.env
```

**Token anzeigen:**
```bash
sudo cat /etc/markt-ma/invoice-ai.env
```

### 4. systemd Service

```bash
sudo cp invoice-ai.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable invoice-ai
sudo systemctl start invoice-ai
```

**Status prüfen:**
```bash
sudo systemctl status invoice-ai
sudo journalctl -u invoice-ai -f
```

### 5. Nginx konfigurieren

**SSL-Zertifikat erstellen:**
```bash
sudo certbot --nginx -d ai.markt.ma
```

**Nginx-Konfiguration:**
```bash
sudo cp nginx-ai-markt-ma.conf /etc/nginx/sites-available/ai.markt.ma
sudo ln -s /etc/nginx/sites-available/ai.markt.ma /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Ollama-Modell laden

```bash
ollama pull qwen2.5vl:3b
```

---

## API-Referenz

### Health Check

```bash
curl https://ai.markt.ma/health
```

**Response:**
```json
{
  "status": "ok",
  "model": "qwen2.5vl:3b"
}
```

### Rechnung parsen

```bash
curl -X POST \
  https://ai.markt.ma/api/invoices/parse \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@rechnung.pdf"
```

**Request:**
- **Method:** `POST`
- **Header:** `Authorization: Bearer <INVOICE_AI_TOKEN>`
- **Body:** `multipart/form-data`
- **File:** PDF, PNG oder JPEG (max 10 MB)

**Response:**
```json
{
  "supplier": "Lieferant GmbH",
  "invoiceNumber": "RE-2026-00123",
  "invoiceDate": "2026-07-26",
  "positions": [
    {
      "articleNumber": "ART-001",
      "description": "Produkt A",
      "quantity": 10.0,
      "unit": "Stück",
      "packagingUnit": 12,
      "unitPrice": 5.50,
      "lineTotal": 55.00,
      "taxRate": 19.0,
      "confidence": 0.95
    }
  ],
  "pagesProcessed": 1,
  "processingTimeMs": 3456,
  "model": "qwen2.5vl:3b"
}
```

---

## Limits

- **Dateigröße:** max 10 MB
- **PDF-Seiten:** max 5 Seiten
- **Rate Limit:** 2 Requests / Minute
- **Parallelität:** 1 Request gleichzeitig

---

## Fehler-Codes

| Code | Bedeutung |
|------|-----------|
| `401` | Unauthorized (fehlendes oder falsches Token) |
| `413` | File too large (> 10 MB) |
| `415` | Unsupported file type (nur PDF/PNG/JPEG) |
| `429` | Rate limit exceeded (> 2 Requests/Min) |
| `502` | Ollama error (KI-Verarbeitung fehlgeschlagen) |
| `503` | Service busy (bereits 1 Request in Verarbeitung) |

---

## Manueller Test

### 1. Token auslesen

```bash
sudo cat /etc/markt-ma/invoice-ai.env
# Ausgabe: INVOICE_AI_TOKEN=abc123...xyz789
```

### 2. Health Check

```bash
curl https://ai.markt.ma/health
```

**Erwartung:** `{"status":"ok","model":"qwen2.5vl:3b"}`

### 3. Rechnung hochladen

```bash
TOKEN="abc123...xyz789"  # Aus Schritt 1

curl -X POST \
  https://ai.markt.ma/api/invoices/parse \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-rechnung.pdf" \
  | jq .
```

**Erwartung:**
- HTTP 200
- JSON mit `supplier`, `invoiceNumber`, `positions`

### 4. Fehlerfall testen

**Ohne Token:**
```bash
curl -X POST \
  https://ai.markt.ma/api/invoices/parse \
  -F "file=@test.pdf"
```
**Erwartung:** HTTP 403 (Forbidden - kein Bearer Token)

**Falsches Token:**
```bash
curl -X POST \
  https://ai.markt.ma/api/invoices/parse \
  -H "Authorization: Bearer WRONG_TOKEN" \
  -F "file=@test.pdf"
```
**Erwartung:** HTTP 401 (Unauthorized)

---

## Logs

```bash
# Service-Status
sudo systemctl status invoice-ai

# Live-Logs
sudo journalctl -u invoice-ai -f

# Letzte 100 Zeilen
sudo journalctl -u invoice-ai -n 100 --no-pager
```

---

## Deinstallation

```bash
sudo systemctl stop invoice-ai
sudo systemctl disable invoice-ai
sudo rm /etc/systemd/system/invoice-ai.service
sudo systemctl daemon-reload
sudo rm -rf /opt/invoice-ai-service
sudo rm /etc/nginx/sites-enabled/ai.markt.ma
sudo rm /etc/nginx/sites-available/ai.markt.ma
sudo systemctl reload nginx
```

---

## Sicherheit

- ✅ **Nur HTTPS** (nginx erzwingt Redirect)
- ✅ **Bearer Token** (aus Environment, nicht hardcoded)
- ✅ **Rate Limiting** (2 Requests/Minute)
- ✅ **Keine Request-Logs** (access_log=False - Datenschutz)
- ✅ **Temp-File Cleanup** (automatisch nach Verarbeitung)
- ✅ **Intern-Only Port** (127.0.0.1:8010, nicht 0.0.0.0)

---

## Troubleshooting

### Service startet nicht

```bash
sudo journalctl -u invoice-ai -n 50 --no-pager
```

Häufige Ursachen:
- Python venv fehlt: `cd /opt/invoice-ai-service && python3 -m venv venv`
- Dependencies fehlen: `source venv/bin/activate && pip install -r requirements.txt`
- Token fehlt: `/etc/markt-ma/invoice-ai.env` existiert nicht
- Port belegt: `ss -ltnp | grep 8010`

### Ollama nicht erreichbar

```bash
curl http://127.0.0.1:11434/api/tags
```

Falls Fehler:
```bash
sudo systemctl status ollama
sudo systemctl start ollama
```

### Modell nicht vorhanden

```bash
ollama list | grep qwen2.5vl
```

Falls nicht vorhanden:
```bash
ollama pull qwen2.5vl:3b
```

### 502 Bad Gateway (nginx)

Service läuft nicht:
```bash
sudo systemctl start invoice-ai
curl http://127.0.0.1:8010/health
```

### PDF-Konvertierung schlägt fehl

`pdftoppm` fehlt:
```bash
sudo apt-get install poppler-utils
```

---

## Architektur

```
┌─────────────────┐
│   Client        │
│ (curl/Postman)  │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  Nginx          │  https://ai.markt.ma
│  Port 443       │  ├─ /health
└────────┬────────┘  └─ /api/invoices/parse
         │ HTTP
         ▼
┌─────────────────┐
│  FastAPI        │  127.0.0.1:8010
│  invoice-ai     │  ├─ Token-Auth
│  (systemd)      │  ├─ Rate Limiting
└────────┬────────┘  └─ PDF → PNG
         │
         ▼
┌─────────────────┐
│  Ollama         │  127.0.0.1:11434
│  qwen2.5vl:3b   │  ├─ keep_alive: 0
└─────────────────┘  └─ format: json
```

---

## Nächste Schritte

1. **Token sichern:** In Password-Manager speichern
2. **DNS:** `ai.markt.ma` auf VPS-IP zeigen lassen
3. **Test:** Mit echter Rechnung testen
4. **Monitoring:** Optional Prometheus/Grafana für Latenz-Tracking
5. **Integration:** In storeBackend als optionaler Endpoint

---

## Kein Storebackend-Code

Dieser Service ist **komplett unabhängig** von storeBackend:
- ❌ Kein Testclient in storeBackend
- ❌ Keine MinIO-Integration
- ❌ Keine Parser-Integration
- ❌ Keine automatische Übernahme

**Test ausschließlich mit curl/Postman.**
