@echo off
REM Quick Start Script für lokale Entwicklung (Windows)
REM Startet die Spring Boot Application

echo 🚀 Starting Store Backend (Local Development - Windows)

REM Prüfe ob Java installiert ist
where java >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Java is not installed or not in PATH
    echo Please install Java 17 first
    exit /b 1
)

REM Erstelle .env falls nicht vorhanden
if not exist .env (
    echo 🔑 Creating .env file...
    copy .env.example .env
    echo ⚠️  Please edit .env file and set your configuration
)

REM Build und Start
echo 🔨 Building application...
call mvnw.cmd clean package -DskipTests

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Build failed
    exit /b 1
)

echo 🚀 Starting application...
call mvnw.cmd spring-boot:run

echo.
echo ✅ Application started!
echo 🌐 API: http://localhost:8080
echo 🏥 Health: http://localhost:8080/actuator/health
echo 📚 API Docs: http://localhost:8080/swagger-ui.html
# Environment Variables Template
# Kopieren Sie diese Datei als .env und füllen Sie die Werte aus

# Database Configuration
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/storedb
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=your_secure_password_here

# JWT Configuration
# Generieren Sie ein sicheres Secret mit: openssl rand -base64 64
JWT_SECRET=your_jwt_secret_here_generate_with_openssl_rand_base64_64

# Application Configuration
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=prod

# Logging
LOGGING_LEVEL_ROOT=INFO
LOGGING_LEVEL_STOREBACKEND=DEBUG

# Optional: MinIO/S3 Configuration
# MINIO_URL=http://localhost:9000
# MINIO_ACCESS_KEY=minioadmin
# MINIO_SECRET_KEY=minioadmin
# MINIO_BUCKET_NAME=store-media

# Optional: Email Configuration
# SPRING_MAIL_HOST=smtp.gmail.com
# SPRING_MAIL_PORT=587
# SPRING_MAIL_USERNAME=your-email@gmail.com
# SPRING_MAIL_PASSWORD=your-app-password

# Optional: Frontend URL (for CORS)
# FRONTEND_URL=https://your-domain.com

