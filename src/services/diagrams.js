import { SF } from "./solarPhysics";
import { useSolarStore } from "../solar3d/useSolarStore";

export function drawAll2D(G) {
  drawLayoutDiagram(G);
  drawWiringDiagram(G);
  drawTiltDiagram(G);
  drawShadowMap(G);
  drawIsoShading(G);
  const tag = document.getElementById("t4");
  if (tag) {
    tag.textContent = "✅ Done";
    tag.classList.add("done");
  }
}

// ── 1. TOP-VIEW PANEL LAYOUT ─────────────────────────────
export function drawLayoutDiagram(G) {
  const cv = document.getElementById("d-layout");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const W = cv.width,
    H = cv.height;
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = "#F8F4EC";
  ctx.fillRect(0, 0, W, H);
  // Grid dots
  ctx.fillStyle = "#DDD8CC";
  for (let x = 0; x < W; x += 18)
    for (let y = 0; y < H; y += 18) {
      ctx.beginPath();
      ctx.arc(x, y, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

  const n = G.numPanels || 0;
  const m = 20; // margin
  // Site boundary
  ctx.strokeStyle = "#E87722";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(m, m, W - m * 2, H - m * 2);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(232,119,34,.05)";
  ctx.fillRect(m, m, W - m * 2, H - m * 2);

  if (n === 0) {
    ctx.fillStyle = "#9BA3BE";
    ctx.font = "14px Inter,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Complete Steps 1-2 to see layout", W / 2, H / 2);
    return;
  }

  const cols = Math.min(22, Math.ceil(Math.sqrt(n * 1.5)));
  const rows = Math.ceil(n / cols);
  const aW = W - m * 2 - 12,
    aH = H - m * 2 - 12;
  const pW = Math.min(18, aW / cols - 2);
  const pH = Math.min(27, aH / rows - 3);
  const gX = (aW - cols * pW) / Math.max(1, cols - 1);
  const gY = (aH - rows * pH) / Math.max(1, rows - 1);

  // Determine shaded panels
  const shSet = new Set();
  G.shadingData.forEach((sd) => {
    if (sd.isCritical) {
      const d = sd.dirDeg;
      if (d < 45 || d > 315) for (let c = 0; c < cols; c++) shSet.add(`0,${c}`);
      else if (d >= 45 && d < 135)
        for (let r = 0; r < rows; r++) shSet.add(`${r},${cols - 1}`);
      else if (d >= 135 && d < 225)
        for (let c = 0; c < cols; c++) shSet.add(`${rows - 1},${c}`);
      else for (let r = 0; r < rows; r++) shSet.add(`${r},0`);
    }
  });

  let count = 0;
  const positions = [];
  for (let r = 0; r < rows && count < n; r++) {
    for (let c = 0; c < cols && count < n; c++) {
      const x = m + 6 + c * (pW + gX),
        y = m + 6 + r * (pH + gY);
      const shaded = shSet.has(`${r},${c}`);
      ctx.fillStyle = shaded ? "rgba(232,119,34,.7)" : "#1B6FA8";
      ctx.fillRect(x, y, pW, pH);
      // Cell lines
      ctx.strokeStyle = shaded
        ? "rgba(255,200,150,.4)"
        : "rgba(100,160,220,.5)";
      ctx.lineWidth = 0.35;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x + pW / 3, y);
      ctx.lineTo(x + pW / 3, y + pH);
      ctx.moveTo(x + (pW * 2) / 3, y);
      ctx.lineTo(x + (pW * 2) / 3, y + pH);
      ctx.moveTo(x, y + pH / 2);
      ctx.lineTo(x + pW, y + pH / 2);
      ctx.stroke();
      // Number
      ctx.fillStyle = "rgba(255,255,255,.8)";
      ctx.font = `bold ${Math.max(5, pW * 0.35)}px JetBrains Mono,monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(count + 1, x + pW / 2, y + pH / 2);
      positions.push({ x: x + pW / 2, y: y + pH / 2, idx: count });
      count++;
    }
  }

  // Inverter box
  const invX = W - m - 32,
    invY = m + 6;
  ctx.fillStyle = "#1A1F2E";
  ctx.fillRect(invX, invY, 26, 36);
  ctx.fillStyle = "#E87722";
  ctx.font = "bold 8px Inter,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("INV", invX + 13, invY + 14);
  ctx.fillStyle = "rgba(255,255,255,.6)";
  ctx.font = "7px Inter,sans-serif";
  ctx.fillText(G.inverter ? G.inverter.kw + "kW" : "?kW", invX + 13, invY + 27);

  // Draw wiring on layout
  if (positions.length > 0) {
    const ix = invX,
      iy = invY + 18;
    ctx.lineWidth = 0.9;
    ctx.setLineDash([]);
    if (G.wiringMode === "series") {
      ctx.strokeStyle = "rgba(26,158,91,.7)";
      for (let i = 0; i < positions.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(positions[i].x, positions[i].y);
        ctx.lineTo(positions[i + 1].x, positions[i + 1].y);
        ctx.stroke();
      }
      ctx.strokeStyle = "#E87722";
      if (positions[0]) {
        ctx.beginPath();
        ctx.moveTo(positions[0].x, positions[0].y);
        ctx.lineTo(ix, iy);
        ctx.stroke();
      }
    } else if (G.wiringMode === "parallel") {
      const busY = m + 4;
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(m, busY);
      ctx.lineTo(W - m, busY);
      ctx.stroke();
      ctx.lineWidth = 0.8;
      positions.forEach((p) => {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, busY);
        ctx.stroke();
      });
      ctx.strokeStyle = "#E87722";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ix, busY);
      ctx.lineTo(ix, iy);
      ctx.stroke();
    } else {
      // S+P
      const busX = W - m - 40;
      ctx.strokeStyle = "#22C55E";
      ctx.lineWidth = 0.8;
      for (let i = 0; i < positions.length - 1; i++) {
        if (Math.floor(i / cols) === Math.floor((i + 1) / cols)) {
          ctx.beginPath();
          ctx.moveTo(positions[i].x, positions[i].y);
          ctx.lineTo(positions[i + 1].x, positions[i + 1].y);
          ctx.stroke();
        }
      }
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 1.2;
      for (let r = 0; r < rows; r++) {
        const last =
          positions[Math.min(r * cols + cols - 1, positions.length - 1)];
        if (last) {
          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(busX, last.y);
          ctx.stroke();
        }
      }
      ctx.strokeStyle = "#E87722";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(busX, positions[0]?.y || m);
      ctx.lineTo(busX, positions[positions.length - 1]?.y || H - m);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(busX, positions[Math.floor(positions.length / 2)]?.y || H / 2);
      ctx.lineTo(ix, iy);
      ctx.stroke();
    }
  }

  // Legend
  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.fillRect(m, H - m - 22, 200, 18);
  ctx.fillStyle = "#1B6FA8";
  ctx.fillRect(m + 4, H - m - 18, 10, 10);
  ctx.fillStyle = "#1A1F2E";
  ctx.font = "9px Inter,sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Active", m + 17, H - m - 9);
  ctx.fillStyle = "#E87722";
  ctx.fillRect(m + 60, H - m - 18, 10, 10);
  ctx.fillText("Shaded", m + 73, H - m - 9);
  ctx.fillStyle = "#22C55E";
  ctx.fillRect(m + 120, H - m - 18, 10, 5);
  ctx.fillText("Wire", m + 133, H - m - 9);

  // Compass
  drawCompassSmall(ctx, W - 36, 36, 14);

  // Stats
  ctx.fillStyle = "#E87722";
  ctx.font = "bold 10px Plus Jakarta Sans,sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(
    `${n} Panels · ${G.systemKW} kWp · Tilt ${G.tilt}°`,
    m + 4,
    H - m + 14,
  );
}

// ── 2. WIRING DIAGRAM — clean schematic ─────────────────────
export function drawWiringDiagram(G) {
  const cv = document.getElementById("d-wiring");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const W = cv.width,
    H = cv.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#F8F4EC";
  ctx.fillRect(0, 0, W, H);

  const n = G.numPanels || 0;
  const p = G.panel;
  const inv = G.inverter;
  const mode = G.wiringMode || "series";

  // Title bar
  ctx.fillStyle = "#1A1F2E";
  ctx.fillRect(0, 0, W, 24);
  ctx.fillStyle = "#E87722";
  ctx.fillRect(0, 22, W, 2);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px Plus Jakarta Sans,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const modeLabel =
    mode === "series"
      ? "Series (Voltage ↑)"
      : mode === "parallel"
        ? "Parallel (Current ↑)"
        : "Series-Parallel (V & I ↑)";
  ctx.fillText(
    modeLabel + " · " + n + " Panels · " + (G.systemKW || "—") + " kWp",
    W / 2,
    13,
  );

  if (!p || n === 0) {
    ctx.fillStyle = "#9BA3BE";
    ctx.font = "12px Inter,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Complete Steps 1-5 first", W / 2, H / 2);
    return;
  }

  const pW = 32,
    pH = 18;
  const perStr = inv
    ? Math.floor((inv.maxVdc * 0.9) / p.voc)
    : Math.max(1, Math.ceil(n / 3));
  const numStr = Math.ceil(n / perStr);
  ctx.textBaseline = "middle";

  if (mode === "series") {
    const show = Math.min(n, Math.floor((W - 110) / (pW + 7)));
    const totalPW = show * (pW + 7) - 7;
    const startX = (W - totalPW - 60) / 2,
      midY = H / 2 + 4;
    for (let i = 0; i < show; i++) {
      const px = startX + i * (pW + 7);
      const shaded =
        G.shadingData.some((sd) => sd.isCritical) &&
        (i === 0 || i === show - 1);
      ctx.fillStyle = shaded ? "rgba(232,119,34,.85)" : "#1B6FA8";
      ctx.roundRect
        ? ctx.roundRect(px, midY - pH / 2, pW, pH, 3)
        : ctx.rect(px, midY - pH / 2, pW, pH);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 7px JetBrains Mono,monospace";
      ctx.textAlign = "center";
      ctx.fillText("P" + (i + 1), px + pW / 2, midY);
      ctx.fillStyle = "#F87171";
      ctx.font = "bold 7px sans-serif";
      ctx.fillText("+", px + pW - 1, midY - pH / 2 - 4);
      ctx.fillStyle = "#93C5FD";
      ctx.fillText("−", px + 1, midY - pH / 2 - 4);
      if (i < show - 1) {
        ctx.strokeStyle = "#22C55E";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(px + pW, midY);
        ctx.lineTo(px + pW + 7, midY);
        ctx.stroke();
        ctx.fillStyle = "#22C55E";
        ctx.beginPath();
        ctx.moveTo(px + pW + 4, midY - 3);
        ctx.lineTo(px + pW + 7, midY);
        ctx.lineTo(px + pW + 4, midY + 3);
        ctx.fill();
      }
    }
    if (n > show) {
      ctx.fillStyle = "#9BA3BE";
      ctx.font = "9px Inter,sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(
        "…+" + (n - show) + " more",
        startX + show * (pW + 7) + 2,
        midY,
      );
    }
    const endX = startX + show * (pW + 7) - 7 + pW;
    ctx.strokeStyle = "#E87722";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(endX + 4, midY);
    ctx.lineTo(endX + 40, midY);
    ctx.stroke();
    const ivX = endX + 40,
      ivY = midY - 22;
    ctx.fillStyle = "#1A1F2E";
    ctx.roundRect
      ? ctx.roundRect(ivX, ivY, 42, 44, 4)
      : ctx.rect(ivX, ivY, 42, 44);
    ctx.fill();
    ctx.fillStyle = "#E87722";
    ctx.font = "bold 9px Plus Jakarta Sans,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("INV", ivX + 21, ivY + 11);
    ctx.fillStyle = "rgba(255,255,255,.65)";
    ctx.font = "7px Inter,sans-serif";
    ctx.fillText(inv ? inv.kw + "kW" : "?kW", ivX + 21, ivY + 22);
    ctx.fillStyle = "#22C55E";
    ctx.font = "7px Inter,sans-serif";
    ctx.fillText("AC→Grid", ivX + 21, ivY + 34);
    ctx.fillStyle = "rgba(34,197,94,.1)";
    ctx.roundRect
      ? ctx.roundRect(6, H - 30, W - 12, 24, 4)
      : ctx.rect(6, H - 30, W - 12, 24);
    ctx.fill();
    ctx.fillStyle = "#1A1F2E";
    ctx.font = "bold 8px Plus Jakarta Sans,sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      "Series: Panels/str:" +
        perStr +
        "  Strings:" +
        numStr +
        "  Voc:" +
        (p.voc * perStr).toFixed(0) +
        "V  Isc:" +
        p.isc.toFixed(1) +
        "A  " +
        G.systemKW +
        "kWp",
      10,
      H - 16,
    );
  } else if (mode === "parallel") {
    const show = Math.min(n, 8);
    const busX1 = 38,
      busX2 = W - 80,
      busTop = 30,
      busBot = H - 36;
    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(busX1, busTop);
    ctx.lineTo(busX1, busBot);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(busX2, busTop);
    ctx.lineTo(busX2, busBot);
    ctx.stroke();
    ctx.fillStyle = "#F59E0B";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("+", busX1, busTop - 8);
    ctx.fillText("−", busX2, busTop - 8);
    ctx.fillStyle = "rgba(245,158,11,.18)";
    ctx.fillRect(busX1 - 3, busTop, 6, busBot - busTop);
    ctx.fillRect(busX2 - 3, busTop, 6, busBot - busTop);
    const step = (busBot - busTop) / (show + 1);
    for (let i = 0; i < show; i++) {
      const py = busTop + (i + 1) * step,
        px = busX1 + 26;
      ctx.fillStyle = "#1B6FA8";
      ctx.roundRect
        ? ctx.roundRect(px, py - pH / 2, pW, pH, 3)
        : ctx.rect(px, py - pH / 2, pW, pH);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 7px JetBrains Mono,monospace";
      ctx.textAlign = "center";
      ctx.fillText("P" + (i + 1), px + pW / 2, py);
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(busX1, py);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px + pW, py);
      ctx.lineTo(busX2, py);
      ctx.stroke();
    }
    if (n > show) {
      ctx.fillStyle = "#9BA3BE";
      ctx.font = "9px Inter,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("+" + (n - show) + " more", busX1 + 55, busBot + 12);
    }
    const ivX = busX2 + 8,
      ivY = H / 2 - 22;
    ctx.fillStyle = "#1A1F2E";
    ctx.roundRect
      ? ctx.roundRect(ivX, ivY, 42, 44, 4)
      : ctx.rect(ivX, ivY, 42, 44);
    ctx.fill();
    ctx.fillStyle = "#E87722";
    ctx.font = "bold 9px Plus Jakarta Sans,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("INV", ivX + 21, ivY + 11);
    ctx.fillStyle = "rgba(255,255,255,.65)";
    ctx.font = "7px Inter,sans-serif";
    ctx.fillText(inv ? inv.kw + "kW" : "?kW", ivX + 21, ivY + 22);
    ctx.strokeStyle = "#E87722";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(busX2, H / 2);
    ctx.lineTo(ivX, H / 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(245,158,11,.1)";
    ctx.roundRect
      ? ctx.roundRect(6, H - 30, W - 12, 24, 4)
      : ctx.rect(6, H - 30, W - 12, 24);
    ctx.fill();
    ctx.fillStyle = "#1A1F2E";
    ctx.font = "bold 8px Plus Jakarta Sans,sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      "Parallel: Voc:" +
        p.vmp.toFixed(0) +
        "V  I:" +
        (p.imp * n).toFixed(1) +
        "A  Strings:1  " +
        G.systemKW +
        "kWp",
      10,
      H - 16,
    );
  } else {
    const showStr = Math.min(numStr, 4),
      showPer = Math.min(perStr, 4);
    const busX = W - 72,
      strH = (H - 52) / showStr;
    const bTop = 30,
      bBot = 30 + showStr * strH;
    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(busX, bTop);
    ctx.lineTo(busX, bBot);
    ctx.stroke();
    ctx.fillStyle = "#F59E0B";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Bus", busX, bTop - 8);
    for (let s = 0; s < showStr; s++) {
      const sy = 30 + s * strH + strH / 2;
      const strLabel = "S" + (s + 1) + ":";
      ctx.fillStyle = "#9BA3BE";
      ctx.font = "7px Inter,sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(strLabel, 4, sy);
      for (let i = 0; i < showPer; i++) {
        const px = 20 + i * (pW + 5),
          py = sy - pH / 2;
        ctx.fillStyle = "#1B6FA8";
        ctx.roundRect
          ? ctx.roundRect(px, py, pW, pH, 3)
          : ctx.rect(px, py, pW, pH);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 7px JetBrains Mono,monospace";
        ctx.textAlign = "center";
        ctx.fillText("P" + (s * perStr + i + 1), px + pW / 2, sy);
        if (i < showPer - 1) {
          ctx.strokeStyle = "#22C55E";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px + pW, sy);
          ctx.lineTo(px + pW + 5, sy);
          ctx.stroke();
        }
      }
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20 + showPer * (pW + 5) - 5, sy);
      ctx.lineTo(busX, sy);
      ctx.stroke();
    }
    if (numStr > showStr) {
      ctx.fillStyle = "#9BA3BE";
      ctx.font = "9px Inter,sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("+" + (numStr - showStr) + " more", 20, bBot + 12);
    }
    const ivX = busX + 8,
      ivY = (bTop + bBot) / 2 - 22;
    ctx.fillStyle = "#1A1F2E";
    ctx.roundRect
      ? ctx.roundRect(ivX, ivY, 42, 44, 4)
      : ctx.rect(ivX, ivY, 42, 44);
    ctx.fill();
    ctx.fillStyle = "#E87722";
    ctx.font = "bold 9px Plus Jakarta Sans,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("INV", ivX + 21, ivY + 11);
    ctx.fillStyle = "rgba(255,255,255,.65)";
    ctx.font = "7px Inter,sans-serif";
    ctx.fillText(inv ? inv.kw + "kW" : "?kW", ivX + 21, ivY + 22);
    ctx.strokeStyle = "#E87722";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(busX, (bTop + bBot) / 2);
    ctx.lineTo(ivX, (bTop + bBot) / 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(232,119,34,.1)";
    ctx.roundRect
      ? ctx.roundRect(6, H - 30, W - 12, 24, 4)
      : ctx.rect(6, H - 30, W - 12, 24);
    ctx.fill();
    ctx.fillStyle = "#1A1F2E";
    ctx.font = "bold 8px Plus Jakarta Sans,sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      "S+P: " +
        numStr +
        "str×" +
        perStr +
        "pan  Voc:" +
        (p.voc * perStr).toFixed(0) +
        "V  I:" +
        (p.imp * numStr).toFixed(1) +
        "A  " +
        G.systemKW +
        "kWp",
      10,
      H - 16,
    );
  }
}

// ── 3. TILT CROSS-SECTION ────────────────────────────────
export function drawTiltDiagram(G) {
  const cv = document.getElementById("d-tilt");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const W = cv.width,
    H = cv.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#F0EDE4";
  ctx.fillRect(0, 0, W, H);

  const tilt = G.tilt || 15;
  const opt = G.optTilt || 15;
  const lat = G.lat || 22;

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  sky.addColorStop(0, "#BFD9F0");
  sky.addColorStop(1, "#F0EDE4");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.55);

  // Ground line
  const gy = H * 0.62;
  ctx.fillStyle = "#6B7B4A";
  ctx.fillRect(0, gy, W, H - gy);
  ctx.strokeStyle = "#4A5A30";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, gy);
  ctx.lineTo(W, gy);
  ctx.stroke();
  ctx.fillStyle = "rgba(100,120,60,.3)";
  for (let x = 0; x < W; x += 8)
    ctx.fillRect(x, gy + 1, 2, Math.random() * 4 + 2);

  // Roof/parapet
  const rX = 80,
    rY = gy - 20,
    rW = W - 160;
  ctx.fillStyle = "#6B7280";
  ctx.fillRect(rX, rY, rW, 20);
  ctx.fillStyle = "#9CA3AF";
  ctx.fillRect(rX, rY - 12, 18, 12);
  ctx.fillRect(rX + rW - 18, rY - 12, 18, 12);

  // Solar panel
  const tR = (tilt * Math.PI) / 180;
  const panLen = 120;
  const panStartX = rX + rW / 3,
    panStartY = rY - 2;
  const panEndX = panStartX + panLen * Math.cos(tR);
  const panEndY = panStartY - panLen * Math.sin(tR);

  // Panel shadow
  ctx.strokeStyle = "rgba(27,111,168,.15)";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(panStartX + 3, panStartY + 3);
  ctx.lineTo(panEndX + 3, panEndY + 3);
  ctx.stroke();
  // Panel body
  ctx.strokeStyle = "#1B6FA8";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(panStartX, panStartY);
  ctx.lineTo(panEndX, panEndY);
  ctx.stroke();
  ctx.strokeStyle = "rgba(100,160,220,.6)";
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    const lx = panStartX + t * (panEndX - panStartX),
      ly = panStartY + t * (panEndY - panStartY);
    const nx = Math.sin(tR) * 4,
      ny = Math.cos(tR) * 4;
    ctx.beginPath();
    ctx.moveTo(lx - nx, ly - ny);
    ctx.lineTo(lx + nx, ly + ny);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // Tilt arc
  ctx.strokeStyle = "#E87722";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.arc(panStartX, panStartY, 50, -tR, 0);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#E87722";
  ctx.font = "bold 13px Plus Jakarta Sans,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`β = ${tilt}°`, panStartX + 60, panStartY - 15);
  ctx.font = "11px Inter,sans-serif";
  ctx.fillStyle = "#5C6480";
  ctx.fillText(`(0.76 × |${lat.toFixed(1)}°|)`, panStartX + 60, panStartY - 2);

  // Horizontal reference
  ctx.strokeStyle = "rgba(100,100,100,.4)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(panStartX, panStartY);
  ctx.lineTo(panStartX + 100, panStartY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Sun
  const sunX = W - 70,
    sunY = 50;
  ctx.fillStyle = "#F59E0B";
  ctx.beginPath();
  ctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
  ctx.fill();
  // Sun rays
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sunX + 26 * Math.cos(a), sunY + 26 * Math.sin(a));
    ctx.lineTo(sunX + 34 * Math.cos(a), sunY + 34 * Math.sin(a));
    ctx.stroke();
  }
  // Sun ray to panel
  const midPX = (panStartX + panEndX) / 2,
    midPY = (panStartY + panEndY) / 2;
  ctx.strokeStyle = "rgba(245,158,11,.5)";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(sunX, sunY + 20);
  ctx.lineTo(midPX, midPY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Optimal tilt indicator
  const optR = (opt * Math.PI) / 180;
  ctx.strokeStyle = "rgba(26,158,91,.5)";
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(panStartX, panStartY);
  ctx.lineTo(
    panStartX + 100 * Math.cos(optR),
    panStartY - 100 * Math.sin(optR),
  );
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#1A9E5B";
  ctx.font = "10px Inter,sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(
    `Optimal: ${opt}°`,
    panStartX + 100 * Math.cos(optR) + 4,
    panStartY - 100 * Math.sin(optR),
  );

  // Labels
  ctx.fillStyle = "#1A1F2E";
  ctx.font = "bold 11px Plus Jakarta Sans,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Roof Surface", rX + rW / 2, gy + 12);
  ctx.fillStyle = "#1B6FA8";
  ctx.font = "bold 11px Plus Jakarta Sans,sans-serif";
  ctx.fillText("Solar Panel", panEndX + 8, panEndY - 6);

  // Info box
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.roundRect(8, H - 52, W - 16, 44, 6);
  ctx.fill();
  ctx.fillStyle = "#1A1F2E";
  ctx.font = "bold 10px Plus Jakarta Sans,sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(
    `Formula: β = 0.76 × |φ| = 0.76 × ${Math.abs(lat).toFixed(1)}° = ${opt}° (optimal)`,
    14,
    H - 36,
  );
  ctx.fillStyle = "#E87722";
  ctx.font = "9px JetBrains Mono,monospace";
  ctx.fillText(
    `Current: ${tilt}°  |  Lat: ${lat.toFixed(2)}°N  |  ${tilt === opt ? "✓ Using Optimal" : "▲ Manual Override"}`,
    14,
    H - 20,
  );
}

// ── 4. OBSTACLE SHADOW MAP ───────────────────────────────
export function drawShadowMap(G) {
  const cv = document.getElementById("d-shadow");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const W = cv.width,
    H = cv.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#1A2235";
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2,
    cy = H / 2,
    maxR = Math.min(W, H) / 2 - 30;

  // Grid rings
  for (let r = 1; r <= 4; r++) {
    ctx.strokeStyle = `rgba(100,120,160,${0.1 + r * 0.04})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, r * (maxR / 4), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(100,120,160,.4)";
    ctx.font = "9px Inter,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      (((r * maxR) / 4) * 2).toFixed(0) + "ft",
      cx + r * (maxR / 4) + 4,
      cy - 3,
    );
  }
  // Axes
  ctx.strokeStyle = "rgba(100,120,160,.3)";
  ctx.lineWidth = 0.8;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(cx - maxR, cy);
  ctx.lineTo(cx + maxR, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - maxR);
  ctx.lineTo(cx, cy + maxR);
  ctx.stroke();
  ctx.setLineDash([]);

  // Direction labels
  const dls = [
    ["N", 0, -1, "#E87722"],
    ["NE", 0.7, -0.7, "#9BA3BE"],
    ["E", 1, 0, "#9BA3BE"],
    ["SE", 0.7, 0.7, "#9BA3BE"],
    ["S", 0, 1, "#9BA3BE"],
    ["SW", -0.7, 0.7, "#9BA3BE"],
    ["W", -1, 0, "#9BA3BE"],
    ["NW", -0.7, -0.7, "#9BA3BE"],
  ];
  dls.forEach(([l, dx, dy, c]) => {
    ctx.fillStyle = c;
    ctx.font = `bold 11px Inter,sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(l, cx + dx * (maxR + 16), cy + dy * (maxR + 16));
  });

  // Roof boundary
  const roofR = maxR * 0.25;
  ctx.strokeStyle = "#E87722";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(cx - roofR, cy - roofR, roofR * 2, roofR * 2);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(232,119,34,.08)";
  ctx.fillRect(cx - roofR, cy - roofR, roofR * 2, roofR * 2);
  ctx.fillStyle = "#E87722";
  ctx.font = "bold 9px Inter,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PANELS", cx, cy);

  if (G.obstacles.length === 0) {
    ctx.fillStyle = "#22C55E";
    ctx.font = "12px Inter,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✅ No Obstacles Detected", cx, cy + 50);
    return;
  }

  G.obstacles.forEach((obs, i) => {
    const dirRad = ((obs.dir - 90) * Math.PI) / 180; // 0=east on canvas
    const dist = Math.min(obs.dist, maxR / 0.8);
    const scale = maxR / 120; // 120ft = maxR
    const ox = cx + Math.cos(dirRad) * dist * scale;
    const oy = cy + Math.sin(dirRad) * dist * scale;

    // Shadow cone
    const sd = G.shadingData[i];
    const shadeAngle = sd?.shadeAngle || 10;
    const coneR = Math.max(10, (shadeAngle / 90) * maxR * 0.6);
    const coneAng = Math.atan2(oy - cy, ox - cx);
    const spread = (20 * Math.PI) / 180;
    ctx.fillStyle = `rgba(232,119,34,${sd?.isCritical ? 0.18 : 0.08})`;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, coneR, coneAng - spread, coneAng + spread);
    ctx.closePath();
    ctx.fill();

    // Obstacle box
    const obsW = Math.max(12, obs.w * scale * 0.8),
      obsD = Math.max(10, obs.d * scale * 0.8);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(((obs.dir + obs.rotation) * Math.PI) / 180);
    ctx.fillStyle = "#4B5563";
    ctx.fillRect(-obsW / 2, -obsD / 2, obsW, obsD);
    ctx.strokeStyle = "rgba(255,255,255,.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(-obsW / 2, -obsD / 2, obsW, obsD);
    ctx.restore();

    // Label
    ctx.fillStyle = "#fff";
    ctx.font = "bold 9px Inter,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(obs.name, ox, oy - obsD / 2 - 3);
    ctx.fillStyle = sd?.isCritical ? "#FCA5A5" : "#6EE7B7";
    ctx.font = "8px Inter,sans-serif";
    ctx.fillText(`${sd?.shadeAngle || "?"}° shade`, ox, oy - obsD / 2 - 14);

    // Line to center
    ctx.strokeStyle = "rgba(255,255,255,.2)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ox, oy);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Scale bar
  const scaleM = 60;
  const scalePx = scaleM * (maxR / 120);
  ctx.strokeStyle = "rgba(255,255,255,.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(20, H - 25);
  ctx.lineTo(20 + scalePx, H - 25);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.6)";
  ctx.font = "9px Inter,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${scaleM} ft`, 20 + scalePx / 2, H - 14);
  ctx.fillStyle = "rgba(255,255,255,.4)";
  ctx.font = "9px Inter,sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Shadow Map (Top View)", W - 10, H - 10);
}

