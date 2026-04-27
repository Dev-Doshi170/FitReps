import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  NativeModules,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  type CameraRuntimeError,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
} from 'react-native-vision-camera';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import type { AppStackParamList } from '../navigation/AppNavigator';
import { hapticLight } from '../lib/haptics';
import { colors, fontFamily } from '../theme/theme';

const { TFLiteModule } = NativeModules;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── MoveNet keypoint names (index matches model output order) ─────────────
const KEYPOINT_NAMES = [
  'nose',           // 0
  'left_eye',       // 1
  'right_eye',      // 2
  'left_ear',       // 3
  'right_ear',      // 4
  'left_shoulder',  // 5
  'right_shoulder', // 6
  'left_elbow',     // 7
  'right_elbow',    // 8
  'left_wrist',     // 9
  'right_wrist',    // 10
  'left_hip',       // 11
  'right_hip',      // 12
  'left_knee',      // 13
  'right_knee',     // 14
  'left_ankle',     // 15
  'right_ankle',    // 16
];

// ─── Skeleton edges [fromIndex, toIndex] ──────────────────────────────────
const SKELETON_EDGES: [number, number][] = [
  [0, 1], [0, 2],           // nose → eyes
  [1, 3], [2, 4],           // eyes → ears
  [5, 6],                   // shoulders
  [5, 7], [7, 9],           // left arm
  [6, 8], [8, 10],          // right arm
  [5, 11], [6, 12],         // torso sides
  [11, 12],                 // hips
  [11, 13], [13, 15],       // left leg
  [12, 14], [14, 16],       // right leg
];

// ─── Aspect-ratio helpers ──────────────────────────────────────────────────
//
// iOS takePhoto() returns images in the sensor's native aspect ratio.
// Typical back camera portrait photo → width < height, usually 3:4 (0.75).
//
// The camera PREVIEW fills the entire screen (cover/fill).
// The keypoints are normalized 0-1 relative to the model input (192×192 square).
// We need to map them to the SAME coordinate space as the preview on screen.
//
// Strategy:
//   • Treat the preview as "aspect-fill" (resizeCover) → the photo is scaled
//     so its shorter dimension matches the screen, and the longer dimension
//     overflows (is cropped). No letterboxing.
//   • Compute the scale factor and the crop offsets so p.x / p.y map correctly.
//
// If your Camera component uses a different resizeMode, adjust accordingly.

const PHOTO_ASPECT_W = 3; // native photo aspect (width part) – confirm from logs
const PHOTO_ASPECT_H = 4; // native photo aspect (height part)
const PHOTO_W_OVER_H = PHOTO_ASPECT_W / PHOTO_ASPECT_H; // < 1 in portrait

// After cover-fill the rendered photo size inside the screen is:
let renderedPhotoW: number;
let renderedPhotoH: number;

if (SCREEN_W / SCREEN_H > PHOTO_W_OVER_H) {
  // Screen is wider than photo aspect → scale by width
  renderedPhotoW = SCREEN_W;
  renderedPhotoH = SCREEN_W / PHOTO_W_OVER_H;
} else {
  // Screen is taller than photo aspect → scale by height (most portrait phones)
  renderedPhotoH = SCREEN_H;
  renderedPhotoW = SCREEN_H * PHOTO_W_OVER_H;
}

// Offsets: how much of the rendered photo is outside the screen (cropped)
const cropOffsetX = (renderedPhotoW - SCREEN_W) / 2;
const cropOffsetY = (renderedPhotoH - SCREEN_H) / 2;

/**
 * Map a MoveNet normalized keypoint (0..1) to screen pixel coordinates,
 * accounting for the camera preview's cover-fill crop.
 */
function toScreen(xNorm: number, yNorm: number): { x: number; y: number } {
  const x = xNorm * renderedPhotoW - cropOffsetX;
  const y = yNorm * renderedPhotoH - cropOffsetY;
  return { x, y };
}

// ─────────────────────────────────────────────────────────────────────────────

interface Keypoint {
  x: number;   // normalized 0..1
  y: number;   // normalized 0..1
  score: number;
}

type FormTrackingNav = NativeStackNavigationProp<AppStackParamList, 'FormTracking'>;

