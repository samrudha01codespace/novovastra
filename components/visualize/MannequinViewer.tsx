"use client";

import {
  useState,
  useRef,
  useCallback,
  Suspense,
  useEffect,
  useMemo,
  Component,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Html,
  ContactShadows,
  Environment,
} from "@react-three/drei";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import {
  Check,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Maximize2,
  Box,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Eye,
} from "lucide-react";

/* ─── Types ────────────────────────────────────── */

interface Measurement {
  param: string;
  value: string;
}

interface MannequinViewerProps {
  measurements: Measurement[];
  setMeasurements: React.Dispatch<React.SetStateAction<Measurement[]>>;
}

interface HotspotDef {
  id: string;
  label: string;
  position: [number, number, number];
  lineType: "circular" | "vertical" | "none";
  lineY?: number;
  lineRadius?: number;
  lineYRange?: [number, number];
  lineXOffset?: number;
  hint?: string;
}

const HOTSPOT_HINTS: Record<string, string> = {
  neck_depth: "Measure from the base of the neck to the shoulder point.",
  shoulder_width: "Measure straight across, shoulder tip to shoulder tip.",
  chest: "Wrap the tape around the fullest part of the chest, kept flat and parallel to the floor.",
  under_bust: "Wrap the tape just below the bust line.",
  waist: "Wrap the tape around the natural waistline — don't pull tight.",
  hip: "Wrap the tape around the fullest part of the hips.",
  armhole: "Wrap the tape around the arm socket, close to the shoulder seam.",
  shoulder_to_waist: "Measure straight down from the shoulder to the waistline.",
  shoulder_to_floor: "Measure from the shoulder point straight down to your desired length.",
  sleeve_length: "Measure from the shoulder to where you want the sleeve to end.",
  bicep: "Wrap the tape around the fullest part of the upper arm.",
  wrist: "Wrap the tape around the wrist bone.",
};

/* ─── Constants ────────────────────────────────── */

const PROXY_BASE = "/api/model";
const FBX_URL = `${PROXY_BASE}?path=models/rp_claudia_rigged_002_u3d.fbx`;
const TEXTURE_PREFIX = `${PROXY_BASE}?path=models/textures/tex%5C`;

const TEXTURES = {
  diffuse: `${TEXTURE_PREFIX}rp_claudia_rigged_002_dif.jpg`,
} as const;

// Brand colors
const GOLD = "#C9A96E";
const GOLD_LIGHT = "#D4B97A";
const GOLD_RGB = new THREE.Color(GOLD);
const GREEN = "#22c55e";

/* ─── FBX Loading Hook ─────────────────────────── */

function useFBX(url: string) {
  const { scene } = useThree();
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (model) return;

    const loader = new FBXLoader();
    const textureLoader = new THREE.TextureLoader();

    loader.load(
        url,
        async (fbx) => {
          // Auto-scale: normalize model so total height is ~2 units
          const box = new THREE.Box3().setFromObject(fbx);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            const scale = 2 / maxDim;
            fbx.scale.setScalar(scale);
          }

          // Center model at origin
          const centeredBox = new THREE.Box3().setFromObject(fbx);
          const center = centeredBox.getCenter(new THREE.Vector3());
          fbx.position.sub(center);

          // Load textures and apply to materials
          const loadTexture = (url: string): Promise<THREE.Texture | null> =>
            new Promise((resolve) => {
              textureLoader.load(
                url,
                (tex) => {
                  tex.colorSpace = THREE.SRGBColorSpace;
                  tex.flipY = true;
                  resolve(tex);
                },
                undefined,
                () => resolve(null)
              );
            });

          const [diffuseMap] = await Promise.all([
            loadTexture(TEXTURES.diffuse),
          ]);

          // Enhanced materials + apply textures
          fbx.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              child.frustumCulled = false;
              if (child.material) {
                const materials = Array.isArray(child.material)
                    ? child.material
                    : [child.material];
                const newMaterials: THREE.MeshStandardMaterial[] = [];
                materials.forEach((mat: THREE.Material) => {
                  const stdMat = new THREE.MeshStandardMaterial({
                    color: (mat as THREE.MeshPhongMaterial).color,
                    roughness: 0.7,
                    metalness: 0.0,
                  });
                  if (diffuseMap) {
                    stdMat.map = diffuseMap;
                  }
                  stdMat.needsUpdate = true;
                  newMaterials.push(stdMat);
                });
                child.material = newMaterials.length === 1 ? newMaterials[0] : newMaterials;
              }
            }
          });

          scene.add(fbx);
          setModel(fbx);
          setProgress(100);
        },
        (xhr) => {
          if (xhr.lengthComputable) {
            setProgress(Math.round((xhr.loaded / xhr.total) * 100));
          }
        },
        (err) => {
          console.error("FBX load error:", err);
          setError("Failed to load FBX model");
        }
    );

    return () => {
      if (model) {
        scene.remove(model);
      }
    };
  }, [url, model, scene]);

  return { model, error, progress };
}

