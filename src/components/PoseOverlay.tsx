import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Canvas, Circle, Line, Group, Paint } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import { KP, Keypoint, SKELETON_CONNECTIONS, mapNormalizedToView } from '../utils/poseUtils';

interface PoseOverlayProps {
  keypoints: SharedValue<Keypoint[]>;
  mirrorX: boolean;
}

export const PoseOverlay: React.FC<PoseOverlayProps> = ({ keypoints, mirrorX }) => {
  const { width, height } = useWindowDimensions();

  // Helper to map a keypoint from normalized to screen coordinates
  const mapPt = (idx: number) => {
    'worklet';
    const kp = keypoints.value[idx];
    if (!kp || kp.score < 0.3) return null;
    return mapNormalizedToView(kp.x, kp.y, width, height, mirrorX);
  };

  const skeletonLines = useDerivedValue(() => {
    return SKELETON_CONNECTIONS.map(([a, b], i) => {
      const p1 = mapPt(a);
      const p2 = mapPt(b);
      if (!p1 || !p2) return null;
      return (
        <Line
          key={`line-${i}`}
          p1={{ x: p1.x, y: p1.y }}
          p2={{ x: p2.x, y: p2.y }}
          color="#00ECA0"
          strokeWidth={4}
        />
      );
    }).filter(Boolean);
  });

  const dots = useDerivedValue(() => {
    return keypoints.value.map((kp, i) => {
      if (kp.score < 0.3) return null;
      const p = mapNormalizedToView(kp.x, kp.y, width, height, mirrorX);
      return (
        <Circle
          key={`dot-${i}`}
          cx={p.x}
          cy={p.y}
          r={6}
          color="#FFE646"
        />
      );
    }).filter(Boolean);
  });

  return (
    <Canvas style={[StyleSheet.absoluteFill, styles.canvas]} pointerEvents="none">
      <Group opacity={0.8}>
        {skeletonLines.value}
        {dots.value}
      </Group>
    </Canvas>
  );
};

const styles = StyleSheet.create({
  canvas: {
    zIndex: 10,
  },
});
