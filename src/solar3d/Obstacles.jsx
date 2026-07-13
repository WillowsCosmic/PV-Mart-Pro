import { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { useSolarStore } from "./useSolarStore";
import { BUILDING_THEMES } from "./themes";
import { makeSprite } from "./sceneHelpers";

const SCALE = 3.5;
const WINDOW_COLORS = [0xffff88, 0xffcc44, 0xaaddff, 0x88ffcc, 0xffaacc];

function ObstacleBuilding({ obs, index, color, showLabels, bindGroup, unBindGroup }) {
  const oH   = Math.max(0.5, obs.h / SCALE);
  const oW   = Math.max(0.4, obs.w / SCALE);
  const oD   = Math.max(0.4, obs.d / SCALE);
  const dist = Math.min(obs.dist, 30) / SCALE;
  const ox   = Math.sin((obs.dir * Math.PI) / 180) * dist;
  const oz   = Math.cos((obs.dir * Math.PI) / 180) * dist;

  const groupRef = useRef();
  const movedPositions = useSolarStore((s) => s.movedPositions || {});

  useEffect(() => {
    const grp = groupRef.current;
    if (grp && bindGroup) {
      grp.userData = { key: `obstacle_${index}` };
      bindGroup(grp);
      return () => unBindGroup(grp);
    }
  }, [index, bindGroup, unBindGroup]);

  const mx = movedPositions[`obstacle_${index}`]?.x ?? ox;
  const mz = movedPositions[`obstacle_${index}`]?.z ?? oz;

  // Generate windows deterministically using index as seed, relative to group origin
  const windows = useMemo(() => {
    const wR = Math.floor(oH * 1.6) + 1;
    const wC = Math.max(1, Math.floor(oW * 2.2));
    const items = [];
    // Use a seeded pseudo-random so it doesn't flicker on re-render
    let seed = index * 1234 + 5678;
    const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let r = 0; r < wR; r++) {
      for (let c = 0; c < wC; c++) {
        if (rand() > 0.28) {
          items.push({
            key: `${r}-${c}`,
            color: WINDOW_COLORS[Math.floor(rand() * WINDOW_COLORS.length)],
            opacity: 0.65 + rand() * 0.3,
            x: 0 - oW / 2 + 0.25 + c * (oW / wC),
            y: (r + 0.5) * (oH / wR) * 0.88 + 0.2,
            z: 0 + oD / 2 + 0.01,
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
      
      return {
        key: f,
        args: [width, height, depth],
        position: [0, y, 0],
        color: col,
        emissive
      };
    });
  }, [oH, oW, oD, color]);

  const isTree = obs.type === 'tree' || String(obs.name || '').toLowerCase().includes('tree');

  if (isTree) {
    const trunkHeight = oH * 0.35;
    const canopyHeight = oH * 0.65;
    const trunkRadius = Math.max(0.08, oW * 0.08);
    const leafRadius = oW * 0.45;

    return (
      <group ref={groupRef} position={[mx, 0, mz]}>
        {/* Tree Trunk */}
        <mesh position={[0, trunkHeight / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[trunkRadius * 0.8, trunkRadius, trunkHeight, 8]} />
          <meshPhongMaterial
            color={0x5c4033}
            specular={0x111111}
            shininess={2}
          />
        </mesh>

        {/* Tree Foliage (Lush, intersecting spheres) */}
        <mesh position={[0, trunkHeight + canopyHeight * 0.35, 0]} castShadow receiveShadow>
          <sphereGeometry args={[leafRadius, 12, 12]} />
          <meshPhongMaterial
            color={0x2d8a4e}
            specular={0x112211}
            shininess={3}
          />
        </mesh>
        <mesh position={[leafRadius * 0.35, trunkHeight + canopyHeight * 0.6, leafRadius * 0.2]} castShadow receiveShadow>
          <sphereGeometry args={[leafRadius * 0.75, 12, 12]} />
          <meshPhongMaterial
            color={0x3cb371}
            specular={0x112211}
            shininess={3}
          />
        </mesh>
        <mesh position={[-leafRadius * 0.3, trunkHeight + canopyHeight * 0.5, -leafRadius * 0.3]} castShadow receiveShadow>
          <sphereGeometry args={[leafRadius * 0.8, 12, 12]} />
          <meshPhongMaterial
            color={0x1e6a39}
            specular={0x112211}
            shininess={3}
          />
        </mesh>

        {/* Label */}
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
    <group ref={groupRef} position={[mx, 0, mz]}>
      {/* Cascading Tiers */}
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
          <meshBasicMaterial
            color={w.color}
            transparent
            opacity={w.opacity}
          />
        </mesh>
      ))}

      {/* Label */}
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