export default function CameraScreen(): React.ReactElement {
  const navigation = useNavigation<FormTrackingNav>();
  const insets = useSafeAreaInsets();
  const device = useCameraDevice('back');

  const format = useCameraFormat(device, [
    { videoResolution: { width: 720, height: 1280 } },
    { fps: 30 },
  ]);

  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraError, setCameraError] = useState<string | null>(null);
  const cameraRef = useRef<Camera>(null);

  const [keypoints, setKeypoints] = useState<Keypoint[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const loopRef = useRef(false); // allows stopping the loop cleanly

  // ── Permissions ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  // ── Load model once ────────────────────────────────────────────────────
  useEffect(() => {
    TFLiteModule.loadModel()
      .then(() => console.log('✅ Model ready'))
      .catch((e: any) => console.error('❌ loadModel failed', e));
  }, []);

  const onCameraError = useCallback((err: CameraRuntimeError) => {
    console.error('Camera error:', err);
    setCameraError(err.message);
  }, []);

  // ── Inference loop ─────────────────────────────────────────────────────
  const startLoop = async () => {
    setIsRunning(true);
    loopRef.current = true;

    while (loopRef.current) {
      try {
        const photo = await cameraRef.current?.takePhoto();

        if (photo?.path) {
          const res: Keypoint[] = await TFLiteModule.runModelOnImage(photo.path);
          setKeypoints(res);
        }
      } catch (e) {
        console.log('❌ Inference error:', e);
      }

      // ~800 ms between frames – reduce for faster updates if device allows
      await new Promise<void>(resolve => setTimeout(resolve, 800));
    }
  };

  const stopLoop = () => {
    loopRef.current = false;
    setIsRunning(false);
    setKeypoints([]);
  };

  // ── Permission gate ────────────────────────────────────────────────────
  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        {navigation.canGoBack() && (
          <Pressable
            onPress={() => {
              hapticLight();
              navigation.goBack();
            }}
            style={[styles.permissionBack, { top: insets.top + 8 }]}>
            <Text style={styles.backLabel}>‹ BACK</Text>
          </Pressable>
        )}
        <Text style={styles.message}>Camera permission required</Text>
        <Pressable onPress={requestPermission} style={styles.permissionButton}>
          <Text style={styles.permissionText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Camera preview */}
      {device && (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          format={format}
          isActive={true}
          photo={true}
          onError={onCameraError}
        />
      )}

      {/* Skeleton + keypoint overlay */}
      <Svg style={StyleSheet.absoluteFill}>

        {/* Skeleton edges */}
        {SKELETON_EDGES.map(([fromIdx, toIdx], edgeIdx) => {
          const from = keypoints[fromIdx];
          const to   = keypoints[toIdx];

          if (!from || !to) return null;
          if (from.score < 0.3 || to.score < 0.3) return null;

          const { x: x1, y: y1 } = toScreen(from.x, from.y);
          const { x: x2, y: y2 } = toScreen(to.x, to.y);

          return (
            <Line
              key={`edge-${edgeIdx}`}
              x1={x1} y1={y1}
              x2={x2} y2={y2}
              stroke="#00ECA0"
              strokeWidth={2}
              strokeOpacity={0.85}
            />
          );
        })}

        {/* Keypoint dots */}
        {keypoints.map((p, i) => {
          if (p.score < 0.3) return null;   // skip low-confidence points

          const { x, y } = toScreen(p.x, p.y);

          return (
            <React.Fragment key={`kp-${i}`}>
              {/* Outer ring */}
              <Circle cx={x} cy={y} r={8} fill="none" stroke="#00ECA0" strokeWidth={2} />
              {/* Inner dot */}
              <Circle cx={x} cy={y} r={4} fill="red" />
              {/* Label */}
              <SvgText
                x={x + 10}
                y={y - 8}
                fontSize="9"
                fill="white"
                fontWeight="bold"
              >
                {KEYPOINT_NAMES[i]}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>

      <View
        style={[styles.chrome, { paddingTop: insets.top }]}
        pointerEvents="box-none">
        {navigation.canGoBack() && (
          <Pressable
            onPress={() => {
              hapticLight();
              navigation.goBack();
            }}
            style={styles.backRow}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back">
            <Text style={styles.backLabel}>‹ BACK</Text>
          </Pressable>
        )}
      </View>

      {/* Debug info */}
      <View style={[styles.debugBadge, { top: insets.top + 44 }]}>
        <Text style={styles.debugText}>
          {`Screen: ${SCREEN_W.toFixed(0)}×${SCREEN_H.toFixed(0)}\n`}
          {`Photo rendered: ${renderedPhotoW.toFixed(0)}×${renderedPhotoH.toFixed(0)}\n`}
          {`Crop offset: (${cropOffsetX.toFixed(0)}, ${cropOffsetY.toFixed(0)})`}
        </Text>
      </View>

      {/* START / STOP button */}
      <Pressable
        style={[
          styles.button,
          isRunning && styles.buttonStop,
          { bottom: 24 + insets.bottom },
        ]}
        onPress={isRunning ? stopLoop : startLoop}
      >
        <Text style={styles.buttonText}>{isRunning ? '⏹ STOP' : '▶ START'}</Text>
      </Pressable>

      {/* Camera error */}
      {cameraError && (
        <Text style={styles.errorText}>{cameraError}</Text>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'black',
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },

  message: {
    color: 'white',
    fontSize: 16,
    marginBottom: 16,
  },

  permissionButton: {
    backgroundColor: '#00ECA0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  permissionText: {
    color: 'black',
    fontWeight: 'bold',
  },

  chrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 4,
  },
  backRow: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    alignSelf: 'flex-start',
  },
  backLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    letterSpacing: 2,
    color: colors.accent,
  },
  button: {
    position: 'absolute',
    zIndex: 2,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#00ECA0',
  },

  buttonStop: {
    borderColor: '#FF4444',
  },

  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 1,
  },

  debugBadge: {
    position: 'absolute',
    left: 12,
    zIndex: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 8,
    borderRadius: 6,
  },

  debugText: {
    color: '#00ECA0',
    fontSize: 10,
    fontFamily: 'Menlo',
  },

  permissionBack: {
    position: 'absolute',
    left: 12,
  },
  errorText: {
    color: 'red',
    position: 'absolute',
    top: 120,
    zIndex: 2,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 4,
  },
});