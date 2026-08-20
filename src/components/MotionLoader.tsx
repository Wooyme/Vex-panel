import React, { useEffect, useRef } from 'react';
import { SceneManager } from '../core/SceneManager';
import {
  RobotInstanceConfig,
  RobotMotionMessage,
  RobotMotionStatus,
  SubscribeMqttTopic,
} from '../types/robot';
import {
  applyFallbackBasePose,
  parseRobotMotionMessage,
} from '../utils/motion';

interface MotionLoaderProps {
  sceneManager: SceneManager;
  instances: RobotInstanceConfig[];
  subscribeTopic: SubscribeMqttTopic;
  onStatusChange: (
    instanceId: string,
    status: RobotMotionStatus,
    message?: string,
  ) => void;
}

interface MotionInstanceBindingProps extends Omit<MotionLoaderProps, 'instances'> {
  instance: RobotInstanceConfig;
}

const MotionInstanceBinding: React.FC<MotionInstanceBindingProps> = ({
  sceneManager,
  instance,
  subscribeTopic,
  onStatusChange,
}) => {
  const statusSignatureRef = useRef('');
  const warningsRef = useRef(new Set<string>());
  const latestFallbackMotionRef = useRef<RobotMotionMessage | null>(null);
  const latestPrimaryMotionRef = useRef<RobotMotionMessage | null>(null);

  useEffect(() => {
    statusSignatureRef.current = 'waiting:';
    warningsRef.current.clear();
    latestFallbackMotionRef.current = null;
    latestPrimaryMotionRef.current = null;

    const emitStatus = (status: RobotMotionStatus, message?: string) => {
      const signature = `${status}:${message ?? ''}`;
      if (statusSignatureRef.current === signature) return;
      statusSignatureRef.current = signature;
      onStatusChange(instance.id, status, message);
    };

    const applyLatestPrimaryMotion = () => {
      if (!latestPrimaryMotionRef.current) return;
      const motion = applyFallbackBasePose(
        latestPrimaryMotionRef.current,
        latestFallbackMotionRef.current,
        Boolean(instance.forceFallbackBasePose),
      );
      const warnings = sceneManager.applyMotion(instance.id, motion);
      warnings.forEach((warning) => {
        if (warningsRef.current.has(warning)) return;
        warningsRef.current.add(warning);
        console.warn(`[MotionLoader] ${instance.name}: ${warning}`);
      });
      emitStatus('live');
    };

    const unsubscribeFallback = instance.fallbackMotionTopic
      ? subscribeTopic(instance.fallbackMotionTopic, (_topic, payload) => {
          try {
            const fallbackMotion = parseRobotMotionMessage(payload);
            latestFallbackMotionRef.current = fallbackMotion;
            applyLatestPrimaryMotion();
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            emitStatus('error', `Fallback topic: ${message}`);
          }
        })
      : () => {};

    const unsubscribePrimary = subscribeTopic(instance.motionTopic, (_topic, payload) => {
      try {
        latestPrimaryMotionRef.current = parseRobotMotionMessage(payload);
        applyLatestPrimaryMotion();
      } catch (error) {
        latestPrimaryMotionRef.current = null;
        const message = error instanceof Error ? error.message : String(error);
        emitStatus('error', message);
      }
    });

    return () => {
      unsubscribePrimary();
      unsubscribeFallback();
    };
  }, [
    instance.fallbackMotionTopic,
    instance.forceFallbackBasePose,
    instance.id,
    instance.motionTopic,
    instance.name,
    onStatusChange,
    sceneManager,
    subscribeTopic,
  ]);

  return null;
};

export const MotionLoader: React.FC<MotionLoaderProps> = ({
  sceneManager,
  instances,
  subscribeTopic,
  onStatusChange,
}) => (
  <>
    {instances.map((instance) => (
      <MotionInstanceBinding
        key={instance.id}
        sceneManager={sceneManager}
        instance={instance}
        subscribeTopic={subscribeTopic}
        onStatusChange={onStatusChange}
      />
    ))}
  </>
);
