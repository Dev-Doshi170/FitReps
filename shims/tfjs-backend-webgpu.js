'use strict';

/**
 * Stub for @tensorflow/tfjs-backend-webgpu. pose-detection pulls PoseNet ops
 * that reference WebGPU for backend checks; this app uses tfjs CPU only.
 */
function WebGPUBackend() {}

module.exports = { WebGPUBackend };
