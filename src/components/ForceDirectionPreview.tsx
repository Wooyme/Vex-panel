import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ForceDirection, normalizeForceDirection } from '../utils/forces';

interface PreviewForce {
  id: number;
  color: string;
  direction: ForceDirection;
}

function disposeGroup(group: THREE.Object3D) {
  group.traverse((object) => {
    const drawable = object as THREE.Mesh;
    drawable.geometry?.dispose();
    const materials = Array.isArray(drawable.material) ? drawable.material : [drawable.material];
    materials.forEach((material) => {
      if (!material) return;
      (material as THREE.SpriteMaterial).map?.dispose();
      material.dispose();
    });
  });
  group.clear();
}

function label(text: string, color: string, position: THREE.Vector3) {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 80;
  const context = canvas.getContext('2d')!;
  context.fillStyle = 'rgba(255,255,255,0.92)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = 'bold 42px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = color;
  context.fillText(text, 80, 40);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.position.copy(position);
  sprite.scale.set(0.5, 0.25, 1);
  return sprite;
}

export function ForceDirectionPreview({ forces, selectedId }: {
  forces: PreviewForce[];
  selectedId: number | null;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ arrows: THREE.Group; reset: () => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const mount = mountRef.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setError('无法创建 3D 预览，请检查浏览器 WebGL 支持。仍可编辑并发送指令。');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor('#f8fafc');
    mount.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', '世界坐标系外力方向预览，Z 轴向上');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
    camera.up.set(0, 0, 1);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 12;
    const reset = () => {
      camera.position.set(4, -6, 4);
      controls.target.set(0, 0, 0);
      controls.update();
    };
    reset();
    const grid = new THREE.GridHelper(4, 8, '#94a3b8', '#e2e8f0');
    grid.rotation.x = Math.PI / 2;
    scene.add(grid, new THREE.AxesHelper(2));
    scene.add(label('+X', '#b91c1c', new THREE.Vector3(2.25, 0, 0)));
    scene.add(label('+Y', '#15803d', new THREE.Vector3(0, 2.25, 0)));
    scene.add(label('+Z', '#1d4ed8', new THREE.Vector3(0, 0, 2.25)));
    const arrows = new THREE.Group();
    scene.add(arrows);
    sceneRef.current = { arrows, reset };
    const resize = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resize.observe(mount);
    let frame = 0;
    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();
    setReady(true);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      controls.dispose();
      disposeGroup(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const arrows = sceneRef.current?.arrows;
    if (!arrows) return;
    disposeGroup(arrows);
    forces.forEach((force) => {
      let direction: THREE.Vector3;
      try {
        direction = new THREE.Vector3(...normalizeForceDirection(force.direction));
      } catch {
        return; // Incomplete drafts must never introduce NaNs into the renderer.
      }
      const selected = force.id === selectedId;
      const arrow = new THREE.ArrowHelper(direction, new THREE.Vector3(), 1.5,
        force.color, selected ? 0.28 : 0.2, selected ? 0.16 : 0.1);
      [arrow.line.material, arrow.cone.material].flat().forEach((material) => {
        material.transparent = true;
        material.opacity = selected ? 1 : 0.45;
      });
      arrows.add(arrow);
      if (selected) arrows.add(label(`#${force.id}`, force.color, direction.clone().multiplyScalar(1.8)));
    });
  }, [forces, selectedId, ready]);

  return (
    <div className="overflow-hidden border border-slate-200 bg-slate-50">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-2 py-1 text-sm">
        <span className="font-bold text-slate-800">世界坐标 · Z 向上</span>
        <button type="button" onClick={() => sceneRef.current?.reset()} className="text-red-700 underline underline-offset-4">重置视角</button>
      </div>
      <div className="relative">
        <div ref={mountRef} className="h-[140px] w-full touch-none" />
        {error && <p role="alert" className="absolute inset-0 flex items-center bg-slate-50 p-6 text-sm text-red-700">{error}</p>}
      </div>
      <p className="px-2 py-1 text-xs text-slate-500">拖动旋转 · 滚轮缩放 · 等长箭头表示方向</p>
    </div>
  );
}
