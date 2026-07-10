/* eslint-disable no-unused-vars */
import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useSolarStore } from "./useSolarStore";
import { PANEL_THEMES } from "./themes";
import { makePanelTexture, makeSprite } from "./sceneHelpers";

const SCALE = 3.5;

export default function Panels({ G, bindGroup, unBindGroup }) {
  const panelTheme    = useSolarStore((s) => s.panelTheme);
  const rowGapExtra   = useSolarStore((s) => s.rowGapExtra);
  const show3DNumbers = useSolarStore((s) => s.show3DNumbers);
  const show3DLabels  = useSolarStore((s) => s.show3DLabels);

  const theme = PANEL_THEMES[panelTheme] || PANEL_THEMES.deepblue;
  const tilt  = G?.tilt  || 15;
  const n     = G?.numPanels || 0;
  const rW    = Math.min((G?.roofW || 30) / SCALE, 14);
  const rD    = Math.min((G?.roofD || 24) / SCALE, 11);
  const pH    = Math.max(0.15, (G?.parapetH || 3) / SCALE);

  // Panel physical constants (standard size ~ 2m x 1m x 0.04m scaled down)
  const panW = 1.0;
  const panH = 0.055;
  const panD = 1.65;
  const tR   = (tilt * Math.PI) / 180; // tilt in radians

  // Row and grid dimensions
  const cols    = Math.min(Math.floor(rW / (panW + 0.18)), 20) || 1;
  const rows    = Math.ceil(n / cols);
  const totW    = cols * (panW + 0.18) - 0.18;
  const rowStep = (panD * Math.cos(tR) + rowGapExtra * 0.3 + 0.1);
  const totD    = rows * rowStep - 0.1;
  const roofSurface = 0;

  const panelData = useMemo(() => {
    const items = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx >= n) break;
        const x  = -totW / 2 + c * (panW + 0.18) + panW / 2;
        const zBase = -totD / 2 + r * rowStep;
        const zCenter = zBase + (panD * Math.cos(tR)) / 2;
        const yLift = 0.32 + (panD * Math.sin(tR)) / 2;
        items.push({ idx, x, zCenter, yLift });
      }
    }
    return items;
  }, [n, rows, cols, totW, totD, panW, panD, tR, rowStep]);

  // Texture is the same for all panels (panel number baked in separately)
  const frameMat = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: theme.face,
        specular: theme.spec,
        emissive: theme.emit,
        shininess: 55,
      }),
    [theme]
  );

  const standMat = useMemo(() => new THREE.MeshPhongMaterial({
    color: 0xcccccc,
    specular: 0xaaaaaa,
    shininess: 30
  }), []);

  const footMat = useMemo(() => new THREE.MeshPhongMaterial({
    color: 0x888888,
    specular: 0x444444,
    shininess: 10
  }), []);

  const standH = 0.32;
  const rearZ = -(panD * Math.cos(tR)) / 2;
  const frontZ = (panD * Math.cos(tR)) / 2;
  const rearLegH = standH + Math.sin(tR) * panD;
  const frontLegH = standH;

  return (
    <group>
      {panelData.map(({ idx, x, zCenter, yLift }) => (
        <IndividualPanel
          key={idx}
          idx={idx}
          x={x}
          zCenter={zCenter}
          yLift={yLift}
          tR={tR}
          panW={panW}
          panH={panH}
          panD={panD}
          theme={theme}
          show3DNumbers={show3DNumbers}
          show3DLabels={show3DLabels}
          frameMat={frameMat}
          standMat={standMat}
          footMat={footMat}
          rearZ={rearZ}
          frontZ={frontZ}
          rearLegH={rearLegH}
          frontLegH={frontLegH}
          roofSurface={roofSurface}
          bindGroup={bindGroup}
          unBindGroup={unBindGroup}
        />
      ))}

      {/* Row gap lines */}
      {show3DLabels &&
        Array.from({ length: rows + 1 }, (_, r) => {
          const zGap = -totD / 2 + r * rowStep - rowStep / 2;
          const pts = [
            new THREE.Vector3(-totW / 2, roofSurface + 0.06, zGap),
            new THREE.Vector3( totW / 2, roofSurface + 0.06, zGap),
          ];
          return (
            <line key={r}>
              <bufferGeometry setFromPoints={pts} />
              <lineBasicMaterial color={0xffaa00} opacity={0.5} transparent />
            </line>
          );
        })}
    </group>
  );
}

