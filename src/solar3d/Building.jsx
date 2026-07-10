import { useMemo } from "react";
import * as THREE from "three";
import { makeSprite } from "./sceneHelpers";

const SCALE = 3.5;
const FLOOR_COLORS = [0x4a7fc1, 0x3a6ba8, 0x2d5590];

export default function Building({ G }) {
  const rW  = Math.min((G?.roofW || 30) / SCALE, 14);
  const rD  = Math.min((G?.roofD || 24) / SCALE, 11);
  const pH  = Math.max(0.15, (G?.parapetH || 3) / SCALE);

  const capMat = useMemo(
    () => new THREE.MeshPhongMaterial({ color: 0x3a3a3a, specular: 0x555555, shininess: 10 }),
    []
  );

  // Compass label sprites
  const compassSprites = useMemo(() => [
    { label: "N", x: 0,   z:  14, color: "#FF6B35" },
    { label: "S", x: 0,   z: -14, color: "#AAC4DD" },
    { label: "E", x: 14,  z:  0,  color: "#AAC4DD" },
    { label: "W", x: -14, z:  0,  color: "#AAC4DD" },
  ], []);

  return (
    <group>
      {/* Multi-storey floors */}
      {FLOOR_COLORS.map((col, f) => {
        const fH = 1.5 + f * 0.4;
        return (
          <mesh
            key={f}
            position={[0, -fH / 2 - f * 0.02, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[rW + 0.2, fH, rD + 0.2]} />
            <meshPhongMaterial
              color={col}
              specular={0x88aacc}
              shininess={30}
              emissive={new THREE.Color(col).multiplyScalar(0.06)}
            />
          </mesh>
        );
      })}

      {/* Roof slab */}
      <mesh position={[0, -0.11, 0]} receiveShadow>
        <boxGeometry args={[rW, 0.22, rD]} />
        <meshPhongMaterial color={0x8a9aaa} specular={0x445566} shininess={20} />
      </mesh>

      {/* Parapet walls — N/S */}
      {[rD / 2, -rD / 2].map((z, i) => (
        <mesh key={i} position={[0, pH / 2, z]} castShadow>
          <boxGeometry args={[rW + 0.1, pH, 0.12]} />
          <meshPhongMaterial color={0x7a8a9a} />
        </mesh>
      ))}
      {/* Parapet walls — E/W */}
      {[rW / 2, -rW / 2].map((x, i) => (
        <mesh key={i} position={[x, pH / 2, 0]} castShadow>
          <boxGeometry args={[0.12, pH, rD + 0.1]} />
          <meshPhongMaterial color={0x7a8a9a} />
        </mesh>
      ))}

      {/* Parapet caps */}
      {[
        [rW + 0.16, 0.06, 0.14, 0, rD / 2],
        [rW + 0.16, 0.06, 0.14, 0, -rD / 2],
        [0.14, 0.06, rD + 0.02, rW / 2, 0],
        [0.14, 0.06, rD + 0.02, -(rW + 0.16) / 2, 0],
      ].map(([w, , d, x, z], i) => (
        <mesh key={i} position={[x, pH + 0.04, z]}>
          <boxGeometry args={[w, 0.08, d]} />
          <primitive object={capMat} attach="material" />
        </mesh>
      ))}

      {/* Dimension labels */}
      <primitive object={makeSprite(`W:${G?.roofW || 0}ft`, "#FFD700", 14,  0, pH + 0.7,  (rD + 0.3) / 2, 2.2, 0.55, "rgba(10,20,40,.8)")} />
      <primitive object={makeSprite(`D:${G?.roofD || 0}ft`, "#FFD700", 14,  (rW + 0.4) / 2, pH + 0.7, 0, 2.2, 0.55, "rgba(10,20,40,.8)")} />
      <primitive object={makeSprite(`H:${G?.parapetH || 0}ft`, "#88DDFF", 12, -(rW + 0.4) / 2, pH / 2, 0, 1.8, 0.48, "rgba(10,20,40,.8)")} />

      {/* Compass sprites */}
      {compassSprites.map(({ label, x, z, color }) => (
        <primitive
          key={label}
          object={makeSprite(label, color, 26, x, 0.15, z, 1.6, 0.8)}
        />
      ))}
    </group>
  );
}
