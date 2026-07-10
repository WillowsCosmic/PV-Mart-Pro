import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThreeRenderer } from "../../three/useThreeRenderer";
import { useSceneObjects } from "../../three/useSceneObjects";

export default function ThreeCanvas({ model, onReady }) {
  const hostRef = useRef(null);

  const { rendererRef, sceneRef, cameraRef, start, stop } =
    useThreeRenderer(hostRef);

  // build scene objects (panels, roof, obstacles, lights)
  useSceneObjects({ sceneRef, cameraRef, model });

  useEffect(() => {
    start();
    onReady?.({
      rendererRef,
      sceneRef,
      cameraRef,
    });
    return () => stop();
  }, [start, stop, onReady, rendererRef, sceneRef, cameraRef]);

  return <div ref={hostRef} style={{ width: "100%", height: "100%" }} />;
}