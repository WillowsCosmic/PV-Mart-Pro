export function capture3DToDataUrl({ renderer, scene, camera, quality = 0.92 }) {
  if (!renderer || !scene || !camera) return null;
  renderer.render(scene, camera);
  try {
    return renderer.domElement.toDataURL("image/jpeg", quality);
  } catch (e) {
    console.warn("3D capture failed:", e);
    return null;
  }
}