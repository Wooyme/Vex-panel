import { MqttTopicHandler } from '../types/robot';

export class TopicSubscriptionRegistry {
  private handlers = new Map<string, Set<MqttTopicHandler>>();

  add(topic: string, handler: MqttTopicHandler): boolean {
    const existing = this.handlers.get(topic);
    if (existing) {
      existing.add(handler);
      return false;
    }
    this.handlers.set(topic, new Set([handler]));
    return true;
  }

  remove(topic: string, handler: MqttTopicHandler): boolean {
    const existing = this.handlers.get(topic);
    if (!existing) return false;
    existing.delete(handler);
    if (existing.size > 0) return false;
    this.handlers.delete(topic);
    return true;
  }

  dispatch(topic: string, payload: string): void {
    this.handlers.get(topic)?.forEach((handler) => handler(topic, payload));
  }

  topics(): string[] {
    return [...this.handlers.keys()];
  }

  has(topic: string): boolean {
    return this.handlers.has(topic);
  }
}
