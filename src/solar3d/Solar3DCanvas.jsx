import { useRef, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { useSolarStore } from "./useSolarStore";
import { useCameraOrbit } from "./useCameraOrbit";
import { useDragMove } from "./useDragMove";
import { capture3DToDataUrl } from "./sceneHelpers";

import SkyDome   from "./SkyDome";
import Ground    from "./Ground";
import SunLight  from "./Sunlight";
import Building  from "./Building";
import Panels    from "./Panels";
import Obstacles from "./Obstacles";
import Wiring    from "./Wiring";
import InverterBattery from "./InverterBattery";
import ThemeBar  from "./ThemeBar";

// ─── Inner scene (needs useThree so must live inside <Canvas>) ───────────────
function SceneContent({ G, onCapture }) {
  const moveMode = useSolarStore((s) => s.moveMode);
  const { bindGroup, unBindGroup, onPointerDown, onPointerMove, onPointerUp } = useDragMove();

  // Camera orbit (replaces original mousedown/mousemove/wheel listeners)
  useCameraOrbit({ enabled: !moveMode });

  // Expose capture function to parent
  const { gl, scene, camera } = useThree();
  if (onCapture) {
    onCapture.current = () => capture3DToDataUrl(gl, scene, camera);
  }

  return (
    <>
      {/* Lighting & sky */}
      <SunLight lat={G?.lat ?? 20} />
      <SkyDome />

      {/* Grid */}
      <gridHelper
        args={[60, 60, 0x1a3a2a, 0x162e1e]}
        material-opacity={0.35}
        material-transparent
      />

      {/* Environment */}
      <Ground />
      <Building G={G} />

      {/* Solar elements */}
      <Panels    G={G} bindGroup={bindGroup} unBindGroup={unBindGroup} />
      <Obstacles G={G} bindGroup={bindGroup} unBindGroup={unBindGroup} />
      <Wiring    G={G} panelPositions={[]} />
      <InverterBattery G={G} bindGroup={bindGroup} unBindGroup={unBindGroup} />

      {/* Drag-move hit surface */}
      {moveMode && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          visible={false}
        >
          <planeGeometry args={[200, 200]} />
          <meshBasicMaterial side={THREE.DoubleSide} />
        </mesh>
      )}
    </>
  );
}

// ─── Public component ────────────────────────────────────────────────────────
/**
 * Usage:
 *   const captureRef = useRef();
 *   <Solar3DCanvas G={siteModel} onCapture={captureRef} />
 *   // later: const dataUrl = captureRef.current?.();
 */
export default function Solar3DCanvas({ G, onCapture }) {
  const captureRef = onCapture || useRef();

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      <Canvas
        style={{ flex: 1, background: "#0a1628" }}
        camera={{ fov: 45, near: 0.1, far: 200, position: [8, 10, 8] }}
        shadows={{ type: THREE.PCFSoftShadowMap }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }}
      >
        <SceneContent G={G} onCapture={captureRef} />
      </Canvas>

      {/* Theme / control bar below the canvas */}
      <ThemeBar />
    </div>
  );
}
