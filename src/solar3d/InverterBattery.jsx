import { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { useSolarStore } from "./useSolarStore";
import { Html } from "@react-three/drei";

const SCALE = 3.5;

export default function InverterBattery({ G, bindGroup, unBindGroup }) {
  const systemType = G.gridType || "on-grid";
  const selectedInverter = G.inverter;
  const selectedBattery = G.battery;

  const rW = Math.min((G?.roofW || 30) / SCALE, 14);
  const panW = 1.0;
  const cols = Math.min(Math.floor(rW / (panW + 0.18)), 20) || 1;
  const totW = cols * (panW + 0.18) - 0.18;

  const groupRef = useRef();
  const movedPositions = useSolarStore((s) => s.movedPositions || {});

  useEffect(() => {
    const grp = groupRef.current;
    if (grp && bindGroup) {
      grp.userData = { key: "inverter" };
      bindGroup(grp);
      return () => unBindGroup(grp);
    }
  }, [bindGroup, unBindGroup]);

  // Generate Inverter screen texture dynamically
  const invTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 96;
    const sc = canvas.getContext("2d");
    sc.fillStyle = "#001A2E";
    sc.fillRect(0, 0, 64, 96);
    sc.fillStyle = "#00FF88";
    sc.font = "bold 11px monospace";
    sc.textAlign = "center";
    sc.fillText("INV", 32, 20);
    sc.fillStyle = "#00CCFF";
    sc.font = "10px monospace";
    sc.fillText(selectedInverter ? selectedInverter.kw + "kW" : "--kW", 32, 38);
    sc.fillStyle = "#FFAA00";
    sc.fillText("● AC ●", 32, 54);
    sc.fillStyle = "#00FF44";
    [8, 22, 36].forEach((x, i) => sc.fillRect(x, 64 + (2 - i) * 6, 10, 8 + i * 6));
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [selectedInverter]);

  // Generate Battery panel texture dynamically
  const batTexture = useMemo(() => {
    if (!selectedBattery) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 96;
    const bc = canvas.getContext("2d");
    bc.fillStyle = "#0A1F0A";
    bc.fillRect(0, 0, 64, 96);
    bc.strokeStyle = "#22FF44";
    bc.lineWidth = 2;
    bc.strokeRect(8, 8, 48, 80);
    
    // Battery level bars
    const pct = selectedBattery.dod * 0.9;
    const bars = 5;
    for (let b = 0; b < bars; b++) {
      bc.fillStyle = b < Math.round(pct * bars) ? "#22FF44" : "#112211";
      bc.fillRect(14, 72 - b * 13, 36, 10);
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [selectedBattery]);

  if (!selectedInverter) return null;

  const mx = movedPositions["inverter"]?.x ?? (totW / 2 + 1.2);
  const mz = movedPositions["inverter"]?.z ?? 0;

  return (
    <group ref={groupRef} position={[mx, 0, mz]}>
      {/* ── INVERTER ── */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 1.2, 0.4]} />
        <meshPhongMaterial 
          color={0x1c2d3e} 
          specular={0x334455} 
          shininess={30} 
          emissive={0x001020} 
        />
      </mesh>

      {/* Screen Face */}
      <mesh position={[0, 0.65, 0.205]}>
        <planeGeometry args={[0.55, 0.75]} />
        <meshBasicMaterial map={invTexture} transparent />
      </mesh>

      {/* Inverter 3D Label */}
      <Html
        position={[0, 1.45, 0]}
        center
        distanceFactor={8}
        style={{
          background: "rgba(10,20,40,.88)",
          color: "#E87722",
          border: "1px solid #E87722",
          borderRadius: "4px",
          padding: "3px 6px",
          fontSize: "9px",
          fontFamily: "sans-serif",
          fontWeight: "bold",
          pointerEvents: "none",
          whiteSpace: "nowrap"
        }}
      >
        {`${selectedInverter.brand} ${selectedInverter.kw}kW`}
      </Html>

      {selectedInverter && (
        <Html
          position={[0, 0.95, 0]}
          center
          distanceFactor={10}
          style={{
            color: "#94A3B8",
            fontSize: "8px",
            fontFamily: "sans-serif",
            pointerEvents: "none",
            whiteSpace: "nowrap"
          }}
        >
          {`${(selectedInverter.eff * 100).toFixed(0)}% eff · ${selectedInverter.mppt}`}
        </Html>
      )}

      {/* ── BATTERY (Hybrid/Off-Grid only) ── */}
      {selectedBattery && systemType !== "on-grid" && (
        <group>
          <mesh position={[0, 0.5, -1.2]} castShadow receiveShadow>
            <boxGeometry args={[0.7, 1.0, 0.45]} />
            <meshPhongMaterial 
              color={0x1a3a1a} 
              specular={0x224422} 
              shininess={25} 
              emissive={0x001200} 
            />
          </mesh>

          {/* Battery Screen Face */}
          {batTexture && (
            <mesh position={[0, 0.5, -0.97]}>
              <planeGeometry args={[0.5, 0.7]} />
              <meshBasicMaterial map={batTexture} transparent />
            </mesh>
          )}

          {/* Battery 3D Label */}
          <Html
            position={[0, 1.25, -1.2]}
            center
            distanceFactor={8}
            style={{
              background: "rgba(10,20,40,.88)",
              color: "#22FF44",
              border: "1px solid #22FF44",
              borderRadius: "4px",
              padding: "3px 6px",
              fontSize: "9px",
              fontFamily: "sans-serif",
              fontWeight: "bold",
              pointerEvents: "none",
              whiteSpace: "nowrap"
            }}
          >
            {`${selectedBattery.brand} ${selectedBattery.model}`}
          </Html>
        </group>
      )}
    </group>
  );
}
