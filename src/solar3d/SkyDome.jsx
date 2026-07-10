import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useSolarStore } from "./useSolarStore";
import { SKY_THEMES } from "./themes";

const vertexShader = /* glsl */ `
  varying vec3 vWP;
  void main() {
    vWP = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 botColor;
  varying vec3 vWP;
  void main() {
    float h = normalize(vWP + 20.0).y;
    gl_FragColor = vec4(mix(botColor, topColor, max(pow(max(h, 0.0), 0.5), 0.0)), 1.0);
  }
`;

export default function SkyDome() {
  const skyTheme = useSolarStore((s) => s.skyTheme);
  const { scene, gl } = useThree();
  const matRef = useRef();

  const sk = SKY_THEMES[skyTheme] || SKY_THEMES.day;

  useEffect(() => {
    scene.fog = new THREE.Fog(sk.fog, 30, 90);
    gl.setClearColor(sk.fog);
  }, [skyTheme, scene, gl, sk.fog]);

  useEffect(() => {
    if (matRef.current) {
      matRef.current.uniforms.topColor.value.set(sk.top);
      matRef.current.uniforms.botColor.value.set(sk.bot);
    }
  }, [skyTheme, sk.top, sk.bot]);

  return (
    <mesh>
      <sphereGeometry args={[80, 32, 16]} onUpdate={(geo) => geo.scale(-1, 1, 1)} />
      <shaderMaterial
        ref={matRef}
        side={THREE.BackSide}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          topColor: { value: new THREE.Color(sk.top) },
          botColor: { value: new THREE.Color(sk.bot) },
        }}
      />
    </mesh>
  );
}
