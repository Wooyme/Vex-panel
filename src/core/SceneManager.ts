import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader.js';
import URDFLoader, {URDFRobot} from 'urdf-loader';
import {
  RobotAppearancePreset,
  RobotInstanceConfig,
  RobotMotionMessage,
} from '../types/robot';
import {applyRobotMotionFrame} from '../utils/motion';
import {applyRobotAppearance} from '../utils/robotAppearance';

interface SceneManagerEvents {
  onFps?: (fps: number) => void;
  onRobotError?: (instanceId: string, message: string) => void;
  onRobotTransformationStart?: (
    instanceId: string,
    preset: RobotAppearancePreset,
  ) => void;
  onRobotTransformationEnd?: (instanceId: string) => void;
}

interface RobotSceneEntry {
  robot: URDFRobot;
  appearanceController: AbortController;
}

function disposeMaterial(material: THREE.Material): void {
  Object.values(material).forEach((value) => {
    if (value instanceof THREE.Texture) value.dispose();
  });
  material.dispose();
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(disposeMaterial);
    } else if (mesh.material) {
      disposeMaterial(mesh.material);
    }
  });
}

export class SceneManager {
  private readonly container: HTMLElement;
  private readonly scene = new THREE.Scene();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly grid: THREE.GridHelper;
  private readonly robots = new Map<string, RobotSceneEntry>();
  private readonly events: SceneManagerEvents;
  private activeTerrain: THREE.Group | null = null;
  private terrainLoadGeneration = 0;
  private animationFrameId = 0;
  private disposed = false;
  private frameCount = 0;
  private fpsStartedAt = performance.now();

  constructor(container: HTMLElement, events: SceneManagerEvents = {}) {
    this.container = container;
    this.events = events;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    this.scene.background = new THREE.Color(0xf8fafc);
    this.scene.fog = new THREE.FogExp2(0xf8fafc, 0.025);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(4, -4, 3);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(0, 0, 0.4);
    this.controls.update();

    this.grid = new THREE.GridHelper(30, 60, 0xdc2626, 0xd1d5db);
    this.grid.rotateX(Math.PI / 2);
    this.grid.position.z = -0.001;
    this.scene.add(this.grid);

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.15));

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
    mainLight.position.set(6, -5, 10);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xfca5a5, 0.7);
    fillLight.position.set(-5, 4, 3);
    this.scene.add(fillLight);

    this.startRenderLoop();
  }

  private startRenderLoop = (): void => {
    if (this.disposed) return;
    this.animationFrameId = requestAnimationFrame(this.startRenderLoop);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    this.frameCount += 1;
    const now = performance.now();
    if (now - this.fpsStartedAt >= 1000) {
      this.events.onFps?.(Math.round((this.frameCount * 1000) / (now - this.fpsStartedAt)));
      this.frameCount = 0;
      this.fpsStartedAt = now;
    }
  };

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  async addRobot(config: RobotInstanceConfig): Promise<void> {
    this.removeRobot(config.id);

    const loadingManager = new THREE.LoadingManager();
    loadingManager.onError = (url) => {
      this.events.onRobotError?.(config.id, `Failed to load mesh: ${url}`);
    };

    const loader = new URDFLoader(loadingManager);
    const robot = await loader.loadAsync(config.urdfPath);
    robot.name = config.name;
    const appearanceController = new AbortController();
    this.robots.set(config.id, {robot, appearanceController});
    this.scene.add(robot);

    if (config.appearancePreset !== 'original') {
      this.events.onRobotTransformationStart?.(config.id, config.appearancePreset);
      try {
        await applyRobotAppearance(robot, config.appearancePreset, {
          initialDelayMs: 500,
          signal: appearanceController.signal,
        });
      } finally {
        this.events.onRobotTransformationEnd?.(config.id);
      }
    }
  }

  async loadTerrain(path: string): Promise<void> {
    const generation = ++this.terrainLoadGeneration;
    const terrain = await new OBJLoader().loadAsync(path);
    if (this.disposed || generation !== this.terrainLoadGeneration) {
      disposeObject(terrain);
      return;
    }

    if (this.activeTerrain) {
      this.scene.remove(this.activeTerrain);
      disposeObject(this.activeTerrain);
    }
    this.activeTerrain = terrain;
    this.scene.add(terrain);
  }

  clearTerrain(): void {
    this.terrainLoadGeneration += 1;
    if (!this.activeTerrain) return;
    this.scene.remove(this.activeTerrain);
    disposeObject(this.activeTerrain);
    this.activeTerrain = null;
  }

  removeRobot(instanceId: string): void {
    const entry = this.robots.get(instanceId);
    if (!entry) return;
    entry.appearanceController.abort();
    this.scene.remove(entry.robot);
    disposeObject(entry.robot);
    this.robots.delete(instanceId);
  }

  clearRobots(): void {
    [...this.robots.keys()].forEach((instanceId) => this.removeRobot(instanceId));
  }

  applyMotion(instanceId: string, motion: RobotMotionMessage): string[] {
    const entry = this.robots.get(instanceId);
    if (!entry) return [`Robot instance not found: ${instanceId}`];
    return applyRobotMotionFrame(entry.robot, motion);
  }

  focusRobot(instanceId: string): void {
    const entry = this.robots.get(instanceId);
    if (!entry) return;
    this.frameBounds(new THREE.Box3().setFromObject(entry.robot));
  }

  private frameBounds(bounds: THREE.Box3): void {
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z, 0.5) * 1.8;
    this.controls.target.copy(center);
    this.camera.position.set(
      center.x + radius,
      center.y - radius,
      center.z + radius * 0.75,
    );
    this.camera.near = Math.max(radius / 1000, 0.01);
    this.camera.far = Math.max(radius * 100, 100);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animationFrameId);
    this.controls.dispose();
    this.clearRobots();
    this.clearTerrain();
    this.grid.geometry.dispose();
    disposeMaterial(this.grid.material as THREE.Material);
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
