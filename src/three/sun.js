// depends on your existing SF helpers (solar math) and themes
import * as THREE from "three";
import { SKY_THEMES } from "./themes";

export function updateSunPos({
  hr = 12,
  month = 6,
  lat,
  SF,
  sunLight,      // THREE.DirectionalLight
  hemiLight,     // THREE.HemisphereLight
  sunSphere,     // optional mesh
  skyTheme = "day",
}) {
  if (!sunLight) return;

  const nDay = SF.dayOfYear(month);
  const decl = SF.declination(nDay);
  const om = SF.hourAngle(hr);

  const alt = SF.solarAlt(lat, decl, om);
  const az = SF.solarAz(lat, decl, om, alt);

  const aR = (alt * Math.PI) / 180;
  const azR = (az * Math.PI) / 180;
  const d = 38;

  const sx = d * Math.sin(azR) * Math.cos(aR);
  const sy = Math.max(1, d * Math.sin(aR));
  const sz = -d * Math.cos(azR) * Math.cos(aR);

  sunLight.position.set(sx, sy, sz);

  if (sunSphere) {
    sunSphere.position.set(sx, sy, sz);
    sunSphere.visible = sy > 0.5;
  }

  const golden = hr <= 8 || hr >= 17;
  sunLight.color.set(golden ? 0xff8833 : 0xffdd88);
  sunLight.intensity = Math.max(0, Math.sin(aR) * 4.5);

  if (hemiLight) {
    const sk = SKY_THEMES[skyTheme] || SKY_THEMES.day;
    hemiLight.color.set(sk.hemi);
    hemiLight.groundColor.set(sk.hemiGnd);
  }

  if (sunSphere) {
    sunSphere.material.color = new THREE.Color(golden ? 0xffaa33 : 0xffee55);
  }

  // return values your UI previously put into DOM nodes:
  const sunH = Math.max(
    0,
    7 - Math.abs(hr - 12) * 0.4 - Math.abs(month - 6) * 0.1
  ).toFixed(1);

  return { sunHoursText: `${sunH}h` };
}