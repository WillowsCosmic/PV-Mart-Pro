# PVMart Pro — Solar PV Design & Simulation Platform

A comprehensive, browser-based solar PV design tool for residential and commercial rooftop systems. Built with React 19, Three.js (React Three Fiber), Leaflet, Vite, and Zustand.

---

## Features

### 1. Site Location & Weather
- **Interactive Leaflet map** – click to place site, or search by address (Nominatim geocoding)
- **NASA POWER API integration** – fetches real solar irradiance, temperature, and weather data for the selected coordinates
- Automatic **optimal tilt calculation** (β = 0.76 × |latitude|, capped 5°–45°)

### 2. Obstacle Mapping
- Draw obstacles (trees, water tanks, parapets, chimneys, HVAC units) directly on the 2D roof plan
- Each obstacle casts **3D shadows** calculated from sun position
- Visual shading analysis with percentage loss calculation

### 3. Product Selection
- Curated database of **panels, inverters, and batteries** from major Indian brands (Tata, Waaree, Adani, Luminous, Loom Solar, etc.)
- **System type selection**: On-Grid / Hybrid / Off-Grid
- **Physics-based validation**: DC/AC ratio, string voltage limits, MPPT window, battery compatibility
- Real-time **financial metrics**: DC kWp, annual yield (kWh), savings (₹), payback period

### 4. 3D Solar Model (React Three Fiber + Drei)
- Interactive 3D roof with parapets, panel rows, inverters, batteries
- **Sun path visualization** – animated sun trajectory for any date/time
- **Shadow casting** from parapets and obstacles (CSM shadows)
- Drag-to-rotate, scroll-to-zoom, theme toggle (light/dark)
- **Drag-and-drop panel placement** with row/column snapping

### 5. Electrical Diagrams (SVG)
- **Single-line diagram (SLD)** – panels → strings → combiner → inverter → AC panel → meter
- **String layout diagram** – series/parallel string visualization with voltage/current labels
- **Cable schedule** – DC/AC cable sizing, voltage drop %, conduit fill

### 6. Performance Simulation
- **Hourly simulation** (8760 hours) using NASA POWER weather data
- **Temperature derating** (Pmax temp coefficient)
- **Shading loss** from 3D obstacle shadows
- **Soiling, wiring, inverter, availability losses**
- **Monthly/annual yield charts** (Chart.js)
- **Specific yield (kWh/kWp)** and performance ratio

### 7. Financial Analysis
- **CAPEX breakdown** – panels, inverter, battery, structure, cabling, installation
- **OPEX** – annual maintenance, insurance
- **Revenue** – self-consumption savings + net metering export
- **Key metrics**: Payback period, NPV, IRR, LCOE (₹/kWh), cash-flow waterfall chart
- Configurable: tariff, escalation, discount rate, loan terms, depreciation

### 8. Report Generator
- **Professional PDF report** (jsPDF + html2canvas)
- Includes: site summary, 3D screenshots, SLD, string layout, monthly yield table, financial summary, disclaimer
- **One-click download** (PDF)

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 + Vite 8 |
| 3D Graphics | @react-three/fiber, @react-three/drei, Three.js |
| Maps | Leaflet + React-Leaflet |
| Charts | Chart.js + react-chartjs-2 |
| State | Zustand |
| HTTP | Axios |
| PDF Export | jsPDF + html2canvas |
| Physics/Calcs | Custom solar physics engine (solarPhysics.js) |
| Styling | Plain CSS (CSS variables, responsive grid) |
| Linting | ESLint (React hooks, refresh) |

---

## Project Structure

```
src/
├── components/
│   ├── common/           # NavBar, shared UI
│   ├── map/              # MapComponent (Leaflet wrapper)
│   ├── three/            # ThreeCanvas, ThreeHud, SunControl
│   └── ...
├── pages/steps/
│   ├── SiteLocationPage.jsx          # Step 1 – Map, coords, NASA POWER, site dims
│   ├── ObstacleMappingPage.jsx       # Step 2 – Draw obstacles on roof plan
│   ├── ProductSelectionPage.jsx      # Step 3 – Panels, inverters, batteries, validation
│   ├── Model3DPage.jsx               # Step 4 – 3D roof, panels, sun path, shadows
│   ├── DiagramsPage.jsx              # Step 5 – SLD, string layout, cable schedule
│   ├── SimulationPage.jsx            # Step 6 – 8760-hr simulation, charts
│   ├── AnalysisPage.jsx              # Step 7 – Financials, NPV/IRR/LCOE
│   └── ReportGeneratorPage.jsx       # Step 8 – PDF report export
├── services/
│   ├── productDatabase.js   # Panel/Inverter/Battery catalogs
│   ├── solarPhysics.js      # Sun position, irradiance, shading, yield calcs
│   ├── constants.js         # System types, electricity boards (Indian DISCOMs)
│   └── diagrams.js          # SVG diagram generators
├── solar3d/
│   ├── Solar3DCanvas.jsx    # Main R3F canvas
│   ├── Building.jsx         # Roof + parapet mesh
│   ├── Panels.jsx           # Panel row groups (instanced)
│   ├── Obstacles.jsx        # 3D obstacle meshes
│   ├── Sunlight.jsx         # Sun sphere + light + shadow camera
│   ├── SunPath.jsx          # Analemma / daily arc visualization
│   ├── Wiring.jsx           # DC/AC conduit visualization
│   ├── useSolarStore.js     # Zustand store (global state)
│   └── themes.js / useDragMove.js / useCameraOrbit.js
├── three/                   # Legacy Three.js helpers (sun, scene, capture)
├── styles/style.css         # Global styles, CSS variables, stepper UI
├── App.jsx                  # Page composition (all steps stacked)
├── main.jsx                 # Entry point
└── index.css                # Vite/React base styles
```

