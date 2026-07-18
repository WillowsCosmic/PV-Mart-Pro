import { useMemo, useRef, useEffect } from "react";
import { useSolarStore } from "./useSolarStore";
import { SF } from "../services/solarPhysics";
import * as THREE from "three";

export default function Sunlight({ lat }) {
  const hr = useSolarStore((s) => s.sunHour);
  const mo = useSolarStore((s) => s.sunMonth);
  const setSunHoursText = useSolarStore((s) => s.setSunHoursText);

  const dirLightRef = useRef();
  const skyTheme = useSolarStore((s) => s.skyTheme || "day");

  const SKY_THEMES = {
    day:    { hemi: 0xffffff, hemiGnd: 0x444444 },
    sunset: { hemi: 0xffaa66, hemiGnd: 0x221133 },
    night:  { hemi: 0x334466, hemiGnd: 0x111122 },
    dawn:   { hemi: 0xffaa88, hemiGnd: 0x221133 },
  };
  const theme = SKY_THEMES[skyTheme] || SKY_THEMES.day;

  // Compute sun position and parameters dynamically based on lat, hr, and mo
  const sunParams = useMemo(() => {
    const nDay = SF.dayOfYear(mo);
    const decl = SF.declination(nDay);
    const om = SF.hourAngle(hr);
    const alt = SF.solarAlt(lat || 22.5726, decl, om);
    const az = SF.solarAz(lat || 22.5726, decl, om, alt);

    const aR = (alt * Math.PI) / 180;
    const azR = (az * Math.PI) / 180;
    const d = 38;

    const sx = d * Math.sin(azR) * Math.cos(aR);
    const sy = Math.max(1, d * Math.sin(aR));
    const sz = -d * Math.cos(azR) * Math.cos(aR);

    const golden = hr <= 8 || hr >= 17;
    const color = golden ? "#ff8833" : "#ffdd88";
    const intensity = Math.max(0, Math.sin(aR) * 4.5);

    const peakHours = Math.max(
      0,
      7 - Math.abs(hr - 12) * 0.4 - Math.abs(mo - 6) * 0.1
    ).toFixed(1);

    return { sx, sy, sz, color, intensity, peakHours };
  }, [lat, hr, mo]);

  // Update computed peak sun hours in store
  useEffect(() => {
    setSunHoursText(`${sunParams.peakHours}h`);
  }, [sunParams.peakHours, setSunHoursText]);

  return (
    <group>
      {/* Ambient Light */}
      <ambientLight intensity={0.4} color={0xffffff} />

      {/* Hemisphere Light */}
      <hemisphereLight
        color={theme.hemi}
        groundColor={theme.hemiGnd}
        intensity={0.6}
      />

      {/* Directional Sun Light */}
      <directionalLight
        ref={dirLightRef}
        position={[sunParams.sx, sunParams.sy, sunParams.sz]}
        color={sunParams.color}
        intensity={sunParams.intensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={160}
        shadow-camera-left={-38}
        shadow-camera-right={38}
        shadow-camera-top={38}
        shadow-camera-bottom={-38}
        shadow-bias={-0.0005}
      />

      {/* Visual Sun Sphere */}
      {sunParams.sy > 0.5 && (
        <mesh position={[sunParams.sx, sunParams.sy, sunParams.sz]}>
          <sphereGeometry args={[1.5, 16, 16]} />
          <meshBasicMaterial color={hr <= 8 || hr >= 17 ? 0xffaa33 : 0xffee55} />
          <pointLight color={0xffee55} intensity={1.5} distance={40} decay={1} />
        </mesh>
      )}
    </group>
  );
}

