# Video Automation Makefile
# Usage: make howto FEATURE=checkout

.PHONY: help install setup record process howto clean

# Default target
help:
	@echo "📹 SaaS Video Automation Pipeline"
	@echo "=================================="
	@echo ""
	@echo "Available commands:"
	@echo "  make setup              - Install dependencies and browsers"
	@echo "  make record FEATURE=X   - Record a flow (login, checkout, products)"
	@echo "  make process FEATURE=X  - Process recorded video"
	@echo "  make howto FEATURE=X    - Build final How-to video"
	@echo "  make all FEATURE=X      - Run all steps (record + process + build)"
	@echo "  make clean              - Clean output and test results"
	@echo ""
	@echo "Examples:"
	@echo "  make howto FEATURE=checkout"
	@echo "  make all FEATURE=login"
	@echo ""

# Install dependencies
setup:
	@echo "📦 Installing dependencies..."
	npm install
	@echo "🌐 Installing Playwright browsers..."
	npm run install:browsers
	@echo "✅ Setup complete!"

# Record a single flow
record:
ifndef FEATURE
	$(error FEATURE is required. Usage: make record FEATURE=checkout)
endif
	@echo "🎬 Recording flow: $(FEATURE)"
	npm run record $(FEATURE)

# Process recorded video
process:
ifndef FEATURE
	$(error FEATURE is required. Usage: make process FEATURE=checkout)
endif
	@echo "⚙️  Processing video: $(FEATURE)"
	npm run process $(FEATURE)

# Build final How-to video
howto:
ifndef FEATURE
	$(error FEATURE is required. Usage: make howto FEATURE=checkout)
endif
	@echo "🎬 Building final How-to video: $(FEATURE)"
	npm run howto $(FEATURE)

# Run all steps
all: record process howto
	@echo "✅ Complete pipeline finished for $(FEATURE)!"

# Clean output
clean:
	@echo "🧹 Cleaning up..."
	npm run clean
	@echo "✅ Clean complete!"