/* ─── Bone Detection ───────────────────────────── */

function getModelBounds(scene: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(scene);
  return {
    minY: box.min.y,
    maxY: box.max.y,
    minX: box.min.x,
    maxX: box.max.x,
    minZ: box.min.z,
    maxZ: box.max.z,
  };
}

function detectBodyPartsFromBones(model: THREE.Group): HotspotDef[] {
  const bones: Record<string, THREE.Bone> = {};
  model.traverse((child) => {
    if (child instanceof THREE.Bone) {
      bones[child.name] = child;
    }
  });

  if (Object.keys(bones).length === 0) return [];

  const pos = (name: string): THREE.Vector3 | null => {
    const b = bones[name];
    if (!b) return null;
    const v = new THREE.Vector3();
    b.getWorldPosition(v);
    return v;
  };

  const p = (name: string) => pos(name) || new THREE.Vector3();

  const hipPos = p("hip");
  const spine01 = p("spine_01");
  const spine02 = p("spine_02");
  const spine03 = p("spine_03");
  const shoulderL = p("shoulder_l");
  const shoulderR = p("shoulder_r");
  const neckPos = p("neck");
  const upperArmL = p("upperarm_l");
  const lowerArmL = p("lowerarm_l");
  const handL = p("hand_l");

  const { minY, maxX } = getModelBounds(model);

  const bodyWidth = (y: number): number => {
    const box = new THREE.Box3().setFromObject(model);
    const totalWidth = box.max.x - box.min.x;
    const totalHeight = box.max.y - box.min.y;
    if (totalHeight === 0) return totalWidth / 2;
    const t = (y - box.min.y) / totalHeight;
    if (t > 0.7) return totalWidth * 0.35;
    if (t > 0.55) return totalWidth * 0.48;
    if (t > 0.45) return totalWidth * 0.42;
    if (t > 0.35) return totalWidth * 0.38;
    return totalWidth * 0.45;
  };

  const frontZ = (): number => {
    const box = new THREE.Box3().setFromObject(model);
    return (box.max.z - box.min.z) * 0.5 + 0.03;
  };

  const shoulderY = shoulderL.y;
  const shoulderSpanX = Math.max(shoulderL.x, Math.abs(shoulderR.x));
  const neckY = neckPos.y;
  const chestY = spine03.y;
  const underBustY = (spine02.y + spine01.y) / 2;
  const waistY = spine01.y;
  const hipY = hipPos.y;

  const hotspots: HotspotDef[] = [
    {
      id: "neck_depth",
      label: "Neck Depth",
      position: [0, neckY + 0.02, frontZ()],
      lineType: "none",
    },
    {
      id: "shoulder_width",
      label: "Shoulder Width",
      position: [0, shoulderY + 0.02, frontZ()],
      lineType: "none",
    },
    {
      id: "chest",
      label: "Chest",
      position: [0, chestY, frontZ()],
      lineType: "circular",
      lineY: chestY,
      lineRadius: bodyWidth(chestY),
    },
    {
      id: "under_bust",
      label: "Under Bust",
      position: [0, underBustY, frontZ()],
      lineType: "circular",
      lineY: underBustY,
      lineRadius: bodyWidth(underBustY),
    },
    {
      id: "waist",
      label: "Waist",
      position: [0, waistY, frontZ()],
      lineType: "circular",
      lineY: waistY,
      lineRadius: bodyWidth(waistY),
    },
    {
      id: "hip",
      label: "Hip",
      position: [0, hipY, frontZ()],
      lineType: "circular",
      lineY: hipY,
      lineRadius: bodyWidth(hipY),
    },
    {
      id: "armhole",
      label: "Armhole",
      position: [
        upperArmL.x * 0.6,
        (chestY + shoulderY) / 2,
        frontZ() * 0.3,
      ],
      lineType: "circular",
      lineY: (chestY + shoulderY) / 2,
      lineRadius: bodyWidth(chestY) * 0.35,
      lineXOffset: upperArmL.x * 0.3,
    },
    {
      id: "shoulder_to_waist",
      label: "Shoulder to Waist",
      position: [0, (shoulderY + waistY) / 2, frontZ() * 0.3],
      lineType: "vertical",
      lineXOffset: -(maxX + 0.08),
      lineYRange: [waistY, shoulderY],
    },
    {
      id: "shoulder_to_floor",
      label: "Shoulder to Floor",
      position: [0, (shoulderY + minY) / 2, frontZ() * 0.3],
      lineType: "vertical",
      lineXOffset: -(maxX + 0.15),
      lineYRange: [minY, shoulderY],
    },
  ];

  if (upperArmL.x > 0) {
    const bicepY = (upperArmL.y + lowerArmL.y) / 2;
    hotspots.push(
        {
          id: "sleeve_length",
          label: "Sleeve Length",
          position: [(upperArmL.x + handL.x) / 2, shoulderY, 0.06],
          lineType: "none",
        },
        {
          id: "bicep",
          label: "Bicep",
          position: [upperArmL.x, bicepY, 0.06],
          lineType: "circular",
          lineY: bicepY,
          lineRadius: 0.04,
          lineXOffset: upperArmL.x,
        },
        {
          id: "wrist",
          label: "Wrist",
          position: [handL.x, handL.y, 0.06],
          lineType: "circular",
          lineY: handL.y,
          lineRadius: 0.03,
          lineXOffset: handL.x,
        }
    );
  }

  return hotspots.map((hs) => ({ ...hs, hint: HOTSPOT_HINTS[hs.id] }));
}

