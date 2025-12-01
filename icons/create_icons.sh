#!/bin/bash
# Create simple SVG icons and convert to PNG

# Create SVG icon
cat > icon.svg << 'SVGEOF'
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="64" cy="64" r="60" fill="url(#grad)"/>
  <text x="64" y="85" font-size="70" text-anchor="middle" fill="white">🧘</text>
</svg>
SVGEOF

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
    convert -background none icon.svg -resize 16x16 icon16.png
    convert -background none icon.svg -resize 48x48 icon48.png
    convert -background none icon.svg -resize 128x128 icon128.png
    echo "Icons created with ImageMagick"
else
    # Create simple colored PNG files as fallback
    # Using a simple approach with base64 encoded minimal PNGs
    echo "ImageMagick not found, creating simple placeholder PNGs"
    
    # Create a simple 16x16 purple square (smallest valid PNG)
    echo "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAL0lEQVQ4T2NkYGD4z0ABYKSgmwGjBowa
MGrAqAGjBowaMGrAqAEjxgCiXDHsAwgAEiABEfnxkPEAAAAASUVORK5CYII=" | base64 -d > icon16.png
    
    # Create a simple 48x48 purple square
    echo "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAWklEQVRoge3QMQ0AIBAEQe4fGiiD
IkiChISsoBl9kyV3dwEAAAAAAAAAAAAAwP/MzJxzBgAAAAAAAAAAAADAz1prj/feeQMAAAAAAAAA
AAAAAAD8aO4CsXsVz3Qa6fAAAAAASUVORK5CYII=" | base64 -d > icon48.png
    
    # Create a simple 128x128 purple square
    echo "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAApUlEQVR42u3RAQ0AAAjDMO5fGiw
DICDAzU4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApqoLGmYBhH6MiOkAAA
AASUVORK5CYII=" | base64 -d > icon128.png
fi

ls -lh *.png
