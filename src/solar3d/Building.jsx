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

  const N = G?.buildingFloors || 0;
  const STORY_HEIGHT = 2.85;
  const roofHeight = N * STORY_HEIGHT;

  // Windows per storey
  const windowCols = Math.max(3, Math.floor(rW * 1.5));
  const windowRows = Math.max(2, Math.floor(rD * 1.5));

  const windowsFrontBack = useMemo(() => {
    const list = [];
    for (let c = 0; c < windowCols; c++) {
      const x = -rW / 2 + (c + 0.5) * (rW / windowCols);
      list.push(x);
    }
    return list;
  }, [windowCols, rW]);

  const windowsLeftRight = useMemo(() => {
    const list = [];
    for (let r = 0; r < windowRows; r++) {
      const z = -rD / 2 + (r + 0.5) * (rD / windowRows);
      list.push(z);
    }
    return list;
  }, [windowRows, rD]);

  return (
    <group>
      {/* If Ground Floor, render original decorative base */}
      {N === 0 &&
        FLOOR_COLORS.map((col, f) => {
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

      {/* If Multi-storey (1st to 10th floor), render actual floors below roof */}
      {N > 0 &&
        Array.from({ length: N }).map((_, s) => {
          const y = -roofHeight + s * STORY_HEIGHT + STORY_HEIGHT / 2;
          const col = s % 2 === 0 ? 0xd8dee9 : 0xe5e9f0;
          return (
            <group key={s}>
              {/* Floor Box */}
              <mesh position={[0, y, 0]} castShadow receiveShadow>
                <boxGeometry args={[rW + 0.02, STORY_HEIGHT - 0.08, rD + 0.02]} />
                <meshPhongMaterial
                  color={col}
                  specular={0x222222}
                  shininess={10}
                />
              </mesh>

              {/* Windows - Front Facade */}
              {windowsFrontBack.map((wx, idx) => (
                <mesh key={`f-${idx}`} position={[wx, y + 0.1, rD / 2 + 0.02]}>
                  <planeGeometry args={[0.22, 0.45]} />
                  <meshBasicMaterial color={0x1d3557} />
                </mesh>
              ))}

              {/* Windows - Back Facade */}
              {windowsFrontBack.map((wx, idx) => (
                <mesh key={`b-${idx}`} position={[wx, y + 0.1, -rD / 2 - 0.02]} rotation={[0, Math.PI, 0]}>
                  <planeGeometry args={[0.22, 0.45]} />
                  <meshBasicMaterial color={0x1d3557} />
                </mesh>
              ))}

              {/* Windows - Left Facade */}
              {windowsLeftRight.map((wz, idx) => (
                <mesh key={`l-${idx}`} position={[-rW / 2 - 0.02, y + 0.1, wz]} rotation={[0, -Math.PI / 2, 0]}>
                  <planeGeometry args={[0.22, 0.45]} />
                  <meshBasicMaterial color={0x1d3557} />
                </mesh>
              ))}

              {/* Windows - Right Facade */}
              {windowsLeftRight.map((wz, idx) => (
                <mesh key={`r-${idx}`} position={[rW / 2 + 0.02, y + 0.1, wz]} rotation={[0, Math.PI / 2, 0]}>
                  <planeGeometry args={[0.22, 0.45]} />
                  <meshBasicMaterial color={0x1d3557} />
                </mesh>
              ))}
            </group>
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
