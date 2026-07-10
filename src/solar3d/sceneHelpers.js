import * as THREE from "three";
import { GROUND_THEMES } from "./themes";

// ── Canvas-based text sprite ─────────────────────────────────────────────────
export function makeSprite(txt, col, sz, x, y, z, sw = 2, sh = 0.7, bgCol) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 80;
  const ctx = c.getContext("2d");
  if (bgCol) {
    ctx.fillStyle = bgCol;
    ctx.roundRect
      ? ctx.roundRect(4, 4, 248, 72, 10)
      : ctx.fillRect(4, 4, 248, 72);
    ctx.fill();
  }
  ctx.fillStyle = col;
  ctx.font = `bold ${sz}px Inter,sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,.9)";
  ctx.shadowBlur = 6;
  ctx.fillText(txt, 128, 40);
  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c),
      transparent: true,
      depthTest: false,
    })
  );
  sp.position.set(x, y, z);
  sp.scale.set(sw, sh, 1);
  return sp;
}

// ── Ground canvas texture ────────────────────────────────────────────────────
export function buildGroundTexture(groundTheme) {
  const gt = GROUND_THEMES[groundTheme] || GROUND_THEMES.grass;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, gt.c1);
  g.addColorStop(0.5, gt.c2);
  g.addColorStop(1, gt.c3);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2500; i++) {
    const r = Math.random();
    ctx.fillStyle = `rgba(${r > 0.5 ? 80 : 20},${r > 0.5 ? 60 : 30},${
      r > 0.7 ? 10 : 5
    },${Math.random() * 0.35})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 3 + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}

// ── Panel face texture ───────────────────────────────────────────────────────
export function makePanelTexture(theme, panelNum, showNumber) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 200;
  const ctx = c.getContext("2d");

  // Base fill
  ctx.fillStyle = theme.badge || "#010510";
  ctx.fillRect(0, 0, 128, 200);

  // Cells (4x6 grid)
  const cw = 28, ch = 28, gx = 8, gy = 8;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      const cx = gx + col * (cw + 4);
      const cy = gy + row * (ch + 4);
      ctx.fillStyle = theme.cell || "rgba(40,100,220,.60)";
      ctx.fillRect(cx, cy, cw, ch);
      // Cell lines
      ctx.strokeStyle = theme.cellLine || "rgba(30,90,200,.50)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(cx, cy, cw, ch);
    }
  }

  // Busbars
  ctx.strokeStyle = theme.busbar || "rgba(180,210,255,.55)";
  ctx.lineWidth = 1.5;
  [42, 64, 86].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x, gy + 6 * (ch + 4) - 4);
    ctx.stroke();
  });

  // Sheen
  const sg = ctx.createLinearGradient(0, 0, 128, 200);
  sg.addColorStop(0, theme.sheen || "rgba(20,80,200,.30)");
  sg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, 128, 200);

  // Panel number (Circular badge in center of panel)
  if (showNumber && panelNum !== undefined) {
    const num = panelNum + 1;
    ctx.fillStyle = theme.badge || "rgba(10,20,40,.85)";
    ctx.beginPath();
    ctx.arc(64, 100, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = theme.numClr || "#00e5ff";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = theme.numClr || "#00e5ff";
    ctx.font = "bold 20px 'JetBrains Mono',monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,255,255,.5)";
    ctx.shadowBlur = 4;
    ctx.fillText(String(num), 64, 101);
    ctx.shadowBlur = 0;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── Inverter screen texture ──────────────────────────────────────────────────
export function makeInverterTexture(inverter) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 96;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#001A2E";
  ctx.fillRect(0, 0, 64, 96);
  ctx.fillStyle = "#00FF88";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  ctx.fillText("INV", 32, 20);
  ctx.fillStyle = "#00CCFF";
  ctx.font = "10px monospace";
  ctx.fillText(inverter ? inverter.kw + "kW" : "--kW", 32, 38);
  ctx.fillStyle = "#FFAA00";
  ctx.fillText("● AC ●", 32, 54);
  ctx.fillStyle = "#00FF44";
  [8, 22, 36].forEach((x, i) => ctx.fillRect(x, 64 + (2 - i) * 6, 10, 8 + i * 6));
  return new THREE.CanvasTexture(c);
}

// ── Capture renderer to data URL ─────────────────────────────────────────────
export function capture3DToDataUrl(gl, scene, camera, quality = 0.92) {
  if (!gl || !scene || !camera) return null;
  gl.render(scene, camera);
  try {
    return gl.domElement.toDataURL("image/jpeg", quality);
  } catch (e) {
    console.warn("3D capture failed:", e);
    return null;
  }
}

// ── Wiring stats calculator ──────────────────────────────────────────────────
export function calcWiringStats(panel, inverter, numPanels, wiringMode) {
  if (!panel) return { V: "—", A: "—", S: "—" };
  const perStr = inverter
    ? Math.floor((inverter.maxVdc * 0.9) / panel.voc)
    : Math.ceil(numPanels / 3) || 1;
  const numStr = Math.ceil(numPanels / perStr) || 1;
  let V, A, S;
  if (wiringMode === "series") {
    V = (panel.vmp * perStr).toFixed(0) + "V";
    A = panel.imp.toFixed(1) + "A";
    S = numStr;
  } else if (wiringMode === "parallel") {
    V = panel.vmp.toFixed(0) + "V";
    A = (panel.imp * numPanels).toFixed(1) + "A";
    S = 1;
  } else {
    V = (panel.vmp * perStr).toFixed(0) + "V";
    A = (panel.imp * numStr).toFixed(1) + "A";
    S = numStr;
  }
  return { V, A, S: String(S) };
}
