import { useMemo, useState, useEffect } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { KP, Keypoint, calculateAngle, updateSquatCount } from '../utils/poseUtils';

export function usePoseDetection() {
  // Load MoveNet model
  const model = useTensorflowModel(require('../../assets/models/movenet.tflite'), 'core-ml');
  const tflite = model.model;

  // Shared values for high-performance updates (UI/Worklet thread)
  const keypoints = useSharedValue<Keypoint[]>([]);
  const counter = useSharedValue(0);
  const stage = useSharedValue('up');
  const angle = useSharedValue(0);

  // States for the JS UI (if needed for simple text displays)
  // We sync these periodically or use DerivedValues
  const [jsCounter, setJsCounter] = useState(0);
  const [jsStage, setJsStage] = useState('up');
  const [jsAngle, setJsAngle] = useState(0);

  const tfReady = model.state === 'loaded';
  const loadError = model.state === 'error' ? 'Failed to load TFLite model' : null;

  useEffect(() => {
    console.log('[usePoseDetection] Model state changed:', model.state);
    if (model.state === 'error') {
      console.error('[usePoseDetection] Model error:', model.error);
    }
  }, [model.state, model.error]);

  return {
    tflite,
    keypoints,
    counter,
    stage,
    angle,
    tfReady,
    loadError,
    setCounter: (val: number) => {
      counter.value = val;
      setJsCounter(val);
    },
    // For JS thread UI
    jsCounter,
    jsStage,
    jsAngle,
    setJsCounter,
    setJsStage,
    setJsAngle
  };
}
