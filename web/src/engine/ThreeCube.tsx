import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { CubeColor, CubeState, FaceId, StandardMove, CUBE_COLORS } from '../types/cube';
import { SoundEngine } from '../utils/audio';
import { AlertCircle, RotateCcw, Compass, Play, Pause, Zap } from 'lucide-react';

export interface ThreeCubeProps {
  cubeState: CubeState;
  onMoveExecuted?: (move: StandardMove) => void;
  interactive?: boolean;
  enableFaceSwipe?: boolean;
  autoRotate?: boolean;
  highlightFace?: FaceId | null;
  activeMove?: StandardMove | null;
  skin?: 'classic' | 'cyberGlow' | 'pastel' | 'carbon';
  showControls?: boolean;
  className?: string;
  cameraDistance?: number;
  animationSpeedMs?: number;
}

// Standard WCA Competition & Cyber Color Palettes
const CLASSIC_COLOR_MAP: Record<CubeColor, number> = {
  W: 0xFFFFFF, // Up (White)
  Y: 0xFFD500, // Down (Yellow)
  G: 0x009E60, // Front (Green)
  B: 0x0051BA, // Back (Blue)
  R: 0xC41E3A, // Right (Red)
  O: 0xFF5800  // Left (Orange)
};

const CYBER_GLOW_COLOR_MAP: Record<CubeColor, number> = {
  W: 0xF0F8FF,
  Y: 0xFFE600,
  G: 0x00FF88,
  B: 0x00D9FF,
  R: 0xFF0055,
  O: 0xFF7700
};

const PASTEL_COLOR_MAP: Record<CubeColor, number> = {
  W: 0xF3F4F6,
  Y: 0xFDE047,
  G: 0x86EFAC,
  B: 0x93C5FD,
  R: 0xFCA5A5,
  O: 0xFDBA74
};

const CARBON_COLOR_MAP: Record<CubeColor, number> = {
  W: 0xE6E8EC,
  Y: 0xF5B700,
  G: 0x06D6A0,
  B: 0x118AB2,
  R: 0xEF476F,
  O: 0xF77F00
};

function checkWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export const ThreeCube: React.FC<ThreeCubeProps> = ({
  cubeState,
  onMoveExecuted,
  interactive = true,
  enableFaceSwipe = true,
  autoRotate = false,
  highlightFace = null,
  activeMove = null,
  skin = 'cyberGlow',
  showControls = true,
  className = 'w-full h-full min-h-[300px]',
  cameraDistance = 6.4,
  animationSpeedMs = 150
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cubeGroupRef = useRef<THREE.Group | null>(null);
  const cubiesRef = useRef<THREE.Mesh[]>([]);
  const isAnimatingRef = useRef(false);
  const moveQueueRef = useRef<StandardMove[]>([]);
  const currentCubeStateRef = useRef<CubeState>(cubeState);

  const [isRotatingAuto, setIsRotatingAuto] = useState(autoRotate);
  const [webGLError, setWebGLError] = useState<string | null>(null);
  const [speedMs, setSpeedMs] = useState(animationSpeedMs);

  // Keep ref up to date with latest prop
  useEffect(() => {
    currentCubeStateRef.current = cubeState;
  }, [cubeState]);

  // Touch & Pointer state
  const isPointerDownRef = useRef(false);
  const startPointerRef = useRef({ x: 0, y: 0 });
  const previousPointerPositionRef = useRef({ x: 0, y: 0 });
  const initialHitRef = useRef<{
    cubie: THREE.Mesh;
    localNormal: THREE.Vector3;
    gridPos: THREE.Vector3;
    hitPoint: THREE.Vector3;
  } | null>(null);
  const isOrbitingRef = useRef(false);

  // Palette resolver based on selected skin
  const getColorHex = useCallback((color: CubeColor) => {
    switch (skin) {
      case 'classic':
        return CLASSIC_COLOR_MAP[color];
      case 'pastel':
        return PASTEL_COLOR_MAP[color];
      case 'carbon':
        return CARBON_COLOR_MAP[color];
      case 'cyberGlow':
      default:
        return CYBER_GLOW_COLOR_MAP[color];
    }
  }, [skin]);

  // Map cubie position and faceIndex to logical sticker color
  const getStickerColorForFace = useCallback((
    state: CubeState,
    x: number,
    y: number,
    z: number,
    faceIndex: number
  ): CubeColor | null => {
    // faceIndex 0: +X (Right)
    if (faceIndex === 0 && x === 1) {
      const row = 1 - y;
      const col = 1 - z;
      return state.R[row * 3 + col] || 'R';
    }
    // faceIndex 1: -X (Left)
    if (faceIndex === 1 && x === -1) {
      const row = 1 - y;
      const col = z + 1;
      return state.L[row * 3 + col] || 'O';
    }
    // faceIndex 2: +Y (Up)
    if (faceIndex === 2 && y === 1) {
      const row = z + 1;
      const col = x + 1;
      return state.U[row * 3 + col] || 'W';
    }
    // faceIndex 3: -Y (Down)
    if (faceIndex === 3 && y === -1) {
      const row = 1 - z;
      const col = x + 1;
      return state.D[row * 3 + col] || 'Y';
    }
    // faceIndex 4: +Z (Front)
    if (faceIndex === 4 && z === 1) {
      const row = 1 - y;
      const col = x + 1;
      return state.F[row * 3 + col] || 'G';
    }
    // faceIndex 5: -Z (Back)
    if (faceIndex === 5 && z === -1) {
      const row = 1 - y;
      const col = 1 - x;
      return state.B[row * 3 + col] || 'B';
    }

    return null;
  }, []);

  // Update cubie sticker materials dynamically from canonical cube state
  const updateStickers = useCallback((stateToRender: CubeState = currentCubeStateRef.current) => {
    if (!cubeGroupRef.current || cubiesRef.current.length === 0) return;

    try {
      const bodyColor = skin === 'carbon' ? 0x111317 : skin === 'cyberGlow' ? 0x090D16 : 0x16181F;
      const roughness = skin === 'pastel' ? 0.85 : 0.25;
      const metalness = skin === 'cyberGlow' ? 0.35 : 0.12;

      cubiesRef.current.forEach((cubie) => {
        // Use user data canonical grid pos
        const grid = (cubie.userData.gridPos as THREE.Vector3) || cubie.position;
        const x = Math.round(grid.x);
        const y = Math.round(grid.y);
        const z = Math.round(grid.z);

        const materials = (cubie.material as THREE.Material[]).map((_, faceIndex) => {
          const stickerColor = getStickerColorForFace(stateToRender, x, y, z, faceIndex);

          if (stickerColor) {
            const hex = getColorHex(stickerColor);
            const isEmissive = skin === 'cyberGlow';
            return new THREE.MeshStandardMaterial({
              color: hex,
              roughness,
              metalness,
              emissive: isEmissive ? hex : 0x000000,
              emissiveIntensity: isEmissive ? 0.38 : 0.0
            });
          }

          // Inner plastic chassis
          return new THREE.MeshStandardMaterial({
            color: bodyColor,
            roughness: 0.8,
            metalness: 0.1
          });
        });

        cubie.material = materials;
      });
    } catch (e) {
      console.warn('ThreeCube updateStickers warning:', e);
    }
  }, [skin, getColorHex, getStickerColorForFace]);

  // Execute smooth animated layer rotation with identity reset
  const animateLayerRotation = useCallback((move: StandardMove, onComplete?: () => void) => {
    if (!cubeGroupRef.current) {
      onComplete?.();
      return;
    }

    isAnimatingRef.current = true;

    // Haptics & Sound
    try {
      SoundEngine.playTurnSound(1.2);
      if (typeof window !== 'undefined' && (window as any).AndroidBridge?.hapticTick) {
        (window as any).AndroidBridge.hapticTick();
      }
    } catch {
      // Audio or haptics unavailable
    }

    const face = move[0] as FaceId;
    const isPrime = move.endsWith("'");
    const isDouble = move.endsWith("2");

    let angle = (Math.PI / 2) * (isPrime ? 1 : -1) * (isDouble ? 2 : 1);
    const rotationAxis = new THREE.Vector3();
    let filterFn: (p: THREE.Vector3) => boolean;

    switch (face) {
      case 'R':
        rotationAxis.set(1, 0, 0);
        filterFn = (p) => Math.round(p.x) === 1;
        break;
      case 'L':
        rotationAxis.set(1, 0, 0);
        angle = -angle;
        filterFn = (p) => Math.round(p.x) === -1;
        break;
      case 'U':
        rotationAxis.set(0, 1, 0);
        filterFn = (p) => Math.round(p.y) === 1;
        break;
      case 'D':
        rotationAxis.set(0, 1, 0);
        angle = -angle;
        filterFn = (p) => Math.round(p.y) === -1;
        break;
      case 'F':
        rotationAxis.set(0, 0, 1);
        filterFn = (p) => Math.round(p.z) === 1;
        break;
      case 'B':
        rotationAxis.set(0, 0, 1);
        angle = -angle;
        filterFn = (p) => Math.round(p.z) === -1;
        break;
      default:
        isAnimatingRef.current = false;
        onComplete?.();
        return;
    }

    const movingCubies = cubiesRef.current.filter((c) => filterFn(c.position));
    const pivot = new THREE.Group();
    cubeGroupRef.current.add(pivot);

    // Save original positions before parenting to pivot
    const originalPositions = movingCubies.map((c) => c.position.clone());

    movingCubies.forEach((cubie) => {
      cubeGroupRef.current?.remove(cubie);
      pivot.add(cubie);
    });

    const duration = isDouble ? speedMs * 1.3 : speedMs;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Magnetic cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);

      pivot.rotation.set(
        rotationAxis.x * angle * eased,
        rotationAxis.y * angle * eased,
        rotationAxis.z * angle * eased
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Complete the turn:
        // Detach cubies, reset their positions to canonical grid & reset identity rotation
        movingCubies.forEach((cubie, idx) => {
          pivot.remove(cubie);
          cubie.rotation.set(0, 0, 0);
          cubie.quaternion.identity();
          cubie.position.copy(originalPositions[idx]);
          cubeGroupRef.current?.add(cubie);
        });

        cubeGroupRef.current?.remove(pivot);
        isAnimatingRef.current = false;

        // Trigger move callback which updates logical cubeState
        onComplete?.();

        // If another move is queued in rapid sequence, run it next
        if (moveQueueRef.current.length > 0) {
          const nextMove = moveQueueRef.current.shift()!;
          animateLayerRotation(nextMove, () => {
            onMoveExecuted?.(nextMove);
          });
        }
      }
    };

    requestAnimationFrame(animate);
  }, [speedMs, onMoveExecuted]);

  const triggerMove = useCallback((move: StandardMove) => {
    if (webGLError) {
      onMoveExecuted?.(move);
      return;
    }
    if (isAnimatingRef.current) {
      moveQueueRef.current.push(move);
    } else {
      animateLayerRotation(move, () => {
        onMoveExecuted?.(move);
      });
    }
  }, [animateLayerRotation, onMoveExecuted, webGLError]);

  // Handle externally commanded moves (from buttons, algorithm runners, solvers)
  useEffect(() => {
    if (activeMove) {
      triggerMove(activeMove);
    }
  }, [activeMove, triggerMove]);

  // Re-sync visual stickers whenever prop cubeState changes
  useEffect(() => {
    updateStickers(cubeState);
  }, [cubeState, updateStickers]);

  // Three.js Scene Initialization
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!checkWebGLAvailable()) {
      setWebGLError('WebGL is not available in this environment');
      return;
    }

    try {
      const width = container.clientWidth || 320;
      const height = container.clientHeight || 320;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
      camera.position.set(4.5, 3.8, 5.2);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      rendererRef.current = renderer;

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      // Studio Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
      keyLight.position.set(6, 10, 8);
      scene.add(keyLight);

      const cyanFillLight = new THREE.DirectionalLight(0x00F0FF, 0.9);
      cyanFillLight.position.set(-8, -4, -6);
      scene.add(cyanFillLight);

      const magentaRimLight = new THREE.DirectionalLight(0xFF007F, 0.7);
      magentaRimLight.position.set(5, -6, -5);
      scene.add(magentaRimLight);

      // Main Cube Group
      const cubeGroup = new THREE.Group();
      cubeGroupRef.current = cubeGroup;
      // Default isometric orientation
      cubeGroup.rotation.set(0.42, 0.62, 0);
      scene.add(cubeGroup);

      // Create 26 cubies (3x3x3 grid minus core 0,0,0)
      const cubies: THREE.Mesh[] = [];
      const cubieSize = 0.95;
      const geometry = new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize);

      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          for (let z = -1; z <= 1; z++) {
            if (x === 0 && y === 0 && z === 0) continue; // Skip invisible internal core

            const initialMaterials = Array(6).fill(null).map(() =>
              new THREE.MeshStandardMaterial({
                color: 0x111317,
                roughness: 0.6,
                metalness: 0.15
              })
            );

            const cubie = new THREE.Mesh(geometry, initialMaterials);
            cubie.position.set(x, y, z);
            cubie.userData = {
              gridPos: new THREE.Vector3(x, y, z)
            };
            cubeGroup.add(cubie);
            cubies.push(cubie);
          }
        }
      }
      cubiesRef.current = cubies;

      // Apply initial stickers
      updateStickers(currentCubeStateRef.current);

      // Render Loop
      let reqId: number;
      const render = () => {
        reqId = requestAnimationFrame(render);
        if (isRotatingAuto && cubeGroupRef.current && !isPointerDownRef.current) {
          cubeGroupRef.current.rotation.y += 0.007;
        }
        renderer.render(scene, camera);
      };
      render();

      const handleResize = () => {
        if (!container || !renderer || !camera) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(reqId);
        renderer.dispose();
        container.innerHTML = '';
      };
    } catch (err: any) {
      console.error('Three.js setup caught exception:', err);
      setWebGLError(err.message || 'WebGL context could not be created');
    }
  }, [isRotatingAuto, updateStickers]);

  // Raycasting for touch & click selection
  const getIntersection = (clientX: number, clientY: number) => {
    if (!rendererRef.current || !cameraRef.current || !cubeGroupRef.current) return null;
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
    const intersects = raycaster.intersectObjects(cubiesRef.current, false);

    if (intersects.length > 0 && intersects[0].face) {
      const hit = intersects[0];
      const cubie = hit.object as THREE.Mesh;
      const localNormal = hit.face.normal.clone();
      const gridPos = (cubie.userData.gridPos as THREE.Vector3) || cubie.position;

      return {
        cubie,
        localNormal,
        gridPos: gridPos.clone(),
        hitPoint: hit.point.clone()
      };
    }
    return null;
  };

  // Mathematical Rubik's Swipe Resolver
  const resolveSwipeMove = (
    hit: { cubie: THREE.Mesh; localNormal: THREE.Vector3; gridPos: THREE.Vector3; hitPoint: THREE.Vector3 },
    deltaX: number,
    deltaY: number
  ): StandardMove | null => {
    if (!cameraRef.current || !cubeGroupRef.current) return null;

    const norm = hit.localNormal;
    const gx = Math.round(hit.gridPos.x);
    const gy = Math.round(hit.gridPos.y);
    const gz = Math.round(hit.gridPos.z);

    // Screen projection of cube's local X, Y, Z unit vectors
    cubeGroupRef.current.updateMatrixWorld(true);
    const q = cubeGroupRef.current.quaternion;

    const p0 = hit.hitPoint.clone().project(cameraRef.current);
    const pX = hit.hitPoint.clone().add(new THREE.Vector3(1, 0, 0).applyQuaternion(q).multiplyScalar(0.5)).project(cameraRef.current);
    const pY = hit.hitPoint.clone().add(new THREE.Vector3(0, 1, 0).applyQuaternion(q).multiplyScalar(0.5)).project(cameraRef.current);
    const pZ = hit.hitPoint.clone().add(new THREE.Vector3(0, 0, 1).applyQuaternion(q).multiplyScalar(0.5)).project(cameraRef.current);

    const screenX = new THREE.Vector2(pX.x - p0.x, -(pX.y - p0.y)).normalize();
    const screenY = new THREE.Vector2(pY.x - p0.x, -(pY.y - p0.y)).normalize();
    const screenZ = new THREE.Vector2(pZ.x - p0.x, -(pZ.y - p0.y)).normalize();

    const swipe = new THREE.Vector2(deltaX, deltaY);

    // 1. FRONT FACE (local normal is +Z)
    if (norm.z > 0.5) {
      const dotX = swipe.dot(screenX);
      const dotY = swipe.dot(screenY);

      if (Math.abs(dotX) > Math.abs(dotY)) {
        // Horizontal swipe along X
        const isRight = dotX > 0;
        if (gy === 1) return isRight ? "U'" : "U";
        if (gy === -1) return isRight ? "D" : "D'";
        return isRight ? "U'" : "U";
      } else {
        // Vertical swipe along Y
        const isUp = dotY < 0; // screen Y is inverted
        if (gx === 1) return isUp ? "R" : "R'";
        if (gx === -1) return isUp ? "L'" : "L";
        return isUp ? "R" : "R'";
      }
    }

    // 2. BACK FACE (local normal is -Z)
    if (norm.z < -0.5) {
      const dotX = swipe.dot(screenX);
      const dotY = swipe.dot(screenY);

      if (Math.abs(dotX) > Math.abs(dotY)) {
        const isRight = dotX > 0;
        if (gy === 1) return isRight ? "U" : "U'";
        if (gy === -1) return isRight ? "D'" : "D";
        return isRight ? "U" : "U'";
      } else {
        const isUp = dotY < 0;
        if (gx === 1) return isUp ? "R'" : "R";
        if (gx === -1) return isUp ? "L" : "L'";
        return isUp ? "R'" : "R";
      }
    }

    // 3. RIGHT FACE (local normal is +X)
    if (norm.x > 0.5) {
      const dotZ = swipe.dot(screenZ);
      const dotY = swipe.dot(screenY);

      if (Math.abs(dotZ) > Math.abs(dotY)) {
        const isForward = dotZ > 0;
        if (gy === 1) return isForward ? "U" : "U'";
        if (gy === -1) return isForward ? "D'" : "D";
        return isForward ? "U" : "U'";
      } else {
        const isUp = dotY < 0;
        if (gz === 1) return isUp ? "F'" : "F";
        if (gz === -1) return isUp ? "B" : "B'";
        return isUp ? "F'" : "F";
      }
    }

    // 4. LEFT FACE (local normal is -X)
    if (norm.x < -0.5) {
      const dotZ = swipe.dot(screenZ);
      const dotY = swipe.dot(screenY);

      if (Math.abs(dotZ) > Math.abs(dotY)) {
        const isForward = dotZ > 0;
        if (gy === 1) return isForward ? "U'" : "U";
        if (gy === -1) return isForward ? "D" : "D'";
        return isForward ? "U'" : "U";
      } else {
        const isUp = dotY < 0;
        if (gz === 1) return isUp ? "F" : "F'";
        if (gz === -1) return isUp ? "B'" : "B";
        return isUp ? "F" : "F'";
      }
    }

    // 5. UP FACE (local normal is +Y)
    if (norm.y > 0.5) {
      const dotX = swipe.dot(screenX);
      const dotZ = swipe.dot(screenZ);

      if (Math.abs(dotX) > Math.abs(dotZ)) {
        const isRight = dotX > 0;
        if (gz === 1) return isRight ? "F" : "F'";
        if (gz === -1) return isRight ? "B'" : "B";
        return isRight ? "F" : "F'";
      } else {
        const isForward = dotZ > 0;
        if (gx === 1) return isForward ? "R'" : "R";
        if (gx === -1) return isForward ? "L" : "L'";
        return isForward ? "R'" : "R";
      }
    }

    // 6. DOWN FACE (local normal is -Y)
    if (norm.y < -0.5) {
      const dotX = swipe.dot(screenX);
      const dotZ = swipe.dot(screenZ);

      if (Math.abs(dotX) > Math.abs(dotZ)) {
        const isRight = dotX > 0;
        if (gz === 1) return isRight ? "F'" : "F";
        if (gz === -1) return isRight ? "B" : "B'";
        return isRight ? "F'" : "F";
      } else {
        const isForward = dotZ > 0;
        if (gx === 1) return isForward ? "R" : "R'";
        if (gx === -1) return isForward ? "L'" : "L";
        return isForward ? "R" : "R'";
      }
    }

    return null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    isPointerDownRef.current = true;
    startPointerRef.current = { x: e.clientX, y: e.clientY };
    previousPointerPositionRef.current = { x: e.clientX, y: e.clientY };
    isOrbitingRef.current = false;

    if (enableFaceSwipe) {
      initialHitRef.current = getIntersection(e.clientX, e.clientY);
    } else {
      initialHitRef.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current || !cubeGroupRef.current) return;

    const deltaX = e.clientX - previousPointerPositionRef.current.x;
    const deltaY = e.clientY - previousPointerPositionRef.current.y;
    const totalDist = Math.hypot(e.clientX - startPointerRef.current.x, e.clientY - startPointerRef.current.y);

    if (!initialHitRef.current || isOrbitingRef.current) {
      isOrbitingRef.current = true;
      cubeGroupRef.current.rotation.y += deltaX * 0.009;
      cubeGroupRef.current.rotation.x += deltaY * 0.009;
      previousPointerPositionRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Check swipe threshold
    if (totalDist > 18 && !isAnimatingRef.current) {
      const move = resolveSwipeMove(
        initialHitRef.current,
        e.clientX - startPointerRef.current.x,
        e.clientY - startPointerRef.current.y
      );

      if (move) {
        triggerMove(move);
        initialHitRef.current = null;
        isPointerDownRef.current = false;
        return;
      } else {
        // Fallback to orbit if gesture didn't resolve to face turn
        isOrbitingRef.current = true;
        cubeGroupRef.current.rotation.y += deltaX * 0.009;
        cubeGroupRef.current.rotation.x += deltaY * 0.009;
      }
    }

    previousPointerPositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
    initialHitRef.current = null;
    isOrbitingRef.current = false;
  };

  const setPresetView = (view: 'iso' | 'front' | 'top' | 'right' | 'back') => {
    if (!cubeGroupRef.current) return;
    SoundEngine.playClickSound();
    switch (view) {
      case 'iso':
        cubeGroupRef.current.rotation.set(0.42, 0.62, 0);
        break;
      case 'front':
        cubeGroupRef.current.rotation.set(0, 0, 0);
        break;
      case 'top':
        cubeGroupRef.current.rotation.set(Math.PI / 2, 0, 0);
        break;
      case 'right':
        cubeGroupRef.current.rotation.set(0, -Math.PI / 2, 0);
        break;
      case 'back':
        cubeGroupRef.current.rotation.set(0, Math.PI, 0);
        break;
    }
  };

  const resetRotation = () => {
    if (!cubeGroupRef.current) return;
    SoundEngine.playClickSound();
    cubeGroupRef.current.rotation.set(0.42, 0.62, 0);
  };

  // 2D Interactive Fallback if WebGL is unavailable
  if (webGLError) {
    return (
      <div className={`flex flex-col items-center justify-center p-3 text-center bg-cyber-card/80 border border-cyber-border rounded-2xl ${className}`}>
        <div className="flex items-center gap-1.5 text-xs text-cyber-yellow mb-2 bg-cyber-yellow/10 border border-cyber-yellow/20 px-2.5 py-1 rounded-xl">
          <AlertCircle size={14} />
          <span>2D Interactive Cube Mode</span>
        </div>

        {/* 2D Unfolded Net View with live colors */}
        <div className="p-2 flex flex-col items-center justify-center scale-90">
          <div className="grid grid-cols-3 gap-1 mb-1">
            {cubeState.U.map((c, i) => (
              <div key={i} style={{ backgroundColor: CUBE_COLORS[c].hex }} className="w-5 h-5 rounded border border-black/50 shadow" />
            ))}
          </div>
          <div className="flex gap-1 mb-1">
            <div className="grid grid-cols-3 gap-1">
              {cubeState.L.map((c, i) => (
                <div key={i} style={{ backgroundColor: CUBE_COLORS[c].hex }} className="w-5 h-5 rounded border border-black/50 shadow" />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {cubeState.F.map((c, i) => (
                <div key={i} style={{ backgroundColor: CUBE_COLORS[c].hex }} className="w-5 h-5 rounded border border-black/50 shadow" />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {cubeState.R.map((c, i) => (
                <div key={i} style={{ backgroundColor: CUBE_COLORS[c].hex }} className="w-5 h-5 rounded border border-black/50 shadow" />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {cubeState.B.map((c, i) => (
                <div key={i} style={{ backgroundColor: CUBE_COLORS[c].hex }} className="w-5 h-5 rounded border border-black/50 shadow" />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {cubeState.D.map((c, i) => (
              <div key={i} style={{ backgroundColor: CUBE_COLORS[c].hex }} className="w-5 h-5 rounded border border-black/50 shadow" />
            ))}
          </div>
        </div>

        {/* Quick Rotation Buttons for 2D mode */}
        <div className="flex flex-wrap justify-center gap-1.5 mt-2">
          {(['R', "R'", 'U', "U'", 'F', "F'", 'L', "L'", 'D', "D'"] as StandardMove[]).map((m) => (
            <button
              key={m}
              onClick={() => onMoveExecuted?.(m)}
              className="px-2.5 py-1 bg-cyber-surface rounded-lg text-xs font-bold text-cyber-cyan border border-cyber-border active:scale-90"
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
      />

      {/* Floating 3D Controls HUD */}
      {showControls && (
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-auto px-1 z-10">
          {/* Preset Camera Views */}
          <div className="flex items-center gap-1 bg-cyber-card/85 backdrop-blur-md px-2 py-1 rounded-full border border-cyber-border text-[11px] text-gray-300 shadow-xl">
            <button
              onClick={() => setPresetView('iso')}
              title="Isometric 3D View"
              className="px-2 py-0.5 rounded hover:bg-cyber-surface hover:text-cyber-cyan transition-colors"
            >
              3D
            </button>
            <button
              onClick={() => setPresetView('front')}
              title="Front Face View"
              className="px-1.5 py-0.5 rounded hover:bg-cyber-surface hover:text-cyber-cyan transition-colors"
            >
              F
            </button>
            <button
              onClick={() => setPresetView('top')}
              title="Up Face View"
              className="px-1.5 py-0.5 rounded hover:bg-cyber-surface hover:text-cyber-cyan transition-colors"
            >
              U
            </button>
            <button
              onClick={() => setPresetView('right')}
              title="Right Face View"
              className="px-1.5 py-0.5 rounded hover:bg-cyber-surface hover:text-cyber-cyan transition-colors"
            >
              R
            </button>
          </div>

          {/* Spin, Speed, and Reset */}
          <div className="flex items-center gap-1.5 bg-cyber-card/85 backdrop-blur-md px-2 py-1 rounded-full border border-cyber-border text-[11px] text-gray-300 shadow-xl">
            {/* Speed toggle: Pro 90ms / Std 150ms / Slow 280ms */}
            <button
              onClick={() => {
                SoundEngine.playClickSound();
                setSpeedMs((prev) => (prev === 150 ? 90 : prev === 90 ? 280 : 150));
              }}
              title="Animation Speed"
              className="px-1.5 py-0.5 rounded text-[10px] font-mono text-cyber-yellow hover:bg-cyber-surface flex items-center gap-0.5"
            >
              <Zap size={11} />
              <span>{speedMs === 90 ? 'Fast' : speedMs === 280 ? 'Slow' : 'Norm'}</span>
            </button>

            {/* Auto Spin Toggle */}
            <button
              onClick={() => setIsRotatingAuto(!isRotatingAuto)}
              title="Toggle Auto Spin"
              className={`px-1.5 py-0.5 rounded transition-colors flex items-center gap-0.5 ${
                isRotatingAuto ? 'bg-cyber-cyan/20 text-cyber-cyan font-semibold' : 'hover:bg-cyber-surface'
              }`}
            >
              {isRotatingAuto ? <Pause size={11} /> : <Play size={11} />}
              <span>Spin</span>
            </button>

            {/* Reset View Angle */}
            <button
              onClick={resetRotation}
              title="Reset View Angle"
              className="p-1 rounded hover:bg-cyber-surface text-gray-400 hover:text-white"
            >
              <Compass size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