function IndividualPanel({ idx, x, zCenter, yLift, tR, panW, panH, panD, theme, show3DNumbers, show3DLabels, frameMat, standMat, footMat, rearZ, frontZ, rearLegH, frontLegH, roofSurface, bindGroup, unBindGroup }) {
  const groupRef = useRef();
  const movedPositions = useSolarStore((s) => s.movedPositions || {});

  useEffect(() => {
    const grp = groupRef.current;
    if (grp && bindGroup) {
      grp.userData = { key: `panel_${idx}` };
      bindGroup(grp);
      return () => unBindGroup(grp);
    }
  }, [idx, bindGroup, unBindGroup]);

  const mx = movedPositions[`panel_${idx}`]?.x ?? x;
  const mz = movedPositions[`panel_${idx}`]?.z ?? zCenter;

  const faceTex = useMemo(() => makePanelTexture(theme, idx, show3DNumbers), [theme, idx, show3DNumbers]);
  const faceMat = useMemo(() => new THREE.MeshPhongMaterial({
    map: faceTex,
    color: theme.face,
    specular: theme.spec,
    emissive: theme.emit,
    shininess: 55,
  }), [faceTex, theme]);

  return (
    <group ref={groupRef} position={[mx, 0, mz]}>
      {/* Tilted Panel Group */}
      <group
        position={[0, yLift, 0]}
        rotation={[tR, 0, 0]}
      >
        {/* Panel body */}
        <mesh
          castShadow
          receiveShadow
          material={[frameMat, frameMat, faceMat, frameMat, frameMat, frameMat]}
        >
          <boxGeometry args={[panW, panH, panD]} />
        </mesh>

        {/* Number label */}
        {show3DLabels && (
          <primitive
            object={makeSprite(
              `#${idx + 1}`,
              theme.numClr || "#4FC3F7",
              18,
              0, panH / 2 + 0.25, 0,
              1.0, 0.45,
              "rgba(0,0,0,.55)"
            )}
          />
        )}
      </group>

      {/* Upright Stands (Legs, Rails, Feet) */}
      <group position={[0, 0, 0]}>
        {/* 4 Vertical legs + 4 feet */}
        {[
          [-panW * 0.38, rearZ, rearLegH, 0.036],
          [panW * 0.38, rearZ, rearLegH, 0.036],
          [-panW * 0.38, frontZ, frontLegH, 0.026],
          [panW * 0.38, frontZ, frontLegH, 0.026]
        ].map(([lx, lz, lh, lr], i) => (
          <group key={i}>
            {/* Leg Cylinder */}
            <mesh position={[lx, roofSurface + lh / 2, lz]} castShadow receiveShadow>
              <cylinderGeometry args={[lr, lr, lh, 6]} />
              <primitive object={standMat} attach="material" />
            </mesh>
            {/* Foot Anchor Plate */}
            <mesh position={[lx, roofSurface + 0.012, lz]} castShadow>
              <boxGeometry args={[0.12, 0.025, 0.12]} />
              <primitive object={footMat} attach="material" />
            </mesh>
          </group>
        ))}

        {/* Rear cross rail */}
        <mesh position={[0, roofSurface + rearLegH - 0.06, rearZ]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, panW * 0.82, 6]} />
          <primitive object={standMat} attach="material" />
        </mesh>

        {/* Front cross rail */}
        <mesh position={[0, roofSurface + frontLegH, frontZ]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, panW * 0.82, 6]} />
          <primitive object={standMat} attach="material" />
        </mesh>
      </group>
    </group>
  );
}
