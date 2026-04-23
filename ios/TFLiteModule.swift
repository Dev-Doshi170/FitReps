import Foundation
import TensorFlowLite
import UIKit
import React

@objc(TFLiteModule)
class TFLiteModule: NSObject {

  var interpreter: Interpreter?

  // MARK: - Orientation Fix Helper
  /// Redraws the image respecting its EXIF orientation so MoveNet always
  /// receives an upright frame (otherwise keypoints are rotated).
  private func fixedOrientationImage(_ image: UIImage) -> UIImage {
    guard image.imageOrientation != .up else { return image }

    UIGraphicsBeginImageContextWithOptions(image.size, false, image.scale)
    image.draw(in: CGRect(origin: .zero, size: image.size))
    let normalized = UIGraphicsGetImageFromCurrentImageContext() ?? image
    UIGraphicsEndImageContext()
    return normalized
  }

  // MARK: - Load Model
  @objc
  func loadModel(_ resolve: RCTPromiseResolveBlock,
                 rejecter reject: RCTPromiseRejectBlock) {

    do {
      guard let modelPath = Bundle.main.path(forResource: "movenet", ofType: "tflite") else {
        reject("MODEL_NOT_FOUND", "movenet.tflite not found in bundle", nil)
        return
      }

      interpreter = try Interpreter(modelPath: modelPath)
      try interpreter?.allocateTensors()

      print("✅ MoveNet model loaded successfully")
      resolve("Model loaded")

    } catch {
      print("❌ loadModel error: \(error)")
      reject("LOAD_ERROR", "Failed to load model: \(error.localizedDescription)", error)
    }
  }

  // MARK: - Run Inference
  @objc
  func runModelOnImage(_ imagePath: String,
                       resolver resolve: RCTPromiseResolveBlock,
                       rejecter reject: RCTPromiseRejectBlock) {

    do {
      guard let interpreter = interpreter else {
        reject("NO_MODEL", "Model not loaded – call loadModel first", nil)
        return
      }

      // ── 1. Load image ────────────────────────────────────────────────────
      let cleanPath = imagePath.replacingOccurrences(of: "file://", with: "")

      guard let rawImage = UIImage(contentsOfFile: cleanPath) else {
        reject("IMAGE_ERROR", "Could not load image at path: \(cleanPath)", nil)
        return
      }

      // Fix EXIF rotation BEFORE feeding to model
      let uiImage = fixedOrientationImage(rawImage)

      print("📸 Image size: \(uiImage.size), orientation raw: \(uiImage.imageOrientation.rawValue)")

      guard let cgImage = uiImage.cgImage else {
        reject("IMAGE_ERROR", "Could not get CGImage", nil)
        return
      }

      // ── 2. Resize to 192×192 (MoveNet Lightning input size) ──────────────
      let modelSize = 192

      guard let context = CGContext(
        data: nil,
        width: modelSize,
        height: modelSize,
        bitsPerComponent: 8,
        bytesPerRow: modelSize * 4,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
      ) else {
        reject("CONTEXT_ERROR", "Failed to create CGContext", nil)
        return
      }

      context.draw(cgImage, in: CGRect(x: 0, y: 0, width: modelSize, height: modelSize))

      guard let pixelData = context.data else {
        reject("PIXEL_ERROR", "No pixel data in context", nil)
        return
      }

      // ── 3. Build RGB UInt8 input tensor ──────────────────────────────────
      var inputData = Data(count: modelSize * modelSize * 3)

      inputData.withUnsafeMutableBytes { dest in
        let destPtr = dest.bindMemory(to: UInt8.self).baseAddress!
        let src = pixelData.bindMemory(to: UInt8.self,
                                       capacity: modelSize * modelSize * 4)
        var i = 0
        for row in 0..<modelSize {
          for col in 0..<modelSize {
            let offset = (row * modelSize + col) * 4
            destPtr[i]     = src[offset]     // R
            destPtr[i + 1] = src[offset + 1] // G
            destPtr[i + 2] = src[offset + 2] // B
            i += 3
          }
        }
      }

      // ── 4. Run inference ─────────────────────────────────────────────────
      try interpreter.copy(inputData, toInputAt: 0)
      try interpreter.invoke()

      let outputTensor = try interpreter.output(at: 0)
      let outputData   = outputTensor.data

      let count = outputData.count / MemoryLayout<Float32>.size
      var floatArray = [Float32](repeating: 0, count: count)
      _ = floatArray.withUnsafeMutableBytes { outputData.copyBytes(to: $0) }

      // ── 5. Parse keypoints ───────────────────────────────────────────────
      // MoveNet output layout per keypoint: [y_norm, x_norm, score]
      // Both x and y are normalized 0..1 relative to the INPUT image square.
      var keypoints: [[String: Any]] = []

      for i in 0..<17 {
        let base  = i * 3
        let yNorm = floatArray[base]       // row   (0 = top,  1 = bottom)
        let xNorm = floatArray[base + 1]   // col   (0 = left, 1 = right)
        let score = floatArray[base + 2]

        keypoints.append([
          "x":     xNorm,   // normalized horizontal position
          "y":     yNorm,   // normalized vertical position
          "score": score
        ])
      }

      print("🔥 KEYPOINTS: \(keypoints)")
      resolve(keypoints)

    } catch {
      print("❌ runModelOnImage error: \(error)")
      reject("INFERENCE_ERROR", error.localizedDescription, error)
    }
  }
}