/* ─── Animated Dashed Measurement Lines ────────── */

function CircularArrow({
  y,
  radius,
  xOffset = 0,
  dimmed = false,
  isActive = false,
}: {
  y: number;
  radius: number;
  xOffset?: number;
  dimmed?: boolean;
  isActive?: boolean;
}) {
  const lineObj = useMemo(() => {
    const segments = 80;
    const arcStart = Math.PI * 0.15;
    const arcEnd = Math.PI * 1.85;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = arcStart + (i / segments) * (arcEnd - arcStart);
      const x = xOffset + Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      points.push(new THREE.Vector3(x, y, z));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: GOLD_RGB,
      transparent: true,
      opacity: dimmed ? 0.15 : 0.6,
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  }, [y, radius, xOffset]);

  useFrame(({ clock }) => {
    const mat = lineObj.material as THREE.LineBasicMaterial;
    const t = clock.getElapsedTime();
    if (isActive) {
      mat.opacity = 0.8 + Math.sin(t * 3) * 0.15;
    } else if (dimmed) {
      mat.opacity = 0.12;
    } else {
      mat.opacity = 0.5 + Math.sin(t * 2) * 0.1;
    }
  });

  const arrowOpacity = dimmed ? 0.15 : isActive ? 0.9 : 0.6;
  const arcStart = Math.PI * 0.15;
  const arcEnd = Math.PI * 1.85;

  return (
    <group>
      <primitive object={lineObj} />
      <mesh
        position={[
          xOffset + Math.cos(arcStart) * radius,
          y,
          Math.sin(arcStart) * radius,
        ]}
        rotation={[0, -arcStart - Math.PI / 2, Math.PI / 2]}
      >
        <coneGeometry args={[0.012, 0.03, 6]} />
        <meshBasicMaterial color={GOLD} transparent opacity={arrowOpacity} />
      </mesh>
      <mesh
        position={[
          xOffset + Math.cos(arcEnd) * radius,
          y,
          Math.sin(arcEnd) * radius,
        ]}
        rotation={[0, -arcEnd - Math.PI / 2, -Math.PI / 2]}
      >
        <coneGeometry args={[0.012, 0.03, 6]} />
        <meshBasicMaterial color={GOLD} transparent opacity={arrowOpacity} />
      </mesh>
    </group>
  );
}

function VerticalArrow({
  yRange,
  xOffset,
  dimmed = false,
  isActive = false,
}: {
  yRange: [number, number];
  xOffset: number;
  dimmed?: boolean;
  isActive?: boolean;
}) {
  const z = 0.15;

  const lineObj = useMemo(() => {
    const points = [
      new THREE.Vector3(xOffset, yRange[0], z),
      new THREE.Vector3(xOffset, yRange[1], z),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: GOLD_RGB,
      transparent: true,
      opacity: dimmed ? 0.15 : 0.6,
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  }, [yRange, xOffset, dimmed]);

  useFrame(({ clock }) => {
    const mat = lineObj.material as THREE.LineBasicMaterial;
    const t = clock.getElapsedTime();
    if (isActive) {
      mat.opacity = 0.8 + Math.sin(t * 3) * 0.15;
    } else if (dimmed) {
      mat.opacity = 0.12;
    } else {
      mat.opacity = 0.5 + Math.sin(t * 2) * 0.1;
    }
  });

  const arrowOpacity = dimmed ? 0.15 : isActive ? 0.9 : 0.6;

  return (
    <group>
      <primitive object={lineObj} />
      <mesh position={[xOffset, yRange[0], z]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.012, 0.03, 6]} />
        <meshBasicMaterial color={GOLD} transparent opacity={arrowOpacity} />
      </mesh>
      <mesh position={[xOffset, yRange[1], z]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.012, 0.03, 6]} />
        <meshBasicMaterial color={GOLD} transparent opacity={arrowOpacity} />
      </mesh>
    </group>
  );
}

