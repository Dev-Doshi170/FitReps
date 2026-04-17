/**
 * Keypoint indices (MoveNet / COCO order).
 */
export const KP = {
  NOSE: 0,
  LEFT_EYE: 1,
  RIGHT_EYE: 2,
  LEFT_EAR: 3,
  RIGHT_EAR: 4,
  LEFT_SHOULDER: 5,
  RIGHT_SHOULDER: 6,
  LEFT_ELBOW: 7,
  RIGHT_ELBOW: 8,
  LEFT_WRIST: 9,
  RIGHT_WRIST: 10,
  LEFT_HIP: 11,
  RIGHT_HIP: 12,
  LEFT_KNEE: 13,
  RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,
  RIGHT_ANKLE: 16,
};

export type Keypoint = {
  x: number;
  y: number;
  score: number;
};

/** MoveNet / COCO-17 pairs for skeleton lines. */
export const SKELETON_CONNECTIONS = [
  [KP.LEFT_SHOULDER, KP.RIGHT_SHOULDER],
  [KP.LEFT_SHOULDER, KP.LEFT_ELBOW],
  [KP.LEFT_ELBOW, KP.LEFT_WRIST],
  [KP.RIGHT_SHOULDER, KP.RIGHT_ELBOW],
  [KP.RIGHT_ELBOW, KP.RIGHT_WRIST],
  [KP.LEFT_SHOULDER, KP.LEFT_HIP],
  [KP.RIGHT_SHOULDER, KP.RIGHT_HIP],
  [KP.LEFT_HIP, KP.RIGHT_HIP],
  [KP.LEFT_HIP, KP.LEFT_KNEE],
  [KP.LEFT_KNEE, KP.LEFT_ANKLE],
  [KP.RIGHT_HIP, KP.RIGHT_KNEE],
  [KP.RIGHT_KNEE, KP.RIGHT_ANKLE],
];

/**
 * Angle at point b between segments (a–b) and (c–b), in degrees [0, 180].
 */
export function calculateAngle(a: Keypoint, b: Keypoint, c: Keypoint): number {
  'worklet';
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
}

/**
 * Rep logic for squats:
 * - Down: Knee angle < 90
 * - Up: Knee angle > 160
 */
export function updateSquatCount(
  leftKneeAngle: number,
  rightKneeAngle: number,
  stage: string,
  counter: number
): { stage: string; counter: number } {
  'worklet';
  let nextStage = stage;
  let nextCounter = counter;

  // Average knee angle for better stability
  const avgAngle = (leftKneeAngle + rightKneeAngle) / 2;

  if (avgAngle < 100) {
    nextStage = 'down';
  }
  if (avgAngle > 160 && stage === 'down') {
    nextCounter = counter + 1;
    nextStage = 'up';
  }

  return { stage: nextStage, counter: nextCounter };
}

/**
 * Map normalized model output (0-1) to screen coordinates.
 */
export function mapNormalizedToView(
  x: number,
  y: number,
  viewWidth: number,
  viewHeight: number,
  mirrorX: boolean
): { x: number; y: number } {
  'worklet';
  let px = x * viewWidth;
  let py = y * viewHeight;
  
  if (mirrorX) {
    px = viewWidth - px;
  }
  
  return { x: px, y: py };
}