// Helper: small compass
function drawCompassSmall(ctx, cx, cy, r) {
  ctx.fillStyle = "rgba(248,244,236,.85)";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  [
    ["N", 0, -1, "#E87722"],
    ["S", 0, 1, "#9BA3BE"],
    ["E", 1, 0, "#9BA3BE"],
    ["W", -1, 0, "#9BA3BE"],
  ].forEach(([l, dx, dy, c]) => {
    ctx.fillStyle = c;
    ctx.font = `bold ${r * 0.55}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(l, cx + dx * (r - 0.5), cy + dy * (r - 0.5));
  });
}

// ── 5. ISO-SHADING DIAGRAM — Enhanced Real-Time Sun Path ─────
// Real-time animated sun dot, bigger canvas, rich styling,
// live sun position synced to the time/month sliders.

let _isoRaf = null; // animation frame for real-time sun dot

export function drawIsoShading(G) {
  const cv = document.getElementById("d-isoshade");
  if (!cv) return;

  // Upsize the canvas for much more detail
  const parent = cv.parentElement;
  const targetW = Math.max(560, (parent?.clientWidth || 600) - 20);
  const targetH = Math.max(380, Math.round(targetW * 0.62));
  if (cv.width !== targetW || cv.height !== targetH) {
    cv.width = targetW;
    cv.height = targetH;
    cv.style.width = "100%";
    cv.style.height = targetH + "px";
  }

  _drawIsoFrame(cv, G);

  // Start real-time animation loop for live sun dot
  if (_isoRaf) cancelAnimationFrame(_isoRaf);
  let lastHr = -999,
    lastMo = -999;
  function tick() {
    const hr = useSolarStore.getState().sunHour;
    const mo = useSolarStore.getState().sunMonth;
    if (hr !== lastHr || mo !== lastMo) {
      lastHr = hr;
      lastMo = mo;
      _drawIsoFrame(cv, G);
    }
    _isoRaf = requestAnimationFrame(tick);
  }
  _isoRaf = requestAnimationFrame(tick);
}

function _drawIsoFrame(cv, G) {
  const ctx = cv.getContext("2d");
  const W = cv.width,
    H = cv.height;
  ctx.clearRect(0, 0, W, H);

  // ── RICH BACKGROUND: sky gradient ──────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#0D1B3E");
  bgGrad.addColorStop(0.35, "#1A3A6E");
  bgGrad.addColorStop(0.65, "#2D6EA8");
  bgGrad.addColorStop(1, "#5BA3D0");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle star-field in top third
  ctx.fillStyle = "rgba(255,255,255,.55)";
  const stars = [
    [22, 12],
    [55, 8],
    [110, 20],
    [180, 6],
    [250, 15],
    [330, 9],
    [410, 18],
    [490, 5],
    [540, 22],
    [W - 30, 14],
    [W - 80, 7],
  ];
  stars.forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, Math.random() < 0.5 ? 0.8 : 1.2, 0, Math.PI * 2);
    ctx.fill();
  });

  const mL = 54,
    mR = 22,
    mT = 54,
    mB = 44;
  const cW = W - mL - mR,
    cH = H - mT - mB;
  const cX = mL,
    cY = mT;

  // ── CHART AREA BACKGROUND: deep sky-to-horizon gradient ─
  const plotGrad = ctx.createLinearGradient(cX, cY, cX, cY + cH);
  plotGrad.addColorStop(0, "#001030");
  plotGrad.addColorStop(0.4, "#0A2050");
  plotGrad.addColorStop(0.75, "#1A4A80");
  plotGrad.addColorStop(1, "#2A6090");
  ctx.fillStyle = plotGrad;
  ctx.fillRect(cX, cY, cW, cH);

  // Horizon glow band
  const horizGrad = ctx.createLinearGradient(cX, cY + cH * 0.78, cX, cY + cH);
  horizGrad.addColorStop(0, "rgba(255,160,60,.0)");
  horizGrad.addColorStop(1, "rgba(255,140,40,.25)");
  ctx.fillStyle = horizGrad;
  ctx.fillRect(cX, cY + cH * 0.78, cW, cH * 0.22);

  const azToX = (az) => cX + ((az + 120) / 240) * cW;
  const altToY = (alt) => cY + cH - (alt / 90) * cH;

  // ── GRID LINES ──────────────────────────────────────────
  // Vertical azimuth grid
  [-90, -75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75, 90].forEach((az) => {
    const x = azToX(az);
    const major = az % 30 === 0;
    ctx.strokeStyle = major ? "rgba(100,160,220,.3)" : "rgba(80,120,180,.15)";
    ctx.lineWidth = major ? 0.8 : 0.4;
    ctx.setLineDash(major ? [4, 4] : [2, 4]);
    ctx.beginPath();
    ctx.moveTo(x, cY);
    ctx.lineTo(x, cY + cH);
    ctx.stroke();
    ctx.setLineDash([]);
  });
  // Horizontal altitude grid
  [0, 10, 20, 30, 40, 50, 60, 70, 80, 90].forEach((alt) => {
    const y = altToY(alt);
    const major = alt % 15 === 0;
    ctx.strokeStyle = major ? "rgba(100,160,220,.3)" : "rgba(80,120,180,.15)";
    ctx.lineWidth = major ? 0.8 : 0.4;
    ctx.setLineDash(major ? [4, 4] : [2, 4]);
    ctx.beginPath();
    ctx.moveTo(cX, y);
    ctx.lineTo(cX + cW, y);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // ── BEHIND-PANEL ZONES (coloured triangles) ────────────
  ctx.save();
  ctx.beginPath();
  ctx.rect(cX, cY, cW, cH);
  ctx.clip();
  ctx.fillStyle = "rgba(0,100,255,.18)";
  ctx.beginPath();
  ctx.moveTo(cX, cY + cH);
  ctx.lineTo(cX + cW * 0.22, cY);
  ctx.lineTo(cX, cY);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cX + cW, cY + cH);
  ctx.lineTo(cX + cW * 0.78, cY);
  ctx.lineTo(cX + cW, cY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(80,160,255,.55)";
  ctx.lineWidth = 1.8;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(cX, cY + cH);
  ctx.lineTo(cX + cW * 0.22, cY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cX + cW, cY + cH);
  ctx.lineTo(cX + cW * 0.78, cY);
  ctx.stroke();
  ctx.fillStyle = "rgba(130,190,255,.7)";
  ctx.font = "bold 10px Inter,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Behind plane", cX + cW * 0.09, cY + cH * 0.82);
  ctx.fillText("Behind plane", cX + cW * 0.91, cY + cH * 0.82);
  ctx.restore();

  // ── ISO-SHADING LOSS CURVES ─────────────────────────────
  const lossColors = [
    { p: 1, clr: "rgba(200,255,200,.7)", lw: 0.7, dash: [2, 2] },
    { p: 5, clr: "rgba(160,240,160,.75)", lw: 0.9, dash: [3, 3] },
    { p: 10, clr: "rgba(255,220,80,.7)", lw: 1.1, dash: [4, 3] },
    { p: 20, clr: "rgba(255,160,40,.75)", lw: 1.4, dash: [5, 3] },
    { p: 40, clr: "rgba(255,80,40,.75)", lw: 1.7, dash: [6, 3] },
    { p: 60, clr: "rgba(255,30,30,.65)", lw: 2.0, dash: [7, 3] },
  ];
  const midX = cX + cW / 2,
    midY = cY + cH * 0.6;
  lossColors.forEach((lv) => {
    const hw = cW * (lv.p / 100) * 0.58,
      hh = cH * (lv.p / 100) * 0.38;
    if (hw < 4 || hh < 3) return;
    ctx.strokeStyle = lv.clr;
    ctx.lineWidth = lv.lw;
    ctx.setLineDash(lv.dash);
    ctx.beginPath();
    ctx.ellipse(
      midX,
      midY,
      Math.max(8, hw),
      Math.max(5, hh),
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.setLineDash([]);
    // Label on ellipse right edge
    ctx.fillStyle = lv.clr;
    ctx.font = `bold ${lv.p >= 10 ? 9 : 8}px Inter,sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(lv.p + "%", midX + hw + 3, midY + 2);
  });

  // ── SUN PATH CURVES (all 12 months, rich colors) ───────
  const monthDefs = [
    { mo: 12, name: "Dec", clr: "#5599FF", lw: 2.0 },
    { mo: 1, name: "Jan/Nov", clr: "#4488EE", lw: 1.6 },
    { mo: 2, name: "Feb/Oct", clr: "#33AADD", lw: 1.6 },
    { mo: 3, name: "Mar/Sep", clr: "#44DDAA", lw: 1.7 },
    { mo: 4, name: "Apr/Aug", clr: "#FFCC33", lw: 1.7 },
    { mo: 5, name: "May/Jul", clr: "#FF9922", lw: 1.8 },
    { mo: 6, name: "Jun", clr: "#FF4422", lw: 2.2 },
  ];

  ctx.save();
  ctx.beginPath();
  ctx.rect(cX, cY, cW, cH);
  ctx.clip();
  monthDefs.forEach((md, mi) => {
    const pts = genSunPath(G.lat, md.mo);
    ctx.strokeStyle = md.clr;
    ctx.lineWidth = md.lw;
    ctx.setLineDash([]);
    ctx.shadowColor = md.clr;
    ctx.shadowBlur = 3;
    ctx.beginPath();
    let started = false;
    pts.forEach((pt) => {
      if (pt.alt < -0.5) return;
      const x = azToX(pt.az),
        y = altToY(pt.alt);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Month label at peak
    const peak = pts.reduce((a, b) => (b.alt > a.alt ? b : a), { alt: -99 });
    if (peak.alt > 0) {
      const lx = azToX(peak.az),
        ly = altToY(peak.alt) - 9;
      ctx.fillStyle = md.clr;
      ctx.font = `bold 10px Inter,sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(md.name, lx, ly);
    }
  });

  // ── HOUR LINES (across all months) ─────────────────────
  for (let hr = 5; hr <= 19; hr++) {
    const hrPts = monthDefs
      .map((md) => {
        const pts = genSunPath(G.lat, md.mo);
        return pts.reduce((a, b) =>
          Math.abs(b.hr - hr) < Math.abs(a.hr - hr) ? b : a,
        );
      })
      .filter((p) => p && p.alt > 0);
    if (hrPts.length < 2) continue;
    const isMajor = hr % 3 === 0;
    ctx.strokeStyle = isMajor
      ? "rgba(200,220,255,.5)"
      : "rgba(150,170,210,.25)";
    ctx.lineWidth = isMajor ? 1.0 : 0.5;
    ctx.setLineDash(isMajor ? [3, 3] : [2, 4]);
    ctx.beginPath();
    hrPts.forEach((p, i) => {
      const x = azToX(p.az),
        y = altToY(p.alt);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    if (isMajor && hrPts.length > 0) {
      const last = hrPts[hrPts.length - 1];
      ctx.fillStyle = "rgba(190,215,255,.85)";
      ctx.font = `bold 9px Inter,sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(hr + "h", azToX(last.az) + 3, altToY(last.alt) + 1);
    }
  }
  ctx.restore();

  // ── OBSTACLE SHADING ZONES ──────────────────────────────
  const obsColors = [
    "rgba(255,100,100,.35)",
    "rgba(255,160,50,.3)",
    "rgba(200,80,255,.3)",
    "rgba(50,220,180,.25)",
    "rgba(255,220,50,.28)",
  ];
  ctx.save();
  ctx.beginPath();
  ctx.rect(cX, cY, cW, cH);
  ctx.clip();
  G.shadingData.forEach((sd, i) => {
    const ang = parseFloat(sd.shadeAngle) || 0;
    const d = sd.dirDeg || 0;
    const az = d - 180;
    const spread = 18;
    const x1 = azToX(az - spread),
      x2 = azToX(az + spread);
    const y1 = altToY(ang),
      y2 = cY + cH;
    const fillCol = obsColors[i % obsColors.length];
    ctx.fillStyle = fillCol;
    ctx.fillRect(Math.min(x1, x2), y1, Math.abs(x2 - x1), y2 - y1);
    const obsStroke = fillCol.replace(".3", ",.7").replace(".35", ",.8");
    ctx.strokeStyle = sd.isCritical
      ? "rgba(255,60,60,.9)"
      : "rgba(255,180,80,.8)";
    ctx.lineWidth = sd.isCritical ? 2 : 1.2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(Math.min(x1, x2), y1, Math.abs(x2 - x1), y2 - y1);
    ctx.setLineDash([]);
    // Hatching
    ctx.strokeStyle = sd.isCritical
      ? "rgba(255,80,80,.2)"
      : "rgba(255,180,80,.15)";
    ctx.lineWidth = 0.8;
    for (let hx = Math.min(x1, x2); hx < Math.max(x1, x2); hx += 8) {
      ctx.beginPath();
      ctx.moveTo(hx, y1);
      ctx.lineTo(hx, y2);
      ctx.stroke();
    }
    // Label with background pill
    const lx = (x1 + x2) / 2,
      ly = y1 - 6;
    const lbl = sd.name || "Obs";
    ctx.font = "bold 10px Inter,sans-serif";
    ctx.textAlign = "center";
    const tw = ctx.measureText(lbl).width;
    ctx.fillStyle = "rgba(20,10,10,.75)";
    ctx.roundRect
      ? ctx.roundRect(lx - tw / 2 - 4, ly - 11, tw + 8, 14, 4)
      : ctx.fillRect(lx - tw / 2 - 4, ly - 11, tw + 8, 14);
    ctx.fill();
    ctx.fillStyle = sd.isCritical ? "#FCA5A5" : "#FDE68A";
    ctx.fillText(lbl, lx, ly);
    // Shade angle label
    ctx.fillStyle = "rgba(255,255,255,.6)";
    ctx.font = "8px Inter,sans-serif";
    ctx.fillText(`${ang.toFixed(1)}°`, lx, altToY(ang) - 2);
  });
  ctx.restore();

  // ── REAL-TIME SUN DOT ───────────────────────────────────
  const hr = useSolarStore.getState().sunHour;
  const mo = useSolarStore.getState().sunMonth;
  const nDay = SF.dayOfYear(mo);
  const decl = SF.declination(nDay);
  const om = SF.hourAngle(hr);
  const sunAlt = SF.solarAlt(G.lat, decl, om);
  const sunAz = SF.solarAz(G.lat, decl, om, sunAlt) - 180;
  const sx = azToX(sunAz),
    sy = altToY(sunAlt);
  const isVisible =
    sunAlt > 0 && sx >= cX && sx <= cX + cW && sy >= cY && sy <= cY + cH;

  if (isVisible) {
    // Glow halo
    const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20);
    grd.addColorStop(0, "rgba(255,240,60,.9)");
    grd.addColorStop(0.4, "rgba(255,200,40,.5)");
    grd.addColorStop(1, "rgba(255,160,0,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(sx, sy, 20, 0, Math.PI * 2);
    ctx.fill();
    // Sun disc
    ctx.fillStyle = "#FFE033";
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Rays
    ctx.strokeStyle = "rgba(255,220,50,.8)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(sx + 9 * Math.cos(a), sy + 9 * Math.sin(a));
      ctx.lineTo(sx + 13 * Math.cos(a), sy + 13 * Math.sin(a));
      ctx.stroke();
    }
    // Tooltip
    const h12 = hr > 12 ? hr - 12 : hr || 12,
      mm = String(Math.round((hr - Math.floor(hr)) * 60)).padStart(2, "0");
    const ap = hr >= 12 ? "PM" : "AM";
    const tipTxt = `${h12}:${mm}${ap} · Alt ${sunAlt.toFixed(1)}° · Az ${(sunAz + 180).toFixed(0)}°`;
    ctx.font = "bold 10px Inter,sans-serif";
    ctx.textAlign = "center";
    const tw = ctx.measureText(tipTxt).width;
    const tx = Math.min(Math.max(sx, cX + tw / 2 + 6), cX + cW - tw / 2 - 6);
    const ty = sy > cY + 40 ? sy - 18 : sy + 22;
    ctx.fillStyle = "rgba(10,10,30,.85)";
    ctx.roundRect
      ? ctx.roundRect(tx - tw / 2 - 5, ty - 10, tw + 10, 16, 5)
      : ctx.fillRect(tx - tw / 2 - 5, ty - 10, tw + 10, 16);
    ctx.fill();
    ctx.fillStyle = "#FFE566";
    ctx.fillText(tipTxt, tx, ty);
  }

  // Horizon crosshair
  ctx.strokeStyle = "rgba(255,180,60,.6)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(cX, cY + cH);
  ctx.lineTo(cX + cW, cY + cH);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,180,60,.7)";
  ctx.font = "bold 9px Inter,sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("HORIZON", cX + 3, cY + cH - 4);

  // ── AXES & BORDER ───────────────────────────────────────
  ctx.strokeStyle = "rgba(160,200,255,.7)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.strokeRect(cX, cY, cW, cH);

  // X-axis labels
  ctx.fillStyle = "rgba(200,220,255,.9)";
  ctx.font = "bold 10px Inter,sans-serif";
  ctx.textAlign = "center";
  [-120, -90, -60, -30, 0, 30, 60, 90, 120].forEach((az) => {
    const x = azToX(az);
    if (x < cX || x > cX + cW) return;
    ctx.fillText(az + "°", x, cY + cH + 14);
    ctx.strokeStyle = "rgba(100,150,200,.2)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, cY + cH);
    ctx.lineTo(x, cY + cH + 4);
    ctx.stroke();
  });

  // X direction labels (N/S/E/W)
  const dirMap = [
    [0, "S"],
    [90, "W"],
    [-90, "E"],
  ];
  dirMap.forEach(([az, lbl]) => {
    const x = azToX(az);
    ctx.fillStyle = "rgba(255,200,100,.9)";
    ctx.font = "bold 11px Inter,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(lbl, x, cY + cH + 26);
  });

  // Y-axis labels
  ctx.fillStyle = "rgba(200,220,255,.9)";
  ctx.font = "bold 10px Inter,sans-serif";
  ctx.textAlign = "right";
  [0, 15, 30, 45, 60, 75, 90].forEach((alt) => {
    const y = altToY(alt);
    ctx.fillText(alt + "°", cX - 5, y + 4);
    ctx.strokeStyle = "rgba(100,150,200,.2)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cX - 4, y);
    ctx.lineTo(cX, y);
    ctx.stroke();
  });

  // Axis titles
  ctx.fillStyle = "rgba(180,210,255,.85)";
  ctx.font = "bold 11px Inter,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Solar Azimuth [°]", cX + cW / 2, H - 6);
  ctx.save();
  ctx.translate(13, cY + cH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Sun Altitude [°]", 0, 0);
  ctx.restore();

  // ── TITLE BAR ───────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,.0)";
  ctx.fillRect(0, 0, W, mT);
  ctx.fillStyle = "rgba(255,230,100,.95)";
  ctx.font = "bold 13px Inter,sans-serif";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,.5)";
  ctx.shadowBlur = 4;
  ctx.fillText(`☀ Iso-Shading Sun Path Diagram`, cX + cW / 2, 18);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(180,210,255,.75)";
  ctx.font = "10px Inter,sans-serif";
  ctx.fillText(
    `Tilt ${G.tilt}°  ·  Lat ${G.lat.toFixed(2)}°  ·  ${G.city || "Site"}  ·  Live Sun Tracking`,
    cX + cW / 2,
    34,
  );

  // ── LEGEND ──────────────────────────────────────────────
  const lgX = cX + 4,
    lgY = cY + 10;
  ctx.fillStyle = "rgba(0,10,30,.7)";
  ctx.roundRect
    ? ctx.roundRect(lgX, lgY, 130, monthDefs.length * 13 + 8, 6)
    : ctx.fillRect(lgX, lgY, 130, monthDefs.length * 13 + 8);
  ctx.fill();
  monthDefs.forEach((md, i) => {
    const ly = lgY + 8 + i * 13;
    ctx.fillStyle = md.clr;
    ctx.fillRect(lgX + 4, ly - 4, 18, 4);
    ctx.fillStyle = "rgba(220,235,255,.85)";
    ctx.font = "9px Inter,sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(md.name, lgX + 26, ly);
  });
}

function genSunPath(lat, month) {
  const pts = [];
  const n = SF.dayOfYear(month);
  const decl = SF.declination(n);
  for (let hr = 4; hr <= 20; hr += 0.2) {
    const om = SF.hourAngle(hr);
    const alt = SF.solarAlt(lat, decl, om);
    const az = SF.solarAz(lat, decl, om, alt);
    const solarAz = az - 180; // 0=south convention
    pts.push({ hr, alt, az: solarAz });
  }
  return pts;
}
