import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  applyRobotAppearance,
  ROBOT_APPEARANCE_PRESET_NAMES,
  ROBOT_APPEARANCE_PRESETS,
} from './robotAppearance';

test('provides the original and four color appearance presets', () => {
  assert.deepEqual(ROBOT_APPEARANCE_PRESET_NAMES, [
    'original',
    'red_translucent',
    'green_translucent',
    'blue_translucent',
    'purple_translucent',
  ]);
  assert.deepEqual(ROBOT_APPEARANCE_PRESETS.original, {
    label: '原始',
    color: null,
    opacity: null,
    tintStrength: 0,
  });
  assert.deepEqual(
    ROBOT_APPEARANCE_PRESET_NAMES.slice(1).map((name) => ({
      color: ROBOT_APPEARANCE_PRESETS[name].color,
      opacity: ROBOT_APPEARANCE_PRESETS[name].opacity,
    })),
    [
      { color: '#ef4444', opacity: 0.45 },
      { color: '#22c55e', opacity: 0.45 },
      { color: '#3b82f6', opacity: 0.45 },
      { color: '#a855f7', opacity: 0.45 },
    ],
  );
});

test('applies tint and transparency to materials in a loaded robot tree', async () => {
  const primary = new THREE.MeshPhongMaterial({ color: '#808080' });
  const secondary = new THREE.MeshStandardMaterial({ color: '#ffffff' });
  const robot = new THREE.Group();
  robot.add(new THREE.Mesh(new THREE.BoxGeometry(), primary));
  robot.add(new THREE.Mesh(new THREE.BoxGeometry(), [primary, secondary]));

  await applyRobotAppearance(robot, 'red_translucent', {materialDelayMs: 0});

  assert.ok(primary.color.r > primary.color.g);
  assert.ok(primary.color.r > primary.color.b);
  assert.ok(secondary.color.r > secondary.color.g);
  for (const material of [primary, secondary]) {
    assert.equal(material.opacity, 0.45);
    assert.equal(material.transparent, true);
    assert.equal(material.depthWrite, false);
  }
});

test('updates unique materials one at a time', async () => {
  const first = new THREE.MeshPhongMaterial({color: '#808080'});
  const second = new THREE.MeshPhongMaterial({color: '#808080'});
  const robot = new THREE.Group();
  robot.add(new THREE.Mesh(new THREE.BoxGeometry(), first));
  robot.add(new THREE.Mesh(new THREE.BoxGeometry(), second));

  const applying = applyRobotAppearance(robot, 'purple_translucent', {
    materialDelayMs: 5,
  });

  assert.equal(first.opacity, 0.45);
  assert.equal(second.opacity, 1);

  await applying;
  assert.equal(second.opacity, 0.45);
});

test('leaves original robot materials untouched', async () => {
  const material = new THREE.MeshPhongMaterial({
    color: '#123456',
    opacity: 0.8,
    transparent: true,
    depthWrite: true,
  });
  const originalColor = material.color.getHex();
  const robot = new THREE.Mesh(new THREE.BoxGeometry(), material);

  await applyRobotAppearance(robot, 'original');

  assert.equal(material.color.getHex(), originalColor);
  assert.equal(material.opacity, 0.8);
  assert.equal(material.transparent, true);
  assert.equal(material.depthWrite, true);
});