/* ─── Hotspot with Glow Ring ───────────────────── */

function GlowRing({
                    color,
                    isActive,
                  }: {
  color: string;
  isActive: boolean;
}) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const t = clock.getElapsedTime();
    const scale = isActive ? 1.3 + Math.sin(t * 4) * 0.15 : 1 + Math.sin(t * 2) * 0.1;
    ringRef.current.scale.setScalar(scale);
    const mat = ringRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = isActive ? 0.35 + Math.sin(t * 3) * 0.15 : 0.15 + Math.sin(t * 2) * 0.08;
  });

  return (
      <mesh ref={ringRef} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.035, 0.06, 32]} />
        <meshBasicMaterial
            color={color}
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
        />
      </mesh>
  );
}

function PulseDot({
                    color = GOLD,
                    isActive = false,
                  }: {
  color?: string;
  isActive?: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const scale = isActive
        ? 1.2 + Math.sin(t * 4) * 0.15
        : 1 + Math.sin(t * 3) * 0.18;
    ref.current.scale.setScalar(scale);

    if (glowRef.current) {
      const gScale = isActive
          ? 2.5 + Math.sin(t * 3) * 0.4
          : 1.8 + Math.sin(t * 2) * 0.3;
      glowRef.current.scale.setScalar(gScale);
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = isActive
          ? 0.25 + Math.sin(t * 3) * 0.1
          : 0.12 + Math.sin(t * 2) * 0.06;
    }
  });

  return (
      <group>
        {/* Outer glow sphere */}
        <mesh ref={glowRef}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial
              color={color}
              transparent
              opacity={0.15}
          />
        </mesh>
        {/* Core dot */}
        <mesh ref={ref}>
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isActive ? 1.5 : 0.8}
              toneMapped={false}
          />
        </mesh>
        {/* Glow ring */}
        <GlowRing color={color} isActive={isActive} />
      </group>
  );
}

/* ─── Hotspot Component ────────────────────────── */

