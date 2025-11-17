# MinIO lokal starten (Windows)

## Option 1: Docker (Empfohlen)

```cmd
docker run -d ^
  -p 9000:9000 ^
  -p 9001:9001 ^
  --name minio ^
  -e "MINIO_ROOT_USER=minioadmin" ^
  -e "MINIO_ROOT_PASSWORD=minioadmin" ^
  quay.io/minio/minio server /data --console-address ":9001"
```

## Option 2: Direkt mit Binary

1. **Download MinIO für Windows:**
   https://dl.min.io/server/minio/release/windows-amd64/minio.exe

2. **MinIO starten:**
   ```cmd
   minio.exe server C:\minio-data --console-address ":9001"
   ```

## MinIO aktivieren

Ändern Sie in `application.yml`:

```yaml
minio:
  enabled: true  # <- Auf true setzen
```

## Zugriff

- **API:** http://localhost:9000
- **Console:** http://localhost:9001
- **Login:** minioadmin / minioadmin

## Bucket wird automatisch erstellt

Das Backend erstellt automatisch den Bucket `store-assets` beim Start.

---

## Ohne MinIO arbeiten

Lassen Sie einfach `minio.enabled: false` in der application.yml.
Die Anwendung startet ohne Probleme, nur Media-Uploads sind deaktiviert.

