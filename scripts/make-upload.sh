#!/bin/sh
# Builds upload/recalculator/ containing only the files the website needs.
# Drag that "recalculator" folder into public_html in Cyberduck (or any FTP app).
cd "$(dirname "$0")/.." || exit 1
rm -rf upload && mkdir -p upload/recalculator
for item in index.html assets goal projection drawdown cost-of-delay education emergency-fund lump-vs-dca loan debt-payoff insurance net-worth disclosure; do
  cp -R "$item" upload/recalculator/
done
find upload -name .DS_Store -delete
echo "Ready: $(pwd)/upload/recalculator ($(find upload/recalculator -type f | wc -l | tr -d ' ') files)"
