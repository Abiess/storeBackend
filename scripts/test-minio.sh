#!/bin/bash
# MinIO Health Check Script
# Tests if MinIO is running and accessible

set -e

echo "========================================"
echo "🗄️  MinIO Health Check"
echo "========================================"
echo ""

# Configuration
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://localhost:9000}"
MINIO_CONSOLE="${MINIO_CONSOLE:-http://localhost:9001}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
MINIO_BUCKET="${MINIO_BUCKET:-store-assets}"

echo "📍 Testing MinIO at: $MINIO_ENDPOINT"
echo ""

# Test 1: Check if MinIO API is responding
echo "1️⃣  Testing MinIO API endpoint..."
if curl -sf "$MINIO_ENDPOINT/minio/health/live" > /dev/null 2>&1; then
    echo "   ✅ MinIO API is responding (HTTP 200)"
else
    echo "   ❌ MinIO API is not responding"
    echo "   💡 Start MinIO with: sudo systemctl start minio"
    exit 1
fi
echo ""

# Test 2: Check MinIO Console
echo "2️⃣  Testing MinIO Console..."
if curl -sf "$MINIO_CONSOLE" > /dev/null 2>&1; then
    echo "   ✅ MinIO Console is accessible at: $MINIO_CONSOLE"
else
    echo "   ⚠️  MinIO Console not accessible (might be disabled)"
fi
echo ""

# Test 3: Check if mc (MinIO Client) is installed
echo "3️⃣  Checking MinIO Client (mc)..."
if command -v mc &> /dev/null; then
    echo "   ✅ MinIO Client is installed"
    MC_VERSION=$(mc --version | head -n 1)
    echo "   📦 Version: $MC_VERSION"
else
    echo "   ⚠️  MinIO Client (mc) not installed"
    echo "   💡 Install with: wget https://dl.min.io/client/mc/release/linux-amd64/mc && chmod +x mc && sudo mv mc /usr/local/bin/"
fi
echo ""

# Test 4: Configure mc alias and test connection
if command -v mc &> /dev/null; then
    echo "4️⃣  Testing MinIO connection with credentials..."

    # Configure alias (suppress output)
    mc alias set local "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" > /dev/null 2>&1 || true

    # Test connection
    if mc admin info local > /dev/null 2>&1; then
        echo "   ✅ Successfully authenticated with MinIO"

        # Show server info
        echo ""
        echo "   📊 MinIO Server Info:"
        mc admin info local | grep -E "Uptime|Version|Drives" | sed 's/^/      /'

    else
        echo "   ❌ Authentication failed"
        echo "   💡 Check your credentials:"
        echo "      Access Key: $MINIO_ACCESS_KEY"
        echo "      Secret Key: $MINIO_SECRET_KEY"
    fi
    echo ""

    # Test 5: Check if bucket exists
    echo "5️⃣  Checking bucket: $MINIO_BUCKET..."
    if mc ls local/$MINIO_BUCKET > /dev/null 2>&1; then
        echo "   ✅ Bucket '$MINIO_BUCKET' exists"

        # Count objects in bucket
        OBJECT_COUNT=$(mc ls local/$MINIO_BUCKET --recursive 2>/dev/null | wc -l)
        echo "   📦 Objects in bucket: $OBJECT_COUNT"

        if [ "$OBJECT_COUNT" -gt 0 ]; then
            echo ""
            echo "   📁 Recent files:"
            mc ls local/$MINIO_BUCKET --recursive | tail -n 5 | sed 's/^/      /'
        fi
    else
        echo "   ⚠️  Bucket '$MINIO_BUCKET' does not exist"
        echo "   💡 Create with: mc mb local/$MINIO_BUCKET"

        # Ask to create bucket
        read -p "   Do you want to create the bucket now? [y/N]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if mc mb local/$MINIO_BUCKET; then
                echo "   ✅ Bucket created successfully!"

                # Set public read policy (for images)
                echo "   🔓 Setting public read policy..."
                mc anonymous set download local/$MINIO_BUCKET
                echo "   ✅ Bucket is now publicly readable"
            else
                echo "   ❌ Failed to create bucket"
            fi
        fi
    fi
fi

echo ""
echo "========================================"
echo "📊 Summary"
echo "========================================"
echo ""

# Quick test upload/download
if command -v mc &> /dev/null && mc ls local/$MINIO_BUCKET > /dev/null 2>&1; then
    echo "6️⃣  Testing file upload/download..."

    # Create test file
    TEST_FILE="/tmp/minio-test-$(date +%s).txt"
    echo "MinIO Test File - $(date)" > "$TEST_FILE"

    # Upload
    if mc cp "$TEST_FILE" "local/$MINIO_BUCKET/test/$(basename $TEST_FILE)" > /dev/null 2>&1; then
        echo "   ✅ Upload successful"

        # Download
        if mc cp "local/$MINIO_BUCKET/test/$(basename $TEST_FILE)" "/tmp/downloaded-$(basename $TEST_FILE)" > /dev/null 2>&1; then
            echo "   ✅ Download successful"

            # Cleanup
            rm -f "$TEST_FILE" "/tmp/downloaded-$(basename $TEST_FILE)"
            mc rm "local/$MINIO_BUCKET/test/$(basename $TEST_FILE)" > /dev/null 2>&1

            echo ""
            echo "✅ MinIO is fully operational!"
        else
            echo "   ❌ Download failed"
        fi
    else
        echo "   ❌ Upload failed"
    fi
fi

echo ""
echo "🌐 Access URLs:"
echo "   API:     $MINIO_ENDPOINT"
echo "   Console: $MINIO_CONSOLE"
echo ""

# Service status
if command -v systemctl &> /dev/null; then
    echo "🔧 Service Status:"
    if systemctl is-active --quiet minio; then
        echo "   ✅ MinIO service is running"
    else
        echo "   ❌ MinIO service is not running"
        echo "   💡 Start with: sudo systemctl start minio"
    fi
fi

echo ""
echo "========================================"

