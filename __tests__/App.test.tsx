/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-native-vision-camera', () => ({
  // Accept lifecycle / debug props from CameraScreen without warnings.
  Camera: function VisionCameraMock() {
    return null;
  },
  useCameraDevice: () => ({ id: 'mock', name: 'mock', formats: [] }),
  useCameraFormat: () => undefined,
  useCameraPermission: () => ({
    hasPermission: true,
    requestPermission: jest.fn(),
  }),
  useFrameProcessor: () => jest.fn(),
  runAtTargetFps: (_fps: number, fn: () => void) => fn(),
}));

jest.mock('../src/hooks/usePoseDetection', () => ({
  usePoseDetection: () => ({
    detector: null,
    angle: 0,
    stage: 'up',
    counter: 0,
    tfReady: true,
    processFrame: jest.fn(),
    setCounter: jest.fn(),
  }),
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
  });
});
