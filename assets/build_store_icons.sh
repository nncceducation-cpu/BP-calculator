#!/usr/bin/env bash
set -euo pipefail

asset_dir="$(cd "$(dirname "$0")" && pwd)"
source_logo="$asset_dir/nncc-logo-original.png"
font_bold="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

convert -size 1024x1024 canvas:'#0b2942' \
  -fill '#123c5a' -draw 'circle 512,470 1030,470' \
  \( "$source_logo" -resize 880x880 \) -gravity northwest -geometry +52+40 -composite \
  -fill 'rgba(0,0,0,0.28)' -draw 'circle 824,824 990,824' \
  -fill '#ffffff' -stroke '#17a6a6' -strokewidth 16 -draw 'circle 805,805 963,805' \
  -stroke '#e34141' -strokewidth 15 -fill none -draw 'polyline 682,830 720,830 745,785 775,868 807,755 840,840 875,840 896,805 929,805' \
  -font "$font_bold" -pointsize 116 -fill '#0b2942' -stroke none -gravity northwest -annotate +698+845 'BP' \
  -colorspace sRGB -alpha off -strip "$asset_dir/app-icon-1024.png"

convert "$asset_dir/app-icon-1024.png" -resize 512x512 -colorspace sRGB -alpha off -strip "$asset_dir/play-icon-512.png"
convert "$asset_dir/app-icon-1024.png" -resize 1024x1024 -colorspace sRGB -alpha off -strip "$asset_dir/icon-only.png"

convert -size 2732x2732 canvas:'#0b2942' \
  \( "$asset_dir/app-icon-1024.png" -resize 1160x1160 \) -gravity center -geometry +0-100 -composite \
  -font "$font_bold" -pointsize 104 -fill '#ffffff' -gravity center -annotate +0+670 'Neonatal BP Centiles' \
  -colorspace sRGB -alpha off -strip "$asset_dir/splash.png"
