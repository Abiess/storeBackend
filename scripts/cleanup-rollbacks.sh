#!/bin/bash
# Cleanup old rollback JAR files
# Keeps only the last 5 versions

ROLLBACK_DIR="/opt/storebackend/rollback"
KEEP_COUNT=5

echo "🧹 Cleaning up old rollback files..."

# Check if rollback directory exists
if [ ! -d "$ROLLBACK_DIR" ]; then
    echo "❌ Rollback directory not found: $ROLLBACK_DIR"
    exit 1
fi

# Count current rollback files
CURRENT_COUNT=$(ls -1 "$ROLLBACK_DIR"/*.jar 2>/dev/null | wc -l)
echo "📦 Current rollback files: $CURRENT_COUNT"

if [ "$CURRENT_COUNT" -le "$KEEP_COUNT" ]; then
    echo "✅ No cleanup needed. Only $CURRENT_COUNT files found (keeping $KEEP_COUNT)"
    exit 0
fi

# Delete old files, keep only the last 5
echo "🗑️  Deleting old rollback files..."
ls -t "$ROLLBACK_DIR"/*.jar | tail -n +$((KEEP_COUNT + 1)) | while read -r file; do
    echo "   Deleting: $(basename "$file")"
    rm -f "$file"
done

# Show remaining files
REMAINING_COUNT=$(ls -1 "$ROLLBACK_DIR"/*.jar 2>/dev/null | wc -l)
echo "✅ Cleanup complete! Remaining files: $REMAINING_COUNT"
echo ""
echo "📋 Current rollback versions:"
ls -lht "$ROLLBACK_DIR"/*.jar | head -n "$KEEP_COUNT"

# Show disk usage
echo ""
echo "💾 Rollback directory size:"
du -sh "$ROLLBACK_DIR"

