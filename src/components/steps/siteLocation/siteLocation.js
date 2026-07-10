// ── SITE LOCATION SERVICE (Step 1) ──────────────────────────────
// All functions related to map, coordinates, site setup, and panel configuration

import L from 'leaflet';

// Global map variables (will be replaced with React state later)
let lmap, lmarker, lrect;

// ── MAP INITIALIZATION & MANAGEMENT ─────────────────────────────

export function initMap(lat = 22.5726, lng = 77.3947, city = 'Bhopal') {
  const G = window.G || {}; // Temporary global access
  
  lmap = L.map('lmap', {
    center: [lat, lng],
    zoom: 14
  });
  
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri',
    maxZoom: 19
  }).addTo(lmap);

  const icon = L.divIcon({
    html: '<div style="width:13px;height:13px;background:#E87722;border-radius:50%;border:2.5px solid #fff;box-shadow:0 0 8px rgba(232,119,34,.7)"></div>',
    className: '',
    iconAnchor: [6.5, 6.5]
  });
  
  lmarker = L.marker([lat, lng], { icon, draggable: true })
    .addTo(lmap)
    .bindPopup(createPopupHtml(lat, lng, city))
    .openPopup();
  
  lmarker.on('dragend', e => {
    const ll = e.target.getLatLng();
    updateCoords(ll.lat, ll.lng);
  });
  
  lmap.on('click', e => updateCoords(e.latlng.lat, e.latlng.lng));
  
  drawMapRect(lat, lng);
}

function createPopupHtml(lat, lng, city) {
  return `<b style="color:#E87722">${city}</b><br/>
    <small style="font-family:monospace">${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E</small>`;
}

export function drawMapRect(lat, lng, roofW = 50, roofD = 40) {
  if (lrect) lmap.removeLayer(lrect);
  
  // Convert feet to approx degrees (1 degree ≈ 111km ≈ 364000ft)
  const dLat = roofD / 364000;
  const dLng = (roofW / 364000) / Math.cos(lat * Math.PI / 180);
  const bounds = [
    [lat - dLat/2, lng - dLng/2],
    [lat + dLat/2, lng + dLng/2]
  ];
  
  lrect = L.rectangle(bounds, {
    color: '#E87722',
    weight: 2,
    dashArray: '6 4',
    fillColor: 'rgba(232,119,34,.1)',
    fillOpacity: .3
  }).addTo(lmap);
  
  lrect.bindTooltip(
    `Site: ${roofW}×${roofD}ft (${Math.round(roofW * roofD)} sq.ft)`,
    { permanent: false }
  );

  // Update info bar
  const infoEl = document.getElementById('map-area-info');
  if (infoEl) {
    const diagFt = Math.round(Math.sqrt(roofW * roofW + roofD * roofD));
    infoEl.textContent = `${roofW}ft × ${roofD}ft = ${Math.round(roofW * roofD)} sq.ft · diag ${diagFt}ft`;
  }
}

export function updateCoords(lat, lng) {
  const G = window.G || {};
  
  G.lat = +lat.toFixed(6);
  G.lng = +lng.toFixed(6);
  
  setText('d-lat', G.lat.toFixed(5));
  setText('d-lng', G.lng.toFixed(5));
  
  if (lmarker) {
    lmarker.setLatLng([G.lat, G.lng]);
    lmarker.setPopupContent(createPopupHtml(G.lat, G.lng, G.city));
  }
  
  calcTilt(G.lat);
  onSiteChange();
  
  // Reverse geocode
  fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
    .then(r => r.json())
    .then(d => {
      G.city = d.address?.city || d.address?.town || d.address?.village || d.address?.county || 'Unknown';
      setText('d-city', G.city);
      if (lmarker) lmarker.setPopupContent(createPopupHtml(G.lat, G.lng, G.city));
    })
    .catch(() => {});
}

