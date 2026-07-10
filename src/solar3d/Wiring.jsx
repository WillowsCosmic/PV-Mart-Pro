import { useMemo } from "react";
import * as THREE from "three";
import { useSolarStore } from "./useSolarStore";

const SCALE = 3.5;

function catmullLine(a, b, color = 0x00ff88, opacity = 0.9) {
  const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0.28, 0));
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const pts = curve.getPoints(12);
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return { geo, color, opacity };
}

export default function Wiring({ G }) {
  const wiringMode = useSolarStore((s) => s.wiringMode);
  const rowGapExtra = useSolarStore((s) => s.rowGapExtra);
  const n = G?.numPanels || 0;

  const lines = useMemo(() => {
    if (n < 2) return [];

    const tilt = G?.tilt || 15;
    const rW = Math.min((G?.roofW || 30) / SCALE, 14);
    const rD = Math.min((G?.roofD || 24) / SCALE, 11);
    const pH = Math.max(0.15, (G?.parapetH || 3) / SCALE);
    const tR = (tilt * Math.PI) / 180;

    const panW = 1.0, panH = 0.05, panD = 1.65;
    const cols = Math.min(Math.floor(rW / (panW + 0.18)), 20) || 1;
    const rows = Math.ceil(n / cols);
    const totW = cols * (panW + 0.18) - 0.18;
    const rowStep = (panD * Math.cos(tR) + rowGapExtra * 0.3 + 0.1);
    const totD = rows * rowStep - 0.1;
    const roofSurface = 0;
    const movedPositions = useSolarStore.getState().movedPositions || {};

    // Dynamically calculate actual positions
    const positions = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx >= n) break;
        const x = -totW / 2 + c * (panW + 0.18) + panW / 2;
        const zBase = -totD / 2 + r * rowStep;
        const zCenter = zBase + (panD * Math.cos(tR)) / 2;
        const yLift = roofSurface + 0.32 + (panD * Math.sin(tR)) / 2;
        const mx = movedPositions[`panel_${idx}`]?.x ?? x;
        const mz = movedPositions[`panel_${idx}`]?.z ?? zCenter;
        positions.push(new THREE.Vector3(mx, yLift, mz));
      }
    }

    const invPos = new THREE.Vector3(rW / 2 + 1.2, 0.6, 0);
    const result = [];

    if (wiringMode === "series" || wiringMode === "series-parallel") {
      const strLen = wiringMode === "series" ? n : Math.ceil(n / Math.ceil(n / cols));
      const numStr = Math.ceil(n / strLen);
      for (let s = 0; s < numStr; s++) {
        const from = s * strLen;
        const to   = Math.min(from + strLen, n);
        for (let i = from; i < to - 1; i++) {
          if (positions[i] && positions[i + 1]) {
            result.push(catmullLine(positions[i].clone(), positions[i + 1].clone(), 0x00ff88, 0.85));
          }
        }
        // String to inverter
        if (positions[from]) {
          result.push(catmullLine(positions[from].clone(), invPos.clone(), 0xff8800, 0.9));
        }
      }
    } else if (wiringMode === "parallel") {
      positions.forEach((p) => {
        result.push(catmullLine(p.clone(), invPos.clone(), 0x00aaff, 0.7));
      });
    } else {
      // hybrid default
      for (let r = 0; r < rows; r++) {
        const rowStart = r * cols;
        const rowEnd   = Math.min(rowStart + cols, n);
        for (let i = rowStart; i < rowEnd - 1; i++) {
          if (positions[i] && positions[i + 1]) {
            result.push(catmullLine(positions[i].clone(), positions[i + 1].clone(), 0x00ff88, 0.85));
          }
        }
        if (positions[rowStart]) {
          result.push(catmullLine(positions[rowStart].clone(), invPos.clone(), 0xff8800, 0.9));
        }
      }
    }

    return result;
  }, [wiringMode, rowGapExtra, n, G]);

  return (
    <group>
      {lines.map((l, i) => (
        <line key={i}>
          <primitive object={l.geo} attach="geometry" />
          <lineBasicMaterial color={l.color} opacity={l.opacity} transparent />
        </line>
      ))}
    </group>
  );
}
