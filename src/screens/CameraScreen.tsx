import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import {
  Camera,
  type CameraProps,
  type CameraRuntimeError,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
  useFrameProcessor,
  type Frame,
} from 'react-native-vision-camera';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { PoseOverlay } from '../components/PoseOverlay';
import { KP, calculateAngle, updateSquatCount } from '../utils/poseUtils';

export default function CameraScreen(): React.ReactElement {
  const device = useCameraDevice('front');
  const format = useCameraFormat(device, [
    { videoResolution: { width: 1280, height: 720 } },
    { fps: 30 },
  ]);
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraError, setCameraError] = useState<string | null>(null);

  const {
    tflite,
    keypoints,
    counter,
    stage,
    angle,
    tfReady,
    loadError,
    setCounter,
    jsCounter,
    setJsCounter,
    setJsStage,
    setJsAngle,
    jsStage,
    jsAngle
  } = usePoseDetection();

  const { resize } = useResizePlugin();

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const onCameraError = useCallback((err: CameraRuntimeError) => {
    console.error('[CameraScreen] onError', err);
    setCameraError(err.message);
  }, []);

  // Frame Processor: Runs on the UI/Worklet thread
  const frameProcessor = useFrameProcessor(
    (frame: Frame) => {
      'worklet';
      if (!tflite || !tfReady) return;

      try {
        // 1. Resize for MoveNet (192x192 RGB)
        const resized = resize(frame, {
          scale: { width: 192, height: 192 },
          pixelFormat: 'rgb',
          dataType: 'uint8',
        });

        const inputBuffer =
          resized.byteOffset === 0 &&
          resized.byteLength === resized.buffer.byteLength
            ? resized.buffer
            : resized.buffer.slice(
                resized.byteOffset,
                resized.byteOffset + resized.byteLength
              );

        const result = tflite.runSync([inputBuffer]);

        if (!result || result.length === 0) return;

        // MoveNet Output is [1, 1, 17, 3] -> [y, x, score]
        const data = new Float32Array(result[0]);
        const nextKeypoints = [];

        for (let i = 0; i < 17; i++) {
          const baseIdx = i * 3;
          nextKeypoints.push({
            y: data[baseIdx],
            x: data[baseIdx + 1],
            score: data[baseIdx + 2],
          });
        }

        keypoints.value = nextKeypoints;

        // 2. Logic: Squat Detection
        const lHip = nextKeypoints[KP.LEFT_HIP];
        const lKnee = nextKeypoints[KP.LEFT_KNEE];
        const lAnkle = nextKeypoints[KP.LEFT_ANKLE];

        const rHip = nextKeypoints[KP.RIGHT_HIP];
        const rKnee = nextKeypoints[KP.RIGHT_KNEE];
        const rAnkle = nextKeypoints[KP.RIGHT_ANKLE];

        if (lHip && lKnee && lAnkle && rHip && rKnee && rAnkle) {
          const lAngle = calculateAngle(lHip, lKnee, lAnkle);
          const rAngle = calculateAngle(rHip, rKnee, rAnkle);
          const avgAngle = (lAngle + rAngle) / 2;
          
          angle.value = avgAngle;

          const { stage: nextStage, counter: nextCounter } = updateSquatCount(
            lAngle,
            rAngle,
            stage.value,
            counter.value
          );

          if (nextCounter !== counter.value) {
            counter.value = nextCounter;
            runOnJS(setJsCounter)(nextCounter);
          }
          if (nextStage !== stage.value) {
            stage.value = nextStage;
            runOnJS(setJsStage)(nextStage);
          }
          runOnJS(setJsAngle)(Math.round(avgAngle));
        }
      } catch (e) {
        console.error('Inference error:', e);
      }
    },
    [tflite, tfReady, resize, keypoints, counter, stage, angle, setJsCounter, setJsStage, setJsAngle]
  );

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Camera permission is required.</Text>
        <Pressable onPress={requestPermission} style={styles.permissionButton}>
          <Text style={styles.label}>Grant permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {device && (
        <View style={styles.cameraHost}>
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            format={format}
            isActive={true}
            pixelFormat="rgb"
            frameProcessor={frameProcessor}
            onError={onCameraError}
          />
          <PoseOverlay keypoints={keypoints} mirrorX={device.position === 'front'} />
        </View>
      )}

      {/* HUD Overlay */}
      <View style={styles.hudTop} pointerEvents="none">
        <Text style={styles.counterText}>{jsCounter}</Text>
        <Text style={styles.stageText}>{jsStage.toUpperCase()}</Text>
      </View>

      <View style={styles.hudBottom} pointerEvents="box-none">
        <Text style={styles.angleText}>{jsAngle}°</Text>
        <Pressable onPress={() => setCounter(0)} style={styles.resetButton}>
          <Text style={styles.resetText}>RESET</Text>
        </Pressable>
      </View>

      {!tfReady && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#00ECA0" />
          <Text style={styles.loadingText}>Initializing MoveNet...</Text>
        </View>
      )}

      {cameraError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{cameraError}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraHost: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  message: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
  },
  permissionButton: {
    padding: 16,
    backgroundColor: '#00ECA0',
    borderRadius: 8,
  },
  label: {
    color: 'black',
    fontWeight: 'bold',
  },
  hudTop: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  counterText: {
    fontSize: 84,
    fontWeight: '900',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  stageText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ECA0',
    marginTop: -10,
  },
  hudBottom: {
    position: 'absolute',
    bottom: 50,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  angleText: {
    fontSize: 32,
    color: 'white',
    fontWeight: '600',
  },
  resetButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'white',
  },
  resetText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loading: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 16,
  },
  errorBanner: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,0,0,0.8)',
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
  },
});