export async function doGeocode() {
  const q = document.getElementById('msearch')?.value?.trim();
  if (!q) return;
  
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`);
    const d = await r.json();
    
    if (d?.length) {
      const G = window.G || {};
      G.city = d[0].display_name.split(',')[0];
      lmap.setView([+d[0].lat, +d[0].lon], 15);
      updateCoords(+d[0].lat, +d[0].lon);
      setText('d-city', G.city);
    } else {
      alert('Location not found — try another name or click on map.');
    }
  } catch (error) {
    alert('Search unavailable — click on map instead.');
  }
}

// ── TILT CALCULATION β = 0.76 × |φ| ─────────────────────────────

export function calcTilt(lat = 22.5726) {
  const G = window.G || {};
  
  const opt = Math.round(0.76 * Math.abs(lat));
  G.optTilt = Math.max(5, Math.min(45, opt));
  G.tilt = G.optTilt;
  
  setText('tfc-result', G.tilt + '°');
  setText('tfc-sub', '0.76 × ' + Math.abs(lat).toFixed(2) + '° = ' + G.tilt + '° (capped 5–45°)');
  setText('sg-tilt', G.tilt + '°');
  
  const optBox = document.getElementById('opt-box');
  if (optBox) optBox.innerHTML = 'Optimal: <b>' + G.tilt + '°</b> for ' + lat.toFixed(1) + '°N';
  
  setVal('ctilt', G.tilt);
  setText('ctilt-v', G.tilt + '°');
}

export function overrideTilt(v) {
  const G = window.G || {};
  
  G.tilt = +v;
  setText('tilt-ov-val', v + '°');
  setText('sg-tilt', v + '°');
  setVal('ctilt', v);
  setText('ctilt-v', v + '°');
  
  if (window.sceneBuilt && window.buildScene) window.buildScene();
  if (window.drawAll2D) window.drawAll2D();
}

// ── SITE CONFIGURATION ──────────────────────────────────────────

export function onSiteChange() {
  const G = window.G || {};
  
  G.roofW = +document.getElementById('rw')?.value || 50;
  G.roofD = +document.getElementById('rd')?.value || 40;
  G.parapetH = +document.getElementById('ph')?.value || 3;
  
  const autoArea = G.roofW * G.roofD;
  setText('auto-area-val', autoArea.toLocaleString('en-IN'));
  
  // Update dimension display
  setText('d-roofW', G.roofW);
  setText('d-roofD', G.roofD);
  setText('d-parapetH', G.parapetH);

  // Manual area overrides auto
  const manualEl = document.getElementById('manual-area');
  const manualVal = (manualEl && manualEl.value) ? +manualEl.value : 0;
  G.siteArea = manualVal > 0 ? manualVal : autoArea;

  const p = G.panel || {};
  const sqft = p?.sqft || 28;
  const watt = p?.watt || 550;
  const maxP = Math.floor(G.siteArea / sqft);

  // Only recalc numPanels if customer hasn't chosen a count yet
  if (!G.customerSetPanels) {
    G.numPanels = maxP;
    G.systemKW = +(G.numPanels * watt / 1000).toFixed(2);
  }
  
  // Redraw map rectangle with new dimensions
  if (G.lat && G.lng) {
    drawMapRect(G.lat, G.lng, G.roofW, G.roofD);
  }
}

export function confirmSite() {
  onSiteChange();
  calcTilt();
  
  // Sync panel count display
  const G = window.G || {};
  const maxP = Math.floor(G.siteArea / (G.panel?.sqft || 28));
  setText('sg-maxp-hint', maxP);
  
  const el = document.getElementById('panel-count-input');
  if (el && !el.value) {
    // Pre-fill with max panels as a suggestion
    el.placeholder = `e.g. ${Math.min(maxP, 20)} (max: ${maxP})`;
  }
  
  setText('t1', '✅ Done');
  document.getElementById('t1').classList.add('done');
  setProgress(2);
  document.getElementById('s2')?.scrollIntoView({ behavior: 'smooth' });
}

// ── PANEL COUNT MANAGEMENT ──────────────────────────────────────

export function applyPanelCount() {
  const G = window.G || {};
  const el = document.getElementById('panel-count-input');
  const p = G.panel || {};
  const val = parseInt(el?.value) || 0;
  
  if (val <= 0) {
    document.getElementById('pci-result').className = 'pci-result';
    document.getElementById('pci-result').textContent = 'Enter number of panels above';
    return;
  }
  
  const sqft = p?.sqft || 28;
  const watt = p?.watt || 550;
  const maxP = Math.floor(G.siteArea / sqft);
  
  G.numPanels = val;
  G.customerSetPanels = true;
  G.systemKW = +(val * watt / 1000).toFixed(2);
  
  const areaNeeded = val * sqft;
  const res = document.getElementById('pci-result');
  setText('s5-panel-reminder', val);

  if (val > maxP) {
    res.className = 'pci-result over';
    res.textContent = `⚠ ${val} panels need ${areaNeeded} sq.ft but site has only ${G.siteArea} sq.ft (max ${maxP} panels)`;
  } else {
    res.className = 'pci-result good';
    res.textContent = `✅ ${val} panels × ${sqft} sq.ft = ${areaNeeded} sq.ft used of ${G.siteArea} sq.ft (${Math.round(areaNeeded/G.siteArea*100)}%) — ${G.systemKW} kWp`;
  }
  
  // Update summary tile max-panels hint
  const maxEl = document.getElementById('sg-maxp-hint');
  if (maxEl) maxEl.textContent = maxP;

  // Rebuild 3D + 2D diagrams with new count
  if (window.recalcKPIs) window.recalcKPIs();
  if (window.buildScene) window.buildScene();
  if (window.drawAll2D) setTimeout(window.drawAll2D, 60);
}

export function stepPanelCount(delta) {
  const el = document.getElementById('panel-count-input');
  if (!el) return;
  
  const G = window.G || {};
  const cur = parseInt(el.value) || G.numPanels || 1;
  el.value = Math.max(1, cur + delta);
  applyPanelCount();
}

export function applyMaxPanels() {
  const G = window.G || {};
  const p = G.panel || {};
  const sqft = p?.sqft || 28;
  const maxP = Math.floor(G.siteArea / sqft);
  const el = document.getElementById('panel-count-input');
  
  if (el) el.value = maxP;
  applyPanelCount();
}

// Legacy function names for backwards compatibility
export function onCustomPanelCount() { 
  applyPanelCount(); 
}

export function changePanelCount(d) { 
  stepPanelCount(d); 
}

export function useMaxPanels() { 
  applyMaxPanels(); 
}

// ── COMPASS DRAWING ──────────────────────────────────────────────

export function drawCompass() {
  const cv = document.getElementById('comp');
  if (!cv) return;
  
  const ctx = cv.getContext('2d');
  const cx = 85, cy = 85, r = 70;
  
  ctx.clearRect(0, 0, 170, 170);
  
  // Background
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#FEF7E6';
  ctx.fill();
  ctx.strokeStyle = '#E87722';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  // Ticks + labels
  const dirs = [
    { l: 'N', d: 0, c: '#E87722', bold: true },
    { l: 'NE', d: 45, c: '#9BA3BE', bold: false },
    { l: 'E', d: 90, c: '#5C6480', bold: true },
    { l: 'SE', d: 135, c: '#9BA3BE', bold: false },
    { l: 'S', d: 180, c: '#5C6480', bold: true },
    { l: 'SW', d: 225, c: '#9BA3BE', bold: false },
    { l: 'W', d: 270, c: '#5C6480', bold: true },
    { l: 'NW', d: 315, c: '#9BA3BE', bold: false }
  ];
  
  dirs.forEach(d => {
    const rad = (d.d - 90) * Math.PI / 180;
    const r1 = r - 14, r2 = r;
    
    ctx.strokeStyle = d.c;
    ctx.lineWidth = d.bold ? 2 : 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + r1 * Math.cos(rad), cy + r1 * Math.sin(rad));
    ctx.lineTo(cx + r2 * Math.cos(rad), cy + r2 * Math.sin(rad));
    ctx.stroke();
    
    const tr = r - 26;
    ctx.fillStyle = d.c;
    ctx.font = `${d.bold ? 'bold ' : ''}${d.bold ? 12 : 10}px Inter,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.l, cx + (tr + 2) * Math.cos(rad) - 1, cy + (tr + 2) * Math.sin(rad) + 1);
  });
  
  // North arrow
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 6);
  ctx.lineTo(cx - 5, cy - 10);
  ctx.lineTo(cx + 5, cy - 10);
  ctx.fillStyle = '#E87722';
  ctx.fill();
  
  // Center
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#1A1F2E';
  ctx.fill();
}

// ── UTILITY FUNCTIONS (used by site location) ───────────────────

export function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

export function setVal(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}

export function setProgress(step, total = 7) {
  const element = document.getElementById('prog');
  if (element) element.style.width = (step / total * 100) + '%';
}