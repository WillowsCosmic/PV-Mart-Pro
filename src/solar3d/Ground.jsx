import { useMemo } from "react";
import { useSolarStore } from "./useSolarStore";
import { buildGroundTexture } from "./sceneHelpers";

export default function Ground() {
  const groundTheme = useSolarStore((s) => s.groundTheme);

  const texture = useMemo(
    () => buildGroundTexture(groundTheme),
    [groundTheme]
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}
