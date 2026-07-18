import { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { useSolarStore } from "./useSolarStore";
import { BUILDING_THEMES } from "./themes";
import { makeSprite } from "./sceneHelpers";
import { useGLTF } from "@react-three/drei";

const SCALE = 3.5;
// 1 scene unit = SCALE feet, so 1 ft = 1/SCALE scene units
const FT_TO_SU = 1 / SCALE;
const WINDOW_COLORS = [0xffff88, 0xffcc44, 0xaaddff, 0x88ffcc, 0xffaacc];

function ObstacleBuilding({ obs, index, color, showLabels, bindGroup, unBindGroup }) {
  // All dimensions converted from feet to scene units using the same FT_TO_SU factor
  const oH   = Math.max(0.5, obs.h * FT_TO_SU);
  const oW   = Math.max(0.4, obs.w * FT_TO_SU);
  const oD   = Math.max(0.4, obs.d * FT_TO_SU);
  const dist = Math.min(obs.dist, 30) * FT_TO_SU;
  const ox   = Math.sin((obs.dir * Math.PI) / 180) * dist;
  const oz   = Math.cos((obs.dir * Math.PI) / 180) * dist;

  const groupRef = useRef();
  const movedPositions = useSolarStore((s) => s.movedPositions || {});
  const buildingFloors = useSolarStore((s) => s.G?.buildingFloors || 0);
  // Prefer an explicit buildingHeight (ft) from the store; fall back to floors * 10ft
  const buildingHeightFt = useSolarStore((s) => s.G?.buildingHeight || 0);
  const roofHeight = (buildingHeightFt || buildingFloors * 10) * FT_TO_SU;

  useEffect(() => {
    const grp = groupRef.current;
    if (grp && bindGroup) {
      grp.userData = { key: `obstacle_${index}` };
      bindGroup(grp);
      return () => unBindGroup(grp);
    }
  }, [index, bindGroup, unBindGroup]);

  const mx = movedPositions[`obstacle_${index}`]?.x ?? ox;
  // Ground-placed obstacles must be shifted DOWN by roofHeight so they
  // appear to stand on the ground (the scene origin is at roof level).
  const my = obs.placement === "ground" ? -roofHeight : 0;
  const mz = movedPositions[`obstacle_${index}`]?.z ?? oz;

  // Generate windows deterministically using index as seed
  const windows = useMemo(() => {
    const wR = Math.floor(oH * 1.6) + 1;
    const wC = Math.max(1, Math.floor(oW * 2.2));
    const items = [];
    let seed = index * 1234 + 5678;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let r = 0; r < wR; r++) {
      for (let c = 0; c < wC; c++) {
        if (rand() > 0.28) {
          items.push({
            key: `${r}-${c}`,
            color: WINDOW_COLORS[Math.floor(rand() * WINDOW_COLORS.length)],
            opacity: 0.65 + rand() * 0.3,
            x: -oW / 2 + 0.25 + c * (oW / wC),
            y: (r + 0.5) * (oH / wR) * 0.88 + 0.2,
            z: oD / 2 + 0.01,
          });
        }
      }
    }
    return items;
  }, [index, oH, oW, oD]);

  const tiers = useMemo(() => {
    return Array.from({ length: 3 }).map((_, f) => {
      const frac = 1 - f * 0.15;
      const width = oW * frac;
      const height = oH * (f === 0 ? 1 : 0.6 + f * 0.12);
      const depth = oD * frac;
      const y = f === 0 ? oH / 2 : oH * 0.6 + f * 0.12;
      const col = new THREE.Color(color).multiplyScalar(0.65 + f * 0.18);
      const emissive = new THREE.Color(color).multiplyScalar(0.06);
      return { key: f, args: [width, height, depth], position: [0, y, 0], color: col, emissive };
    });
  }, [oH, oW, oD, color]);

  const isTree =
    obs.type === "tree" || String(obs.name || "").toLowerCase().includes("tree");

  const gltf = useGLTF("/realistic_tree.glb");

  // Clone the scene once per instance
  const clonedScene = useMemo(() => {
    if (gltf?.scene) return gltf.scene.clone();
    return null;
  }, [gltf]);

  // Compute scale and y-offset so the tree sits at ground level at exactly oH tall.
  // oH is in scene units (ft * FT_TO_SU) — the same unit system as the building geometry.
  const { treeScale, treeYOffset } = useMemo(() => {
    if (!clonedScene) return { treeScale: 1, treeYOffset: 0 };

    // Reset any prior transforms so Box3 measures the raw model at scale=1
    clonedScene.scale.set(1, 1, 1);
    clonedScene.position.set(0, 0, 0);
    clonedScene.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clonedScene);
    const rawSize = new THREE.Vector3();
    box.getSize(rawSize);

    // Scale uniformly so the model's natural height equals oH
    const scaleFactor = rawSize.y > 0.001 ? oH / rawSize.y : 1;

    // After scaling, box.min.y * scaleFactor is where the bottom ends up.
    // Shift up so the bottom sits at y=0 within the group.
    const yOffset = -box.min.y * scaleFactor;

    return { treeScale: scaleFactor, treeYOffset: yOffset };
  }, [clonedScene, oH]);

  // Fix materials: zero metalness, proper roughness, fallback color if no texture
  useEffect(() => {
    if (!clonedScene) return;
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          // Clone material so we don't mutate the shared original
          child.material = child.material.clone();
          child.material.metalness = 0;
          child.material.roughness = 0.85;

          // If no color texture, apply a sensible fallback color
          if (!child.material.map) {
            const nameLower = (child.name || "").toLowerCase();
            const isLeafy =
              nameLower.includes("leaf") ||
              nameLower.includes("foliage") ||
              nameLower.includes("canopy") ||
              nameLower.includes("crown");
            child.material.color.set(isLeafy ? 0x2d8a4e : 0x5c4033);
          }
        }
      }
    });
  }, [clonedScene]);

  if (isTree) {
    const trunkHeight = oH * 0.7;
    const trunkRadius = Math.max(0.12, oW * 0.08);
    const leafRadius = oW * 0.55;

    return (
      <group ref={groupRef} position={[mx, my, mz]}>
        {clonedScene ? (
          <primitive
            object={clonedScene}
            position={[0, treeYOffset, 0]}
            scale={[treeScale, treeScale, treeScale]}
          />
        ) : (
          <>
            {/* Fallback trunk */}
            <mesh position={[0, trunkHeight / 2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[trunkRadius * 0.7, trunkRadius, trunkHeight, 8]} />
              <meshPhongMaterial color={0x5c4033} specular={0x111111} shininess={2} />
            </mesh>

            {/* Fallback foliage — three intersecting spheres */}
            <mesh position={[0, trunkHeight, 0]} castShadow receiveShadow>
              <sphereGeometry args={[leafRadius, 16, 16]} />
              <meshPhongMaterial color={0x2d8a4e} specular={0x112211} shininess={3} />
            </mesh>
            <mesh
              position={[leafRadius * 0.35, trunkHeight + leafRadius * 0.4, leafRadius * 0.2]}
              castShadow
              receiveShadow
            >
              <sphereGeometry args={[leafRadius * 0.8, 16, 16]} />
              <meshPhongMaterial color={0x3cb371} specular={0x112211} shininess={3} />
            </mesh>
            <mesh
              position={[-leafRadius * 0.3, trunkHeight + leafRadius * 0.3, -leafRadius * 0.3]}
              castShadow
              receiveShadow
            >
              <sphereGeometry args={[leafRadius * 0.85, 16, 16]} />
              <meshPhongMaterial color={0x1e6a39} specular={0x112211} shininess={3} />
            </mesh>
          </>
        )}

        {showLabels && (
          <primitive
            object={makeSprite(
              obs.label || `TREE ${index + 1}`,
              "#22FF88",
              14,
              0, oH + 0.6, 0,
              2.2, 0.55,
              "rgba(5,15,5,.8)"
            )}
          />
        )}
      </group>
    );
  }

  return (
    <group ref={groupRef} position={[mx, my, mz]}>
      {/* Cascading tiers */}
      {tiers.map((tier) => (
        <mesh key={tier.key} position={tier.position} castShadow receiveShadow>
          <boxGeometry args={tier.args} />
          <meshPhongMaterial
            color={tier.color}
            specular={0x334455}
            shininess={28}
            emissive={tier.emissive}
          />
        </mesh>
      ))}

      {/* Windows */}
      {windows.map((w) => (
        <mesh key={w.key} position={[w.x, w.y, w.z]}>
          <planeGeometry args={[0.17, 0.2]} />
          <meshBasicMaterial color={w.color} transparent opacity={w.opacity} />
        </mesh>
      ))}

      {showLabels && (
        <primitive
          object={makeSprite(
            obs.label || `OBS ${index + 1}`,
            "#FFDD44",
            14,
            0, oH + 0.6, 0,
            2.2, 0.55,
            "rgba(10,5,0,.8)"
          )}
        />
      )}
    </group>
  );
}

export default function Obstacles({ G, bindGroup, unBindGroup }) {
  const showLabels = useSolarStore((s) => s.show3DObsLabels);
  const buildingTheme = useSolarStore((s) => s.buildingTheme || "vivid");
  const theme = BUILDING_THEMES[buildingTheme] || BUILDING_THEMES.vivid;

  if (!G?.obstacles) return null;

  return (
    <group>
      {G.obstacles.map((obs, idx) => (
        <ObstacleBuilding
          key={obs.id || idx}
          index={idx}
          obs={obs}
          color={theme.color}
          showLabels={showLabels}
          bindGroup={bindGroup}
          unBindGroup={unBindGroup}
        />
      ))}
    </group>
  );
}
