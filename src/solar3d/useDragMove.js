import { useRef, useCallback } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useSolarStore } from "./useSolarStore";

/**
 * Provides moveMode drag interaction.
 * Call `bindGroup(group)` on each draggable Three.js Group to register it.
 * Returns `{ onPointerDown, onPointerMove, onPointerUp }` handlers
 * to spread onto <Canvas> or the scene root mesh.
 */
export function useDragMove() {
  const { camera, gl, raycaster } = useThree();
  const moveMode     = useSolarStore((s) => s.moveMode);

  const selectedObj  = useRef(null);
  const moveOffset   = useRef(new THREE.Vector3());
  const movePlaneRef = useRef(null);
  const groupsRef    = useRef([]);
  const mouse        = useRef(new THREE.Vector2());

  // Register draggable groups
  const bindGroup = useCallback((group) => {
    if (group && !groupsRef.current.includes(group)) {
      groupsRef.current.push(group);
    }
  }, []);

  const unBindGroup = useCallback((group) => {
    groupsRef.current = groupsRef.current.filter((g) => g !== group);
  }, []);

  // Lazy-init invisible move plane
  const getMovePlane = useCallback(() => {
    if (!movePlaneRef.current) {
      movePlaneRef.current = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 200),
        new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
      );
      movePlaneRef.current.rotation.x = -Math.PI / 2;
    }
    return movePlaneRef.current;
  }, []);

  function getNDC(e) {
    const rect = gl.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width)  *  2 - 1,
      -((e.clientY - rect.top)  / rect.height) *  2 + 1
    );
  }

  // Highlight helpers
  function highlight(group) {
    const all = groupsRef.current;
    all.forEach((g) => {
      g.traverse((m) => {
        if (m.isMesh && m.material) {
          [].concat(m.material).forEach((mat) => {
            if (group === null || g === group) {
              mat.opacity = 1.0; mat.transparent = false;
            } else {
              mat.opacity = 0.35; mat.transparent = true;
            }
          });
        }
      });
    });
    if (group) {
      group.traverse((m) => {
        if (m.isMesh && m.material) {
          [].concat(m.material).forEach((mat) => {
            if (mat.emissive) mat.emissive.set(0x224422);
          });
        }
      });
    }
  }

  function onPointerDown(e) {
    if (!moveMode) return;
    mouse.current = getNDC(e);
    raycaster.setFromCamera(mouse.current, camera);

    // Collect all meshes from registered groups
    const allMeshes = [];
    groupsRef.current.forEach((g) => {
      g.traverse((m) => {
        if (m.isMesh) allMeshes.push({ mesh: m, group: g });
      });
    });

    const meshOnly = allMeshes.map((x) => x.mesh);
    const hits = raycaster.intersectObjects(meshOnly, false);
    if (hits.length > 0) {
      const found = allMeshes.find((x) => x.mesh === hits[0].object);
      if (found) {
        selectedObj.current = found.group;
        highlight(found.group);
        const plane = getMovePlane();
        plane.position.copy(hits[0].point);
        const planeHits = raycaster.intersectObject(plane);
        if (planeHits.length > 0) {
          moveOffset.current.copy(planeHits[0].point).sub(found.group.position);
        }
      }
    }
  }

  function onPointerMove(e) {
    if (!moveMode || !selectedObj.current) return;
    mouse.current = getNDC(e);
    raycaster.setFromCamera(mouse.current, camera);
    const plane = getMovePlane();
    const hits  = raycaster.intersectObject(plane);
    if (hits.length > 0) {
      const newPos = hits[0].point.sub(moveOffset.current);
      selectedObj.current.position.x = newPos.x;
      selectedObj.current.position.z = newPos.z;
    }
  }

  function onPointerUp() {
    if (selectedObj.current) {
      const key = selectedObj.current.userData?.key;
      if (key) {
        const setMovedPosition = useSolarStore.getState().setMovedPosition;
        setMovedPosition(key, selectedObj.current.position.x, selectedObj.current.position.z);
      }
      selectedObj.current = null;
      highlight(null);
    }
  }

  return { bindGroup, unBindGroup, onPointerDown, onPointerMove, onPointerUp };
}
