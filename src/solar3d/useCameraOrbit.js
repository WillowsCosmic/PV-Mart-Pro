import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * useCameraOrbit
 * Must be used inside a component that lives within <Canvas>.
 * Replaces the manual mousedown/mousemove/wheel listeners from scene3d.js.
 */
export function useCameraOrbit({ enabled = true } = {}) {
  const { gl, camera } = useThree();
  const state = useRef({
    isDragging: false,
    mx0: 0,
    my0: 0,
    theta: 45,   // horizontal orbit angle (degrees)
    phi: 55,     // vertical orbit angle (degrees)
    radius: 38,  // distance from origin
    lastTouch: null,
  });

  useEffect(() => {
    if (!enabled) return;

    const cv = gl.domElement;
    const s = state.current;

    function applyCamera() {
      const tR = THREE.MathUtils.degToRad(s.theta);
      const pR = THREE.MathUtils.degToRad(Math.max(5, Math.min(85, s.phi)));
      camera.position.set(
        s.radius * Math.sin(tR) * Math.cos(pR),
        s.radius * Math.sin(pR),
        s.radius * Math.cos(tR) * Math.cos(pR)
      );
      camera.lookAt(0, 0, 0);
    }

    function onMouseDown(e) {
      if (e.button !== 0) return;
      s.isDragging = true;
      s.mx0 = e.clientX;
      s.my0 = e.clientY;
    }

    function onMouseMove(e) {
      if (!s.isDragging) return;
      const dx = e.clientX - s.mx0;
      const dy = e.clientY - s.my0;
      s.mx0 = e.clientX;
      s.my0 = e.clientY;
      s.theta -= dx * 0.4;
      s.phi   += dy * 0.4;
      applyCamera();
    }

    function onMouseUp() {
      s.isDragging = false;
    }

    function onWheel(e) {
      e.preventDefault();
      s.radius = Math.max(8, Math.min(120, s.radius + e.deltaY * 0.05));
      applyCamera();
    }

    // Touch support
    function onTouchStart(e) {
      if (e.touches.length === 1) {
        s.isDragging = true;
        s.mx0 = e.touches[0].clientX;
        s.my0 = e.touches[0].clientY;
        s.lastTouch = null;
      } else if (e.touches.length === 2) {
        s.isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        s.lastTouch = Math.hypot(dx, dy);
      }
    }

    function onTouchMove(e) {
      e.preventDefault();
      if (e.touches.length === 1 && s.isDragging) {
        const dx = e.touches[0].clientX - s.mx0;
        const dy = e.touches[0].clientY - s.my0;
        s.mx0 = e.touches[0].clientX;
        s.my0 = e.touches[0].clientY;
        s.theta -= dx * 0.4;
        s.phi   += dy * 0.4;
        applyCamera();
      } else if (e.touches.length === 2 && s.lastTouch !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        s.radius = Math.max(8, Math.min(120, s.radius - (dist - s.lastTouch) * 0.05));
        s.lastTouch = dist;
        applyCamera();
      }
    }

    function onTouchEnd() {
      s.isDragging = false;
      s.lastTouch = null;
    }

    cv.addEventListener("mousedown",  onMouseDown);
    cv.addEventListener("mousemove",  onMouseMove);
    cv.addEventListener("mouseup",    onMouseUp);
    cv.addEventListener("mouseleave", onMouseUp);
    cv.addEventListener("wheel",      onWheel,     { passive: false });
    cv.addEventListener("touchstart", onTouchStart,{ passive: true });
    cv.addEventListener("touchmove",  onTouchMove, { passive: false });
    cv.addEventListener("touchend",   onTouchEnd);

    // Set initial camera position
    applyCamera();

    return () => {
      cv.removeEventListener("mousedown",  onMouseDown);
      cv.removeEventListener("mousemove",  onMouseMove);
      cv.removeEventListener("mouseup",    onMouseUp);
      cv.removeEventListener("mouseleave", onMouseUp);
      cv.removeEventListener("wheel",      onWheel);
      cv.removeEventListener("touchstart", onTouchStart);
      cv.removeEventListener("touchmove",  onTouchMove);
      cv.removeEventListener("touchend",   onTouchEnd);
    };
  }, [enabled, gl, camera]);
}