---

## Getting Started

### Prerequisites
- **Node.js ≥ 18** (recommended 20+)
- **npm ≥ 9** (or pnpm/yarn)

### Installation

```bash
cd PVMart-Pro-main
npm install
```

### Development

```bash
npm run dev
# Opens http://localhost:5173
```

### Production Build

```bash
npm run build
# Output in ./dist
```

### Preview Production Build

```bash
npm run preview
```

### Linting

```bash
npm run lint
```

---

## Usage Workflow

1. **Site Location** – Search or click map → coordinates auto-filled → NASA POWER fetches weather → optimal tilt calculated
2. **Site Dimensions** – Enter roof width/depth/parapet → auto-calculates usable area & max panels
3. **Obstacle Mapping** – Draw obstacles on roof plan → 3D shadows computed
4. **Product Selection** – Choose system type, panel, inverter, battery → physics validation runs live
5. **3D Model** – Drag panels onto roof, adjust tilt/azimuth, scrub sun path timeline
6. **Diagrams** – Auto-generated SLD, string layout, cable schedule (SVG)
7. **Simulation** – Run 8760-hour yield simulation with all loss factors
8. **Analysis** – Review financials: payback, NPV, IRR, LCOE, cash flow chart
9. **Report** – Generate and download professional PDF

---

## Key Configuration

### Electricity Boards (Indian DISCOMs)
Edit `src/services/constants.js` → `ELECTRICITY_BOARDS` to add/modify utilities, tariffs, net-metering policies.

### Product Database
Edit `src/services/productDatabase.js` → `PANELS`, `INVERTERS`, `BATTERIES` arrays.  
Each entry includes: brand, model, wattage, voltage, current, dimensions, efficiency, temperature coefficients, price.

### Solar Physics Constants
Edit `src/services/constants.js` → `PHYSICS_CONSTANTS` for:
- STC irradiance (1000 W/m²)
- Cell temperature coefficients
- Default loss factors (soiling, wiring, inverter, availability)
- Panel temperature model (NOCT, etc.)

---

## NASA POWER API
- Uses **NASA POWER API** (no key required for basic access)
- Endpoint: `https://power.lrc.nasa.gov/api/temporal/daily/point`
- Parameters: `parameters=ALLSKY_SFC_SW_DWN,T2M,WS2M,RH2M`, `community=RE`, `format=JSON`
- Cached in browser session; falls back to synthetic data if API fails

---

## State Management (Zustand)

All global state lives in `src/solar3d/useSolarStore.js` (`useSolarStore`).
Key slices:
```js
G: { lat, lng, city, roofW, roofD, parapetH, siteArea, optTilt, tilt, azimuth, numPanels, panel, inverter, battery, gridType, boardName, boardTariff, systemKW, annualYield, validation, ... }
```
Actions: `updateG(partial)`, `resetG()`, `setPanel(p)`, `setInverter(i)`, `setBattery(b)`, etc.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (HMR) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint on `src/` |

---

## Deployment

### Static Hosting (Vercel, Netlify, GitHub Pages, Cloudflare Pages)
```bash
npm run build
# Deploy the ./dist folder
```
- Configure SPA fallback (redirect all routes to `index.html`)
- No server-side rendering required

### Docker (example)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## Environment Variables

Create `.env.local` (optional):
```env
VITE_NASA_POWER_API=https://power.lrc.nasa.gov/api/temporal/daily/point
VITE_NOMINATIM_API=https://nominatim.openstreetmap.org
```
Defaults are hardcoded in services if not provided.

---

## Browser Support
- Chrome/Edge 100+
- Firefox 100+
- Safari 15+
- Requires WebGL2 (for Three.js shadows & instancing)

---

## License
MIT — feel free to use, modify, and distribute.

---

## Contributing
1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and `npm run build`
5. Open a PR

---

## Acknowledgements
- **NASA POWER** for free solar radiation data
- **OpenStreetMap / Nominatim** for geocoding & tiles
- **React Three Fiber / Drei** for making 3D in React delightful
- **Chart.js** for beautiful charts
- **jsPDF + html2canvas** for client-side PDF generation
- Indian solar industry for product specifications & tariff data