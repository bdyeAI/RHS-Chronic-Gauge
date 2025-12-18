# RHS Chronic Absenteeism Indicator Score (Gauge PWA) — Hotfix v2

Fixes:
- Reads **Min Value / Max Value / Red Start / Yellow Start / Green Start**
- Uses correct scale (e.g., 0–5)
- Segments:
  - Red: Red Start → Yellow Start
  - Yellow: Yellow Start → Green Start
  - Green: Green Start → Max Value
- Needle animates from previous position
- Cache-busting fetch + SW cache bumped to v2

CSV source:
https://docs.google.com/spreadsheets/d/e/2PACX-1vTuXFJk8gTDEc9Mw2-TsE-M8PDzUFCyp5QhQ5E_FTn6HJ6uNEoRXECtvRz7km5CfYjPEJ9b2tEJ9iwW/pub?gid=1689179857&single=true&output=csv
