import test from 'node:test';
import assert from 'node:assert/strict';
import { TopicSubscriptionRegistry } from './topicSubscriptionRegistry';

test('reference-counts handlers that share a topic', () => {
  const registry = new TopicSubscriptionRegistry();
  const received: string[] = [];
  const first = (_topic: string, payload: string) => received.push(`first:${payload}`);
  const second = (_topic: string, payload: string) => received.push(`second:${payload}`);

  assert.equal(registry.add('robot/shared/motion', first), true);
  assert.equal(registry.add('robot/shared/motion', second), false);
  registry.dispatch('robot/shared/motion', 'frame');
  assert.deepEqual(received, ['first:frame', 'second:frame']);

  assert.equal(registry.remove('robot/shared/motion', first), false);
  assert.equal(registry.has('robot/shared/motion'), true);
  assert.equal(registry.remove('robot/shared/motion', second), true);
  assert.equal(registry.has('robot/shared/motion'), false);
});

test('routes independent topics to independent handlers', () => {
  const registry = new TopicSubscriptionRegistry();
  const received: string[] = [];
  registry.add('robot/a/motion', () => received.push('a'));
  registry.add('robot/b/motion', () => received.push('b'));

  registry.dispatch('robot/b/motion', '{}');
  assert.deepEqual(received, ['b']);
  assert.deepEqual(registry.topics().sort(), ['robot/a/motion', 'robot/b/motion']);
});
