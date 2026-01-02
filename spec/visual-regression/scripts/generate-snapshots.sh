#!/bin/bash
# Generate baseline PNG snapshots from PPTX files using LibreOffice + pdftoppm
#
# Usage:
#   ./generate-snapshots.sh <pptx-file> [slide-number] [dpi]
#
# Examples:
#   ./generate-snapshots.sh fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx
#   ./generate-snapshots.sh fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx 1
#   ./generate-snapshots.sh fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx 1 150

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SNAPSHOT_DIR="$SCRIPT_DIR/../snapshots"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <pptx-file> [slide-number] [dpi]"
  echo ""
  echo "Arguments:"
  echo "  pptx-file     Path to PPTX file"
  echo "  slide-number  Optional: specific slide to render (1-indexed)"
  echo "  dpi           Optional: resolution (default: 150)"
  exit 1
fi

PPTX_FILE="$1"
SLIDE_NUMBER="${2:-}"
DPI="${3:-150}"

if [ ! -f "$PPTX_FILE" ]; then
  echo "Error: File not found: $PPTX_FILE"
  exit 1
fi

# Check for required commands
for cmd in soffice pdftoppm; do
  if ! command -v "$cmd" &> /dev/null; then
    echo "Error: $cmd is not installed"
    if [ "$cmd" = "soffice" ]; then
      echo "Install LibreOffice: brew install --cask libreoffice"
    elif [ "$cmd" = "pdftoppm" ]; then
      echo "Install poppler: brew install poppler"
    fi
    exit 1
  fi
done

# Get base name without extension
BASENAME=$(basename "$PPTX_FILE" .pptx)

# Create output directory
OUTPUT_DIR="$SNAPSHOT_DIR/$BASENAME"
mkdir -p "$OUTPUT_DIR"

# Temporary directory for intermediate files
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "Converting $PPTX_FILE to PDF..."
soffice --headless --convert-to pdf --outdir "$TEMP_DIR" "$PPTX_FILE"

PDF_FILE="$TEMP_DIR/$BASENAME.pdf"

if [ ! -f "$PDF_FILE" ]; then
  echo "Error: PDF conversion failed"
  exit 1
fi

echo "Converting PDF to PNG (DPI: $DPI)..."

if [ -n "$SLIDE_NUMBER" ]; then
  # Convert specific slide
  pdftoppm -png -r "$DPI" -f "$SLIDE_NUMBER" -l "$SLIDE_NUMBER" "$PDF_FILE" "$OUTPUT_DIR/slide"
  # Rename to consistent format (slide-1.png instead of slide-01.png)
  for f in "$OUTPUT_DIR"/slide-*.png; do
    if [ -f "$f" ]; then
      # Extract page number and normalize
      page=$(basename "$f" .png | sed 's/slide-0*//')
      mv "$f" "$OUTPUT_DIR/slide-$page.png"
    fi
  done
else
  # Convert all slides
  pdftoppm -png -r "$DPI" "$PDF_FILE" "$OUTPUT_DIR/slide"
  # Normalize file names
  for f in "$OUTPUT_DIR"/slide-*.png; do
    if [ -f "$f" ]; then
      page=$(basename "$f" .png | sed 's/slide-0*//')
      new_name="$OUTPUT_DIR/slide-$page.png"
      if [ "$f" != "$new_name" ]; then
        mv "$f" "$new_name"
      fi
    fi
  done
fi

echo ""
echo "Snapshots generated in: $OUTPUT_DIR"
ls -la "$OUTPUT_DIR"
