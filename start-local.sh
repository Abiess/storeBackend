#!/bin/bash

# Quick Start Script für lokale Entwicklung
# Startet PostgreSQL, MinIO und die Spring Boot Application

echo "🚀 Starting Store Backend (Local Development)"

# Prüfe ob PostgreSQL läuft
if ! pg_isready > /dev/null 2>&1; then
    echo "⚠️  PostgreSQL is not running. Please start it first."
    echo "   Windows: Start PostgreSQL service"
    echo "   Linux: sudo systemctl start postgresql"
    echo "   Mac: brew services start postgresql"
    exit 1
fi

# Erstelle Datenbank falls nicht vorhanden
echo "🗄️  Setting up database..."
psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'storedb'" | grep -q 1 || \
    psql -U postgres -c "CREATE DATABASE storedb;"

echo "✅ Database ready"

# Generiere JWT Secret falls nicht vorhanden
if [ ! -f .env ]; then
    echo "🔑 Generating .env file..."
    cp .env.example .env

    # Generiere JWT Secret
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')

    # Ersetze Platzhalter in .env
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|your_jwt_secret_here_generate_with_openssl_rand_base64_64|$JWT_SECRET|g" .env
    else
        sed -i "s|your_jwt_secret_here_generate_with_openssl_rand_base64_64|$JWT_SECRET|g" .env
    fi

    echo "✅ .env file created with JWT secret"
fi

# Build und Start
echo "🔨 Building application..."
./mvnw clean package -DskipTests

echo "🚀 Starting application..."
./mvnw spring-boot:run

echo ""
echo "✅ Application started!"
echo "🌐 API: http://localhost:8080"
echo "🏥 Health: http://localhost:8080/actuator/health"
echo "📚 API Docs: http://localhost:8080/swagger-ui.html"