function Hotspot({
  hotspot,
  filled,
  isActive,
  onActivate,
  onAdd,
}: {
  hotspot: HotspotDef;
  filled: boolean;
  isActive: boolean;
  onActivate: () => void;
  onAdd: (id: string, label: string, value: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [hovered, setHovered] = useState(false);

  const handleSubmit = useCallback(() => {
    if (inputValue.trim()) {
      onAdd(hotspot.id, hotspot.label, inputValue.trim());
      setInputValue("");
    }
  }, [inputValue, hotspot, onAdd]);

  const labelOffset = hotspot.position[0] >= 0 ? 1 : -1;

  const leaderObj = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(labelOffset * 0.15, 0.02, 0),
    ]);
    const mat = new THREE.LineBasicMaterial({
      color: GOLD_RGB,
      transparent: true,
      opacity: 0,
    });
    return new THREE.Line(geo, mat);
  }, [labelOffset]);

  useFrame(({ clock }) => {
    const mat = leaderObj.material as THREE.LineBasicMaterial;
    const t = clock.getElapsedTime();
    mat.opacity = (isActive || hovered)
      ? 0.6 + Math.sin(t * 3) * 0.15
      : filled ? 0.35 : 0;
  });

  return (
    <group position={hotspot.position}>
      <PulseDot color={filled ? GREEN : GOLD} isActive={isActive || hovered} />
      <primitive object={leaderObj} />

      <Html
        center={false}
        distanceFactor={3}
        style={{
          pointerEvents: "none",
          transform: `translateX(${labelOffset > 0 ? "14px" : "-100%"})`,
          opacity: isActive || filled || hovered ? 1 : 0,
          transition: "opacity 200ms ease",
        }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        {isActive ? (
          <div
            className="flex items-center gap-1 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg px-2 py-1"
            style={{ minWidth: 160, pointerEvents: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {hotspot.label}:
            </span>
            <input
              type="text"
              autoFocus
              placeholder="inches"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") setInputValue("");
              }}
              className="w-16 text-sm bg-transparent border-b border-input outline-none px-1 py-0.5"
            />
            <button
              onClick={handleSubmit}
              className="text-xs gold-gradient text-white rounded px-2 py-0.5 cursor-pointer hover:opacity-90"
            >
              Add
            </button>
          </div>
        ) : (hovered || filled) ? (
          <div
            className="flex items-center gap-1.5 bg-background/90 backdrop-blur-sm border border-border rounded-full shadow-md px-3 py-1.5 whitespace-nowrap cursor-pointer hover:bg-accent transition-colors"
            style={{ pointerEvents: "auto" }}
            onClick={(e) => { e.stopPropagation(); onActivate(); }}
          >
            {filled && <Check className="w-3 h-3 text-green-600" />}
            <span className="text-xs font-medium">{hotspot.label}</span>
          </div>
        ) : null}
      </Html>

      <mesh
        onClick={(e) => { e.stopPropagation(); onActivate(); }}
        onPointerOver={() => { document.body.style.cursor = "pointer"; setHovered(true); }}
        onPointerOut={() => { document.body.style.cursor = "default"; setHovered(false); }}
        visible={false}
      >
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

/* ─── Studio Lighting Setup ────────────────────── */

function StudioLighting() {
  return (
      <>
        {/* Key light – warm, directional */}
        <directionalLight
            position={[4, 6, 5]}
            intensity={1.2}
            color="#FFF5E6"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-far={20}
            shadow-camera-left={-3}
            shadow-camera-right={3}
            shadow-camera-top={3}
            shadow-camera-bottom={-3}
            shadow-bias={-0.001}
        />
        {/* Fill light – cool, softer */}
        <directionalLight
            position={[-4, 3, -3]}
            intensity={0.4}
            color="#E8F0FF"
        />
        {/* Rim light – highlights edges */}
        <directionalLight
            position={[0, 4, -6]}
            intensity={0.5}
            color="#FFE8D6"
        />
        {/* Ambient for soft fill everywhere */}
        <ambientLight intensity={0.35} color="#FFF8F0" />
        {/* Subtle hemisphere light for natural gradient */}
        <hemisphereLight
            color="#FFF5E6"
            groundColor="#2A1218"
            intensity={0.3}
        />
      </>
  );
}

/* ─── Ground Plane ─────────────────────────────── */

function GroundPlane({ modelY }: { modelY: number }) {
  return (
      <>
        {/* Contact shadow for grounding the model */}
        <ContactShadows
            position={[0, modelY, 0]}
            opacity={0.35}
            scale={4}
            blur={2.5}
            far={3}
            color="#2A1218"
        />
        {/* Subtle gradient floor disc */}
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, modelY - 0.005, 0]}
            receiveShadow
        >
          <circleGeometry args={[1.8, 64]} />
          <meshStandardMaterial
              color="#1a1a1e"
              transparent
              opacity={0.25}
              roughness={0.9}
              metalness={0.05}
          />
        </mesh>
      </>
  );
}

/* ─── Camera Controller ────────────────────────── */

function CameraController({
                            scene,
                            autoRotate,
                            resetTrigger,
                          }: {
  scene: THREE.Object3D;
  autoRotate: boolean;
  resetTrigger: number;
}) {
  const { camera } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const initialized = useRef(false);
  const initialCamera = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3() });

  useFrame(() => {
    if (initialized.current) return;
    const { minY, maxY, minX, maxX, minZ, maxZ } = getModelBounds(scene);
    const centerY = (minY + maxY) / 2;
    const rangeY = maxY - minY;
    const rangeX = maxX - minX;
    const rangeZ = maxZ - minZ;
    const maxRange = Math.max(rangeY, rangeX, rangeZ);

    const camPos = new THREE.Vector3(0, centerY + 0.1, maxRange * 1.8);
    camera.position.copy(camPos);
    camera.lookAt(0, centerY, 0);

    initialCamera.current.pos.copy(camPos);
    initialCamera.current.target.set(0, centerY, 0);

    if (controlsRef.current) {
      controlsRef.current.target.set(0, centerY, 0);
      controlsRef.current.update();
    }
    initialized.current = true;
  });

  // Reset camera on trigger
  useEffect(() => {
    if (resetTrigger === 0 || !controlsRef.current) return;
    const ctrl = controlsRef.current;
    const { pos, target } = initialCamera.current;

    // Smooth animate to initial position
    const startPos = camera.position.clone();
    const startTarget = ctrl.target.clone();
    let t = 0;
    const animate = () => {
      t += 0.04;
      if (t >= 1) {
        camera.position.copy(pos);
        ctrl.target.copy(target);
        ctrl.update();
        return;
      }
      const ease = t * t * (3 - 2 * t); // smoothstep
      camera.position.lerpVectors(startPos, pos, ease);
      ctrl.target.lerpVectors(startTarget, target, ease);
      ctrl.update();
      requestAnimationFrame(animate);
    };
    animate();
  }, [resetTrigger, camera]);

  return (
      <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={autoRotate}
          autoRotateSpeed={0.8}
          minDistance={1.0}
          maxDistance={8}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI - 0.2}
          zoomSpeed={1}
          rotateSpeed={0.6}
          panSpeed={0.6}
          enableDamping={true}
          dampingFactor={0.08}
          target={[0, 0, 0]}
      />
  );
}

