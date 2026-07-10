import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";

export function useThreeRenderer(hostRef) {
  const rendererRef = useRef(null);
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    hostRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 5000);
    camera.position.set(20, 18, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const resize = () => {
      const w = hostRef.current.clientWidth;
      const h = hostRef.current.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      if (renderer.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [hostRef]);

  const renderOnce = useCallback(() => {
    const r = rendererRef.current;
    const sc = sceneRef.current;
    const cam = cameraRef.current;
    if (!r || !sc || !cam) return;
    r.render(sc, cam);
  }, []);

  const start = useCallback(() => {
    const tick = () => {
      renderOnce();
      rafRef.current = requestAnimationFrame(tick);
    };
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
  }, [renderOnce]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  return { rendererRef, sceneRef, cameraRef, start, stop, renderOnce };
}