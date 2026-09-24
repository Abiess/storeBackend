FROM python:3.11-slim

# System-Dependencies für PaddleOCR und PDF-Verarbeitung
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    libgomp1 \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Arbeitsverzeichnis
WORKDIR /app

# Python Dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt uvicorn

# FastAPI Service
COPY fastapi_service.py .

# PaddleOCR Models vorab herunterladen (cached im Image)
RUN python -c "from paddleocr import PPStructure; PPStructure(table=True, ocr=True, show_log=False)"

# Port
EXPOSE 8001

# Health Check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8001/health')"

# Start
CMD ["uvicorn", "fastapi_service:app", "--host", "0.0.0.0", "--port", "8001"]
