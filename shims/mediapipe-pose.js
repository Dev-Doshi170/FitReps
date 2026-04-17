'use strict';

/**
 * Stub for @mediapipe/pose. @tensorflow-models/pose-detection loads all backends
 * from create_detector.js; Metro still resolves BlazePose MediaPipe even when
 * the app only uses MoveNet (see usePoseDetection.js).
 */
class Pose {
  constructor() {
    throw new Error(
      'BlazePose MediaPipe is not configured for React Native in this app. Use MoveNet.',
    );
  }
}

module.exports = { Pose };
