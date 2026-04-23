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

test('renders correctly', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
  });
});
