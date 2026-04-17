/**
 * TensorFlow.js expects env().platform to exist (now, fetch, encode/decode, isTypedArray).
 * In React Native it is unset unless @tensorflow/tfjs-react-native is loaded (which pulls expo-gl).
 * Register a minimal platform so bundled MoveNet and CPU backend work on device.
 */
import { Buffer } from 'buffer';
import { env } from '@tensorflow/tfjs-core';

class ReactNativeTfjsPlatform {
  isTypedArray(a) {
    return (
      a instanceof Float32Array ||
      a instanceof Int32Array ||
      a instanceof Uint8Array ||
      a instanceof Uint8ClampedArray
    );
  }

  fetch(path, requestInits) {
    return fetch(path, requestInits);
  }

  now() {
    const perf = globalThis.performance;
    if (perf != null && typeof perf.now === 'function') {
      return perf.now();
    }
    return Date.now();
  }

  encode(text, encoding = 'utf-8') {
    encoding = encoding || 'utf-8';
    if (encoding === 'utf-16' || encoding === 'utf16le') {
      return new Uint8Array(Buffer.from(text, 'utf16le'));
    }
    if (encoding !== 'utf-8' && encoding !== 'utf8') {
      throw new Error(`Unsupported encoding: ${encoding}`);
    }
    return new TextEncoder().encode(text);
  }

  decode(bytes, encoding = 'utf-8') {
    encoding = encoding || 'utf-8';
    if (encoding === 'utf-16' || encoding === 'utf16le') {
      return Buffer.from(bytes).toString('utf16le');
    }
    if (encoding !== 'utf-8' && encoding !== 'utf8') {
      throw new Error(`Unsupported encoding: ${encoding}`);
    }
    return new TextDecoder(encoding).decode(bytes);
  }
}

if (globalThis.Buffer == null) {
  globalThis.Buffer = Buffer;
}

const tfEnv = env();
if (tfEnv.platform == null) {
  tfEnv.setPlatform('react-native', new ReactNativeTfjsPlatform());
}
