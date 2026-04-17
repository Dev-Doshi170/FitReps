import { Image } from 'react-native';

function concatArrayBuffers(buffers) {
  let total = 0;
  for (const b of buffers) {
    total += b.byteLength;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const b of buffers) {
    out.set(new Uint8Array(b), offset);
    offset += b.byteLength;
  }
  return out.buffer;
}

/**
 * IOHandler that loads MoveNet graph weights from Metro-bundled .bin assets
 * (avoids @tensorflow/tfjs-react-native / TF Hub redirects on device).
 */
export function createBundledMoveNetIOHandler(modelJson, weightAssetIds) {
  return {
    load: async () => {
      const weightDataArray = await Promise.all(
        weightAssetIds.map(async assetId => {
          const source = Image.resolveAssetSource(assetId);
          if (source == null) {
            throw new Error('resolveAssetSource returned null for a weight asset');
          }
          const res = await fetch(source.uri);
          if (!res.ok) {
            throw new Error(
              `Failed to fetch weight bundle (${res.status}): ${source.uri}`,
            );
          }
          return res.arrayBuffer();
        }),
      );

      for (let i = 0; i < weightDataArray.length; i++) {
        const chunk = weightDataArray[i];
        if (!(chunk instanceof ArrayBuffer) || chunk.byteLength === 0) {
          throw new Error(`Invalid weight shard at index ${i}`);
        }
      }

      const manifest = modelJson.weightsManifest;
      if (!Array.isArray(manifest) || manifest.length === 0) {
        throw new Error('Invalid model.json: weightsManifest missing or empty');
      }
      const firstGroup = manifest[0];
      if (
        firstGroup == null ||
        !Array.isArray(firstGroup.weights) ||
        firstGroup.weights.length === 0
      ) {
        throw new Error('Invalid model.json: weight specs missing');
      }

      const modelArtifacts = { ...modelJson };
      modelArtifacts.weightSpecs = firstGroup.weights;
      delete modelArtifacts.weightManifest;
      modelArtifacts.weightData = concatArrayBuffers(weightDataArray);
      return modelArtifacts;
    },
  };
}
