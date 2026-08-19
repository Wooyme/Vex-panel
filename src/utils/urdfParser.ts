import * as THREE from 'three';

export interface ParsedUrdfJoint {
  name: string;
  type: string;
  parent: string;
  child: string;
  origin: { xyz: [number, number, number]; rpy: [number, number, number] };
  axis: [number, number, number];
  limit?: { lower: number; upper: number; effort: number; velocity: number };
}

export interface ParsedUrdfLink {
  name: string;
  visualsCount: number;
}

export interface ParsedUrdfRobot {
  name: string;
  rootGroup: THREE.Group;
  links: Map<string, THREE.Group>;
  joints: Map<string, ParsedUrdfJoint>;
  linkNames: string[];
  jointNames: string[];
  bounds: THREE.Box3;
}

export function parseUrdfText(urdfText: string): ParsedUrdfRobot {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(urdfText, 'application/xml');

  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`URDF XML Parse Error: ${parserError.textContent}`);
  }

  const robotNode = xmlDoc.querySelector('robot');
  if (!robotNode) {
    throw new Error('Invalid URDF: missing root <robot> element');
  }

  const robotName = robotNode.getAttribute('name') || 'unnamed_robot';

  // Global materials map
  const materialsMap = new Map<string, THREE.Material>();
  const materialNodes = xmlDoc.querySelectorAll('robot > material');
  materialNodes.forEach((matNode) => {
    const matName = matNode.getAttribute('name');
    const colorNode = matNode.querySelector('color');
    if (matName && colorNode) {
      const rgbaStr = colorNode.getAttribute('rgba') || '0.8 0.8 0.8 1.0';
      const [r, g, b, a] = rgbaStr.split(/\s+/).map(Number);
      const color = new THREE.Color(r ?? 0.8, g ?? 0.8, b ?? 0.8);
      materialsMap.set(
        matName,
        new THREE.MeshStandardMaterial({
          color,
          opacity: a ?? 1.0,
          transparent: (a ?? 1.0) < 1.0,
          roughness: 0.35,
          metalness: 0.4,
        })
      );
    }
  });

  const links = new Map<string, THREE.Group>();
  const linkNodes = xmlDoc.querySelectorAll('robot > link');
  const linkNames: string[] = [];

  linkNodes.forEach((linkNode) => {
    const linkName = linkNode.getAttribute('name');
    if (!linkName) return;

    linkNames.push(linkName);
    const linkGroup = new THREE.Group();
    linkGroup.name = `link_${linkName}`;

    // Parse visuals
    const visualNodes = linkNode.querySelectorAll(':scope > visual');
    visualNodes.forEach((visNode) => {
      const originNode = visNode.querySelector('origin');
      let xyz: [number, number, number] = [0, 0, 0];
      let rpy: [number, number, number] = [0, 0, 0];

      if (originNode) {
        if (originNode.getAttribute('xyz')) {
          const parts = originNode.getAttribute('xyz')!.trim().split(/\s+/).map(Number);
          xyz = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
        }
        if (originNode.getAttribute('rpy')) {
          const parts = originNode.getAttribute('rpy')!.trim().split(/\s+/).map(Number);
          rpy = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
        }
      }

      // Material
      let meshMaterial: THREE.Material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x38a169),
        roughness: 0.4,
        metalness: 0.3,
      });

      const matNode = visNode.querySelector('material');
      if (matNode) {
        const matName = matNode.getAttribute('name');
        if (matName && materialsMap.has(matName)) {
          meshMaterial = materialsMap.get(matName)!.clone();
        } else {
          const colorNode = matNode.querySelector('color');
          if (colorNode) {
            const rgbaStr = colorNode.getAttribute('rgba') || '0.9 0.6 0.1 1.0';
            const [r, g, b, a] = rgbaStr.split(/\s+/).map(Number);
            meshMaterial = new THREE.MeshStandardMaterial({
              color: new THREE.Color(r ?? 0.9, g ?? 0.6, b ?? 0.1),
              opacity: a ?? 1.0,
              transparent: (a ?? 1.0) < 1.0,
              roughness: 0.35,
              metalness: 0.4,
            });
            if (matName) materialsMap.set(matName, meshMaterial);
          }
        }
      }

      // Geometry
      const geomNode = visNode.querySelector('geometry');
      let geometry: THREE.BufferGeometry | null = null;

      if (geomNode) {
        const boxNode = geomNode.querySelector('box');
        const cylNode = geomNode.querySelector('cylinder');
        const sphereNode = geomNode.querySelector('sphere');

        if (boxNode) {
          const sizeStr = boxNode.getAttribute('size') || '0.1 0.1 0.1';
          const [sx, sy, sz] = sizeStr.split(/\s+/).map(Number);
          geometry = new THREE.BoxGeometry(sx || 0.1, sy || 0.1, sz || 0.1);
        } else if (cylNode) {
          const len = Number(cylNode.getAttribute('length') || 0.2);
          const rad = Number(cylNode.getAttribute('radius') || 0.05);
          geometry = new THREE.CylinderGeometry(rad, rad, len, 24);
          // URDF cylinder axis is along Z; Three.js CylinderGeometry is along Y -> Rotate 90 deg around X
          geometry.rotateX(Math.PI / 2);
        } else if (sphereNode) {
          const rad = Number(sphereNode.getAttribute('radius') || 0.05);
          geometry = new THREE.SphereGeometry(rad, 24, 20);
        } else {
          // fallback placeholder box
          geometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        }
      } else {
        geometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
      }

      const visualMesh = new THREE.Mesh(geometry, meshMaterial);
      visualMesh.castShadow = true;
      visualMesh.receiveShadow = true;

      // Apply origin transform
      visualMesh.position.set(xyz[0], xyz[1], xyz[2]);
      const euler = new THREE.Euler(rpy[0], rpy[1], rpy[2], 'ZYX');
      visualMesh.quaternion.setFromEuler(euler);

      linkGroup.add(visualMesh);
    });

    links.set(linkName, linkGroup);
  });

  // Parse joints & build hierarchy
  const joints = new Map<string, ParsedUrdfJoint>();
  const jointNames: string[] = [];
  const jointNodes = xmlDoc.querySelectorAll('robot > joint');
  const childLinkNames = new Set<string>();

  jointNodes.forEach((jNode) => {
    const jName = jNode.getAttribute('name');
    const jType = jNode.getAttribute('type') || 'fixed';
    const parentNode = jNode.querySelector('parent');
    const childNode = jNode.querySelector('child');
    const originNode = jNode.querySelector('origin');
    const axisNode = jNode.querySelector('axis');
    const limitNode = jNode.querySelector('limit');

    if (!jName || !parentNode || !childNode) return;

    const parentName = parentNode.getAttribute('link') || '';
    const childName = childNode.getAttribute('link') || '';

    let xyz: [number, number, number] = [0, 0, 0];
    let rpy: [number, number, number] = [0, 0, 0];
    if (originNode) {
      if (originNode.getAttribute('xyz')) {
        const parts = originNode.getAttribute('xyz')!.trim().split(/\s+/).map(Number);
        xyz = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
      }
      if (originNode.getAttribute('rpy')) {
        const parts = originNode.getAttribute('rpy')!.trim().split(/\s+/).map(Number);
        rpy = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
      }
    }

    let axis: [number, number, number] = [1, 0, 0];
    if (axisNode && axisNode.getAttribute('xyz')) {
      const parts = axisNode.getAttribute('xyz')!.trim().split(/\s+/).map(Number);
      axis = [parts[0] || 1, parts[1] || 0, parts[2] || 0];
    }

    let limit;
    if (limitNode) {
      limit = {
        lower: Number(limitNode.getAttribute('lower') || -Math.PI),
        upper: Number(limitNode.getAttribute('upper') || Math.PI),
        effort: Number(limitNode.getAttribute('effort') || 10),
        velocity: Number(limitNode.getAttribute('velocity') || 5),
      };
    }

    const jointData: ParsedUrdfJoint = {
      name: jName,
      type: jType,
      parent: parentName,
      child: childName,
      origin: { xyz, rpy },
      axis,
      limit,
    };

    joints.set(jName, jointData);
    jointNames.push(jName);
    childLinkNames.add(childName);

    // Attach child link to parent link
    const parentGroup = links.get(parentName);
    const childGroup = links.get(childName);

    if (parentGroup && childGroup) {
      const jointAnchor = new THREE.Group();
      jointAnchor.name = `joint_${jName}`;
      jointAnchor.position.set(xyz[0], xyz[1], xyz[2]);
      const euler = new THREE.Euler(rpy[0], rpy[1], rpy[2], 'ZYX');
      jointAnchor.quaternion.setFromEuler(euler);

      jointAnchor.add(childGroup);
      parentGroup.add(jointAnchor);
    }
  });

  // Find root link (links not children of any joint)
  const rootGroup = new THREE.Group();
  rootGroup.name = `robot_${robotName}`;

  links.forEach((group, name) => {
    if (!childLinkNames.has(name)) {
      rootGroup.add(group);
    }
  });

  // Compute bounding box
  const bounds = new THREE.Box3().setFromObject(rootGroup);

  return {
    name: robotName,
    rootGroup,
    links,
    joints,
    linkNames,
    jointNames,
    bounds,
  };
}
