import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RobotControlState, RobotTelemetry } from '../types/robot';
import { parseUrdfText, ParsedUrdfRobot } from '../utils/urdfParser';
import { playArcadeClick } from '../utils/audio';
import { ShieldAlert, Compass, FolderOpen, RotateCcw, Box, Eye, Layers } from 'lucide-react';

interface MujocoViewportProps {
  controlState: RobotControlState;
  onUpdateTelemetry: (telemetry: RobotTelemetry) => void;
  onResetRobot: () => void;
  onToggleEstop: () => void;
  urdfContent: string;
  urdfName: string;
  onOpenUrdfModal: () => void;
}

export const MujocoViewport: React.FC<MujocoViewportProps> = ({
  controlState,
  onUpdateTelemetry,
  onToggleEstop,
  urdfContent,
  urdfName,
  onOpenUrdfModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References for Three.js scene objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const robotGroupRef = useRef<THREE.Group | null>(null);
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
  const parsedRobotRef = useRef<ParsedUrdfRobot | null>(null);

  // Display toggles
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [urdfInfo, setUrdfInfo] = useState<{
    name: string;
    linksCount: number;
    jointsCount: number;
    size: string;
  }>({
    name: 'quadruped_bot',
    linksCount: 13,
    jointsCount: 12,
    size: '0.48m × 0.22m × 0.35m',
  });

  // Orbit camera parameters
  const orbitState = useRef({
    theta: Math.PI / 4,
    phi: Math.PI / 3.4,
    radius: 1.8,
    target: new THREE.Vector3(0, 0.2, 0),
    isDragging: false,
    isPanning: false,
    prevMouseX: 0,
    prevMouseY: 0,
  });

  // Re-center camera onto current model bounding box
  const handleResetCamera = useCallback(() => {
    playArcadeClick(520);
    if (parsedRobotRef.current) {
      const box = parsedRobotRef.current.bounds;
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z, 0.5);

      orbitState.current.target.copy(center);
      orbitState.current.radius = maxDim * 2.2;
      orbitState.current.theta = Math.PI / 4;
      orbitState.current.phi = Math.PI / 3.2;
    } else {
      orbitState.current.target.set(0, 0.2, 0);
      orbitState.current.radius = 1.8;
      orbitState.current.theta = Math.PI / 4;
      orbitState.current.phi = Math.PI / 3.2;
    }
  }, []);

  // Setup Three.js Scene and Materials
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 450;

    // 1. Scene & Dark Tactical Atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c110c);
    scene.fog = new THREE.FogExp2(0x0c110c, 0.04);
    sceneRef.current = scene;

    // 2. Camera Setup (Perspective Orbit view)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 100);
    camera.position.set(1.5, 1.2, 1.5);
    camera.lookAt(0, 0.2, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer with Anti-Aliasing
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xd4e5d4, 0.85);
    scene.add(ambientLight);

    const mainSun = new THREE.DirectionalLight(0xfffaed, 1.6);
    mainSun.position.set(5, 10, 6);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 1024;
    mainSun.shadow.mapSize.height = 1024;
    mainSun.shadow.camera.near = 0.1;
    mainSun.shadow.camera.far = 20;
    scene.add(mainSun);

    const fillLight = new THREE.DirectionalLight(0x22c55e, 0.6);
    fillLight.position.set(-5, 4, -5);
    scene.add(fillLight);

    const bottomGlow = new THREE.PointLight(0xf59e0b, 0.4, 6);
    bottomGlow.position.set(0, -0.2, 0);
    scene.add(bottomGlow);

    // 5. High-Tech Grid Flooring
    const arenaSize = 30;
    const groundGeo = new THREE.PlaneGeometry(arenaSize, arenaSize);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x111611,
      roughness: 0.85,
      metalness: 0.2,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    groundMesh.position.y = 0;
    scene.add(groundMesh);

    // Fine grid
    const gridMajor = new THREE.GridHelper(30, 60, 0xf59e0b, 0x243324);
    gridMajor.position.y = 0.001;
    scene.add(gridMajor);

    // Center Tactical Origin Ring
    const ringGeo = new THREE.RingGeometry(0.8, 0.84, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.002;
    scene.add(ringMesh);

    // Origin Axes
    const axesHelper = new THREE.AxesHelper(0.5);
    axesHelper.position.y = 0.003;
    scene.add(axesHelper);
    axesHelperRef.current = axesHelper;

    // Window / Resize Observer
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w === 0 || h === 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  // Parse and Load URDF into scene whenever urdfContent changes
  useEffect(() => {
    if (!sceneRef.current || !urdfContent) return;

    try {
      const parsed = parseUrdfText(urdfContent);
      parsedRobotRef.current = parsed;

      // Remove existing robot model
      if (robotGroupRef.current) {
        sceneRef.current.remove(robotGroupRef.current);
      }

      // Add newly parsed robot group
      sceneRef.current.add(parsed.rootGroup);
      robotGroupRef.current = parsed.rootGroup;

      // Calculate size and adjust camera
      const box = parsed.bounds;
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      // Adjust model position so bottom is touching the ground (y >= 0)
      if (box.min.y < 0) {
        parsed.rootGroup.position.y = -box.min.y;
      }

      setUrdfInfo({
        name: parsed.name,
        linksCount: parsed.linkNames.length,
        jointsCount: parsed.jointNames.length,
        size: `${size.x.toFixed(2)}m × ${size.y.toFixed(2)}m × ${size.z.toFixed(2)}m`,
      });

      // Frame camera onto model
      const maxDim = Math.max(size.x, size.y, size.z, 0.4);
      orbitState.current.target.set(center.x, Math.max(0.1, center.y - box.min.y), center.z);
      orbitState.current.radius = Math.max(1.2, maxDim * 2.4);
    } catch (err: any) {
      console.error('Error loading URDF in Viewport:', err);
    }
  }, [urdfContent]);

  // Wireframe toggle update
  useEffect(() => {
    if (!robotGroupRef.current) return;
    robotGroupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => ((m as any).wireframe = wireframeMode));
          } else {
            (mesh.material as any).wireframe = wireframeMode;
          }
        }
      }
    });
  }, [wireframeMode]);

  // Axes visibility toggle
  useEffect(() => {
    if (axesHelperRef.current) {
      axesHelperRef.current.visible = showAxes;
    }
  }, [showAxes]);

  // Render Loop & Orbit Camera Update
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let currentFps = 60;

    const animate = (currentTime: number) => {
      animId = requestAnimationFrame(animate);

      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      frameCount++;
      if (currentTime - lastFpsUpdate > 500) {
        currentFps = Math.round((frameCount * 1000) / (currentTime - lastFpsUpdate));
        frameCount = 0;
        lastFpsUpdate = currentTime;
      }

      // Camera Positioning: ORBIT CAMERA VIEW
      if (cameraRef.current) {
        const cam = cameraRef.current;
        const orb = orbitState.current;

        const cx = orb.target.x + orb.radius * Math.sin(orb.phi) * Math.sin(orb.theta);
        const cy = orb.target.y + orb.radius * Math.cos(orb.phi);
        const cz = orb.target.z + orb.radius * Math.sin(orb.phi) * Math.cos(orb.theta);
        cam.position.lerp(new THREE.Vector3(cx, Math.max(0.08, cy), cz), dt * 10);
        cam.lookAt(orb.target);
      }

      // Render Scene
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      // Send telemetry stats
      onUpdateTelemetry({
        posX: 0,
        posY: controlState.height,
        posZ: 0,
        roll: 0,
        pitch: controlState.pitch,
        yaw: controlState.yaw,
        linearVelocity: Math.sqrt(controlState.vx ** 2 + controlState.vy ** 2),
        angularVelocity: controlState.yaw,
        batteryPercent: 98.4,
        batteryVoltage: 28.6,
        motorTemps: [38, 39, 40, 39, 41, 40, 38, 39, 40, 39, 41, 40],
        jointAngles: [0, 0, 0],
        groundClearance: controlState.height,
        fps: currentFps,
        simTime: Number((currentTime / 1000).toFixed(1)),
        statusText: controlState.estop ? 'EMERGENCY STOP ENGAGED' : 'ONLINE - URDF LOADED',
      });
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [controlState, onUpdateTelemetry]);

  // Pointer / Mouse events for Orbit Navigation (Drag to Orbit, Right Drag to Pan, Wheel to Zoom)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    orbitState.current.isDragging = e.button === 0;
    orbitState.current.isPanning = e.button === 2 || e.shiftKey;
    orbitState.current.prevMouseX = e.clientX;
    orbitState.current.prevMouseY = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const orb = orbitState.current;
    if (!orb.isDragging && !orb.isPanning) return;

    const dx = e.clientX - orb.prevMouseX;
    const dy = e.clientY - orb.prevMouseY;
    orb.prevMouseX = e.clientX;
    orb.prevMouseY = e.clientY;

    if (orb.isPanning) {
      // Pan target
      const panSpeed = 0.002 * orb.radius;
      orb.target.x -= (Math.cos(orb.theta) * dx + Math.sin(orb.theta) * dy) * panSpeed;
      orb.target.z += (Math.sin(orb.theta) * dx - Math.cos(orb.theta) * dy) * panSpeed;
    } else {
      // Orbit
      orb.theta -= dx * 0.008;
      orb.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, orb.phi - dy * 0.008));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    orbitState.current.isDragging = false;
    orbitState.current.isPanning = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
    orbitState.current.radius = Math.max(0.4, Math.min(12, orbitState.current.radius * zoomFactor));
  };

  const isEstop = controlState.estop;

  return (
    <div
      ref={containerRef}
      id="mujoco-viewport-container"
      className="relative w-full h-full bg-[#0a0f0a] border-2 border-[#f59e0b] shadow-[0_0_20px_rgba(245,158,11,0.25)] overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        id="mujoco-3d-canvas"
        className="w-full h-full block cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />

      {/* TOP-LEFT OVERLAY: URDF Model Information & Telemetry HUD */}
      <div
        id="urdf-viewport-hud-info"
        className="absolute top-2 left-2 z-10 bg-[#0d140d]/90 border border-[#22c55e]/60 p-2 font-mono text-xs text-[#86efac] shadow-lg max-w-[280px]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#22c55e]/30 pb-1 mb-1.5">
          <div className="flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span className="font-bold text-[#fef08a] tracking-wider truncate">
              {urdfInfo.name}
            </span>
          </div>
          <span className="text-[9px] bg-[#22c55e]/20 text-[#4ade80] px-1 border border-[#22c55e]/40 font-bold">
            URDF 3D
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
          <div>
            LINKS: <strong className="text-[#fef08a]">{urdfInfo.linksCount}</strong>
          </div>
          <div>
            JOINTS: <strong className="text-[#fef08a]">{urdfInfo.jointsCount}</strong>
          </div>
          <div className="col-span-2 truncate">
            BOUNDS: <span className="text-[#fbbf24]">{urdfInfo.size}</span>
          </div>
        </div>
      </div>

      {/* TOP-RIGHT OVERLAY: Viewport Tools (Upload URDF, Reset View, Wireframe, Axes) */}
      <div
        id="urdf-viewport-tools"
        className="absolute top-2 right-2 z-10 flex items-center gap-1.5 font-mono text-xs"
      >
        {/* Upload / Switch URDF Button */}
        <button
          id="btn-open-urdf-modal"
          onClick={() => {
            playArcadeClick(600);
            onOpenUrdfModal();
          }}
          className="px-2.5 py-1.5 bg-[#f59e0b] hover:bg-[#fbbf24] text-[#0f140f] font-bold border border-[#fef08a] shadow-[0_0_10px_rgba(245,158,11,0.5)] flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>上传/切换 URDF</span>
        </button>

        {/* Reset Camera Button */}
        <button
          id="btn-reset-cam"
          onClick={handleResetCamera}
          title="Reset Orbit Camera"
          className="p-1.5 bg-[#141d14]/90 hover:bg-[#1f2d1f] text-[#86efac] hover:text-[#fef08a] border border-[#263024] hover:border-[#f59e0b] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Wireframe Toggle */}
        <button
          id="btn-toggle-wireframe"
          onClick={() => {
            playArcadeClick(440);
            setWireframeMode(!wireframeMode);
          }}
          title="Toggle Wireframe"
          className={`p-1.5 border transition-colors ${
            wireframeMode
              ? 'bg-[#22c55e]/30 text-[#4ade80] border-[#22c55e]'
              : 'bg-[#141d14]/90 text-[#86efac] border-[#263024] hover:border-[#f59e0b]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        {/* Axes Toggle */}
        <button
          id="btn-toggle-axes"
          onClick={() => {
            playArcadeClick(440);
            setShowAxes(!showAxes);
          }}
          title="Toggle Origin Axes"
          className={`p-1.5 border transition-colors ${
            showAxes
              ? 'bg-[#f59e0b]/30 text-[#fef08a] border-[#f59e0b]'
              : 'bg-[#141d14]/90 text-[#86efac] border-[#263024] hover:border-[#f59e0b]'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* BOTTOM-LEFT OVERLAY: Orbit Navigation Hints */}
      <div
        id="orbit-nav-hints"
        className="absolute bottom-2 left-2 z-10 bg-[#0d140d]/80 border border-[#263024] px-2 py-1 font-mono text-[9px] text-[#86efac]/80 pointer-events-none"
      >
        <span>鼠标左键拖拽旋转视角 | 右键/Shift拖拽平移 | 滚轮缩放</span>
      </div>

      {/* BOTTOM-RIGHT: EMERGENCY STOP (ESTOP) - Relocated to where Foot Contacts were */}
      <div id="estop-viewport-control" className="absolute bottom-2 right-2 z-10">
        <button
          id="btn-estop-viewport"
          onClick={onToggleEstop}
          className={`px-3 py-1.5 font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 border-2 transition-all active:scale-95 select-none ${
            isEstop
              ? 'bg-[#ef4444] text-white border-white shadow-[0_0_20px_#ef4444] animate-pulse'
              : 'bg-[#7f1d1d] hover:bg-[#991b1b] text-[#fca5a5] hover:text-white border-[#ef4444]/60 hover:border-[#ef4444]'
          }`}
        >
          <ShieldAlert className={`w-4 h-4 ${isEstop ? 'animate-spin' : ''}`} />
          <span>{isEstop ? 'ESTOP ACTIVE (急停生效)' : 'ESTOP (紧急停机)'}</span>
        </button>
      </div>
    </div>
  );
};
