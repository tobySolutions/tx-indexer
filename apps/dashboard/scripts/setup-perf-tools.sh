#!/bin/bash
# Setup performance measurement tools for the dashboard

echo "Installing performance measurement dependencies..."

# Install bundle analyzer
npm install --save-dev @next/bundle-analyzer

echo ""
echo "Dependencies installed!"
echo ""
echo "========================================="
echo "PERFORMANCE MEASUREMENT GUIDE"
echo "========================================="
echo ""
echo "1. BUNDLE SIZE ANALYSIS"
echo "   Run: ANALYZE=true npm run build"
echo "   This opens an interactive treemap of your bundle"
echo ""
echo "2. API/CACHE METRICS (built-in)"
echo "   In browser DevTools console:"
echo "   - window.__PERF__.logReport()  - Show full report"
echo "   - window.__PERF__.getReport()  - Get report as object"
echo "   - window.__PERF__.reset()      - Reset metrics"
echo ""
echo "3. REACT DEVTOOLS PROFILER"
echo "   - Install React DevTools browser extension"
echo "   - Go to Profiler tab"
echo "   - Click record, interact with app, stop recording"
echo "   - Analyze flame graph for render times"
echo ""
echo "4. CHROME DEVTOOLS PERFORMANCE"
echo "   - Open DevTools > Performance tab"
echo "   - Click record, interact, stop"
echo "   - Look for long tasks, layout shifts"
echo ""
echo "========================================="
echo ""