/* ─── Model Scene ──────────────────────────────── */

function MannequinModel({
                          measurements,
                          onAdd,
                          autoRotate,
                          wireframe,
                          resetTrigger,
                          onHotspotsChange,
                        }: {
  measurements: Measurement[];
  onAdd: (id: string, label: string, value: string) => void;
  autoRotate: boolean;
  wireframe: boolean;
  resetTrigger: number;
  onHotspotsChange?: (total: number) => void;
}) {
  const { model, error, progress } = useFBX(FBX_URL);
  const detectedRef = useRef<HotspotDef[] | null>(null);
  const [hotspots, setHotspots] = useState<HotspotDef[]>([]);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [modelMinY, setModelMinY] = useState(-1);

  // Toggle wireframe on the model
  useEffect(() => {
    if (!model) return;
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material)
            ? child.material
            : [child.material];
        mats.forEach((mat) => {
          (mat as THREE.MeshStandardMaterial).wireframe = wireframe;
        });
      }
    });
  }, [model, wireframe]);

  useFrame(() => {
    if (!model || detectedRef.current) return;
    const detected = detectBodyPartsFromBones(model);
    detectedRef.current = detected;
    setHotspots(detected);
    const bounds = getModelBounds(model);
    setModelMinY(bounds.minY);
  });

  const handleActivate = useCallback((id: string) => {
    setActiveHotspot((prev) => (prev === id ? null : id));
  }, []);

  useEffect(() => {
    if (hotspots.length > 0) onHotspotsChange?.(hotspots.length);
  }, [hotspots.length, onHotspotsChange]);

  // After a measurement is added, auto-advance to the next unmeasured spot
  // so the user always knows exactly what's left, with no guesswork.
  const handleAddAndAdvance = useCallback(
      (id: string, label: string, value: string) => {
        onAdd(id, label, value);
        const filledLabels = new Set(measurements.map((m) => m.param));
        filledLabels.add(label);
        const next = hotspots.find(
            (hs) => hs.label !== label && !filledLabels.has(hs.label)
        );
        setActiveHotspot(next ? next.id : null);
      },
      [onAdd, measurements, hotspots]
  );

  if (error) return null;

  if (!model) {
    return (
        <Html center>
          <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                color: GOLD,
              }}
          >
            <Loader2
                style={{ width: 28, height: 28 }}
                className="animate-spin"
            />
            <div
                style={{
                  width: 120,
                  height: 4,
                  borderRadius: 4,
                  background: "rgba(201,169,110,0.15)",
                  overflow: "hidden",
                }}
            >
              <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    borderRadius: 4,
                    background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})`,
                    transition: "width 300ms ease",
                  }}
              />
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            {progress < 100 ? `Loading model… ${progress}%` : "Initializing…"}
          </span>
          </div>
        </Html>
    );
  }

  return (
      <>
        {/* Studio Lighting */}
        <StudioLighting />

        {/* Environment for reflections */}
        <Environment preset="studio" environmentIntensity={0.3} />

        {/* Ground */}
        <GroundPlane modelY={modelMinY} />

        {/* Hotspots */}
        {hotspots.map((hs) => (
            <Hotspot
                key={hs.id}
                hotspot={hs}
                filled={measurements.some((m) => m.param === hs.label)}
                isActive={activeHotspot === hs.id}
                onActivate={() => handleActivate(hs.id)}
                onAdd={handleAddAndAdvance}
            />
        ))}

        {/* Circular measurement arrows */}
        {hotspots
            .filter(
                (
                    hs
                ): hs is HotspotDef & {
                  lineType: "circular";
                  lineY: number;
                  lineRadius: number;
                } =>
                    hs.lineType === "circular" &&
                    hs.lineY !== undefined &&
                    hs.lineRadius !== undefined
            )
            .map((hs) => (
                <CircularArrow
                    key={`arrow-${hs.id}`}
                    y={hs.lineY}
                    radius={hs.lineRadius}
                    xOffset={hs.lineXOffset ?? 0}
                    dimmed={activeHotspot !== null && activeHotspot !== hs.id}
                    isActive={activeHotspot === hs.id}
                />
            ))}

        {/* Vertical measurement arrows */}
        {hotspots
            .filter(
                (
                    hs
                ): hs is HotspotDef & {
                  lineType: "vertical";
                  lineYRange: [number, number];
                  lineXOffset: number;
                } =>
                    hs.lineType === "vertical" &&
                    hs.lineYRange !== undefined &&
                    hs.lineXOffset !== undefined
            )
            .map((hs) => (
                <VerticalArrow
                    key={`arrow-${hs.id}`}
                    yRange={hs.lineYRange}
                    xOffset={hs.lineXOffset}
                    dimmed={activeHotspot !== null && activeHotspot !== hs.id}
                    isActive={activeHotspot === hs.id}
                />
            ))}

        {/* Camera */}
        <CameraController
            scene={model}
            autoRotate={autoRotate}
            resetTrigger={resetTrigger}
        />
      </>
  );
}

/* ─── Loading Fallback ─────────────────────────── */

function LoadingFallback() {
  return (
      <Html center>
        <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              color: "rgba(255,255,255,0.5)",
            }}
        >
          <Loader2
              style={{ width: 24, height: 24, color: GOLD }}
              className="animate-spin"
          />
          <span style={{ fontSize: 11 }}>Initializing 3D viewer…</span>
        </div>
      </Html>
  );
}

/* ─── Error Boundary ───────────────────────────── */

class ModelErrorBoundary extends Component<
    { children: ReactNode; fallback: ReactNode },
    { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function ModelErrorFallback() {
  return (
      <div
          style={{
            width: "100%",
            aspectRatio: "4/3",
            borderRadius: 16,
            background: "rgba(26,26,30,0.6)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            color: "rgba(255,255,255,0.5)",
            padding: 24,
          }}
      >
        <AlertTriangle style={{ width: 40, height: 40, color: GOLD }} />
        <p style={{ fontSize: 14, fontWeight: 500, textAlign: "center" }}>
          3D model could not be loaded
        </p>
        <p
            style={{
              fontSize: 12,
              textAlign: "center",
              maxWidth: 280,
              lineHeight: 1.5,
            }}
        >
          Please ensure{" "}
          <code
              style={{
                background: "rgba(255,255,255,0.08)",
                padding: "1px 4px",
                borderRadius: 4,
              }}
          >
            claudia_rigged.fbx
          </code>{" "}
          is uploaded to R2.
        </p>
      </div>
  );
}

/* ─── Toolbar Button ───────────────────────────── */

function ToolbarButton({
                         icon: Icon,
                         label,
                         active,
                         onClick,
                       }: {
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
      <button
          onClick={onClick}
          title={label}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            border: active
                ? `1px solid rgba(201,169,110,0.5)`
                : "1px solid rgba(255,255,255,0.08)",
            background: active
                ? "rgba(201,169,110,0.15)"
                : "rgba(255,255,255,0.04)",
            color: active ? GOLD : "rgba(255,255,255,0.55)",
            cursor: "pointer",
            transition: "all 150ms ease",
            padding: 0,
          }}
          onMouseOver={(e) => {
            if (!active) {
              (e.currentTarget as HTMLElement).style.background =
                  "rgba(255,255,255,0.08)";
              (e.currentTarget as HTMLElement).style.color =
                  "rgba(255,255,255,0.8)";
            }
          }}
          onMouseOut={(e) => {
            if (!active) {
              (e.currentTarget as HTMLElement).style.background =
                  "rgba(255,255,255,0.04)";
              (e.currentTarget as HTMLElement).style.color =
                  "rgba(255,255,255,0.55)";
            }
          }}
      >
        <Icon style={{ width: 15, height: 15 }} />
      </button>
  );
}

/* ─── Main Exported Component ──────────────────── */

export function MannequinViewer({
                                  measurements,
                                  setMeasurements,
                                }: MannequinViewerProps) {
  const [autoRotate, setAutoRotate] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const seen = window.localStorage.getItem("mannequin_onboarding_seen");
    if (!seen) setShowOnboarding(true);
  }, []);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    window.localStorage.setItem("mannequin_onboarding_seen", "1");
  }, []);

  const handleAdd = useCallback(
      (id: string, label: string, value: string) => {
        setMeasurements((prev) => {
          const existing = prev.findIndex((m) => m.param === label);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = { param: label, value };
            return updated;
          }
          const withoutEmpty = prev.filter((m) => m.param !== "");
          return [...withoutEmpty, { param: label, value }];
        });
      },
      [setMeasurements]
  );

  const filledCount = measurements.filter((m) => m.param && m.value).length;

  return (
      <div
          style={{
            width: "100%",
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.06)",
            background:
                "linear-gradient(145deg, rgba(18,18,22,0.95), rgba(26,18,22,0.95))",
            position: "relative",
            boxShadow:
                "0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(201,169,110,0.05), inset 0 1px 0 rgba(255,255,255,0.03)",
          }}
      >
        {/* Canvas */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "4/3" }}>
          <ModelErrorBoundary fallback={<ModelErrorFallback />}>
            <Canvas
                camera={{ position: [0, 0.5, 7], fov: 38, near: 0.01, far: 500 }}
                gl={{
                  antialias: true,
                  alpha: true,
                  toneMapping: THREE.ACESFilmicToneMapping,
                  toneMappingExposure: 1.1,
                }}
                shadows
                style={{ background: "transparent" }}
                dpr={[1, 2]}
            >
              <Suspense fallback={<LoadingFallback />}>
                <MannequinModel
                    measurements={measurements}
                    onAdd={handleAdd}
                    autoRotate={autoRotate}
                    wireframe={wireframe}
                    resetTrigger={resetTrigger}
                    onHotspotsChange={setTotalCount}
                />
              </Suspense>
            </Canvas>
          </ModelErrorBoundary>

          {/* ─── Onboarding Overlay (first visit only) ─── */}
          {showOnboarding && (
              <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(8,8,10,0.72)",
                    backdropFilter: "blur(6px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                    padding: 20,
                  }}
              >
                <div
                    style={{
                      maxWidth: 300,
                      background: "rgba(18,18,22,0.95)",
                      border: "1px solid rgba(201,169,110,0.3)",
                      borderRadius: 16,
                      padding: "20px 18px",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                      textAlign: "center",
                    }}
                >
                  <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "rgba(201,169,110,0.15)",
                        border: `1px solid ${GOLD}`,
                        margin: "0 auto 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: `0 0 12px ${GOLD}`,
                      }}
                  >
                <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: GOLD,
                      display: "block",
                    }}
                />
                  </div>
                  <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>
                    Tap the glowing dots to measure yourself
                  </p>
                  <p
                      style={{
                        color: "rgba(255,255,255,0.6)",
                        fontSize: 12.5,
                        lineHeight: 1.6,
                        margin: "0 0 16px",
                      }}
                  >
                    Each dot shows exactly where to place your tape, with a short
                    tip on how to measure. Type in your number in inches — the
                    dot turns green when done, and we&apos;ll guide you straight
                    to the next one.
                  </p>
                  <button
                      onClick={dismissOnboarding}
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`,
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "9px 22px",
                        cursor: "pointer",
                      }}
                  >
                    Got it, let&apos;s start
                  </button>
                </div>
              </div>
          )}

          {/* ─── Floating Toolbar ─── */}
          <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                background: "rgba(10,10,12,0.7)",
                backdropFilter: "blur(16px)",
                borderRadius: 10,
                padding: 4,
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              }}
          >
            <ToolbarButton
                icon={RotateCcw}
                label="Reset Camera"
                onClick={() => setResetTrigger((t) => t + 1)}
            />
            <ToolbarButton
                icon={RefreshCw}
                label="Auto Rotate"
                active={autoRotate}
                onClick={() => setAutoRotate((v) => !v)}
            />
            <ToolbarButton
                icon={Box}
                label="Wireframe"
                active={wireframe}
                onClick={() => setWireframe((v) => !v)}
            />
          </div>

          {/* ─── Bottom Status Bar ─── */}
          <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background:
                    "linear-gradient(to top, rgba(10,10,12,0.85), rgba(10,10,12,0))",
                backdropFilter: "blur(4px)",
              }}
          >
            {/* Legend */}
            <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.45)",
                }}
            >
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: GOLD,
                    display: "inline-block",
                    boxShadow: `0 0 6px ${GOLD}`,
                  }}
              />
              Tap to measure
            </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: GREEN,
                    display: "inline-block",
                    boxShadow: `0 0 6px ${GREEN}`,
                  }}
              />
              Filled
            </span>
            </div>

            {/* Measurement progress */}
            {totalCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                      style={{
                        width: 60,
                        height: 4,
                        borderRadius: 4,
                        background: "rgba(255,255,255,0.1)",
                        overflow: "hidden",
                      }}
                  >
                    <div
                        style={{
                          width: `${Math.min(100, (filledCount / totalCount) * 100)}%`,
                          height: "100%",
                          borderRadius: 4,
                          background: filledCount >= totalCount ? GREEN : GOLD,
                          transition: "width 250ms ease",
                        }}
                    />
                  </div>
                  <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11,
                        color: filledCount >= totalCount ? GREEN : GOLD_LIGHT,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                  >
                    <Eye style={{ width: 12, height: 12 }} />
                    {filledCount} of {totalCount} measured
                  </div>
                </div>
            )}
          </div>
        </div>
      </div>
  );
}