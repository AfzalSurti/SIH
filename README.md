# CycloneAI — SIH26070 Prototype

**AI-Based Tropical Cyclone Detection, Classification & Short-Term Prediction**
Team **TechNova** — Dhruv Pathak (leader), Riya Thakor, Damini Chaudhari, Dhruvil Dattani,
Parth Pathak, Afzal Surti.

A working front-end prototype of the system in our problem statement. It shows the complete
workflow from the architecture slide as one interface:

> multi-source ingest → preprocessing → time/location alignment → data fusion →
> feature extraction → **detection → classification → short-term prediction** → map, charts, alerts

## Pages

| Page | What it shows |
|---|---|
| **Live Monitor** | Basin map with observed track, AI forecast track, uncertainty cone, landfall point, intensity chart, watchlist, district alerts |
| **Detection** | Fused enhanced-IR satellite scene with CNN bounding box + centre fix, extracted features, multi-source ingest status |
| **Classification** | 7-class IMD intensity call, class probabilities, Dvorak T-number, intensity history |
| **Prediction** | +6 h → +36 h track/intensity table, pressure curve, uncertainty growth, landfall estimate |
| **Data Pipeline** | All 9 workflow stages, runnable end to end with a live run log |
| **Model Validation** | Scored on 10 historical cyclones held out of training, confusion matrix, error vs persistence baseline |

## Important

This is a **prototype**, not an operational forecast system. No live satellite downlink is
connected and all model outputs are **simulated** from historical cyclone behaviour, so the
interface and workflow can be evaluated before the trained models are wired in. The storm
"BISHAKHA" is a simulated system.

## Run it

No build step, no dependencies:

```bash
python3 -m http.server 3000
# open http://localhost:3000
```

## Stack

Prototype: plain HTML/CSS/JS (zero dependencies, runs anywhere for the demo) —
hand-drawn SVG basin map, procedural enhanced-IR scene on canvas, SVG charts.

Planned production stack (as per the deck): Python · Pandas · NumPy · OpenCV · PyTorch ·
scikit-learn · FastAPI · PostgreSQL · React · Leaflet/Mapbox.

Intended data sources: INSAT-3D/3DR, Himawari-9, MODIS, SCATSAT-1, ERA5, IBTrACS/IMD best-track.
