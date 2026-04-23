import Foundation
import TensorFlowLite
import UIKit
import React

@objc(TFLiteModule)
class TFLiteModule: NSObject {

  var interpreter: Interpreter?

  // Load model once
  @objc
  func loadModel(_ resolve: RCTPromiseResolveBlock,
                 rejecter reject: RCTPromiseRejectBlock) {

    do {
      guard let modelPath = Bundle.main.path(forResource: "movenet", ofType: "tflite") else {
        reject("MODEL_NOT_FOUND", "Model file not found", nil)
        return
      }

      interpreter = try Interpreter(modelPath: modelPath)
      try interpreter?.allocateTensors()

      print("✅ Model loaded")
      resolve("Model loaded")

    } catch {
      reject("LOAD_ERROR", "Failed to load model", error)
    }
  }

  // 🔥 NEW: Run inference on test image
  @objc
  func runTestImage(_ resolve: RCTPromiseResolveBlock,
                    rejecter reject: RCTPromiseRejectBlock) {

    do {
      guard let interpreter = interpreter else {
        reject("NO_MODEL", "Model not loaded", nil)
        return
      }

      // Load image from bundle
      guard let imagePath = Bundle.main.path(forResource: "test", ofType: "jpeg"),
            let uiImage = UIImage(contentsOfFile: imagePath),
            let cgImage = uiImage.cgImage else {
        reject("IMAGE_ERROR", "Failed to load image", nil)
        return
      }

      let width = 192
      let height = 192

      // Resize image
      let context = CGContext(data: nil,
                              width: width,
                              height: height,
                              bitsPerComponent: 8,
                              bytesPerRow: width * 4,
                              space: CGColorSpaceCreateDeviceRGB(),
                              bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!

      context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
      let pixelData = context.data!

      // Convert to Float32
      var inputData = Data(count: width * height * 3 * MemoryLayout<Float32>.size)

      inputData.withUnsafeMutableBytes { (dest: UnsafeMutableRawBufferPointer) in
        let destPtr = dest.bindMemory(to: Float32.self).baseAddress!
        let src = pixelData.bindMemory(to: UInt8.self)

        var i = 0
        for y in 0..<height {
          for x in 0..<width {
            let offset = (y * width + x) * 4
            let r = Float32(src[offset]) / 255.0
            let g = Float32(src[offset + 1]) / 255.0
            let b = Float32(src[offset + 2]) / 255.0

            destPtr[i] = r
            destPtr[i + 1] = g
            destPtr[i + 2] = b
            i += 3
          }
        }
      }

      try interpreter.copy(inputData, toInputAt: 0)
      try interpreter.invoke()

      let output = try interpreter.output(at: 0)
      let results = output.data

      print("🔥 RAW OUTPUT:", results)

      resolve("Inference done")

    } catch {
      reject("INFERENCE_ERROR", "Failed inference", error)
    }
  }
}