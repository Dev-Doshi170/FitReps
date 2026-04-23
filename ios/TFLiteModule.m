#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(TFLiteModule, NSObject)

RCT_EXTERN_METHOD(loadModel:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(runModelOnImage:(NSString *)imagePath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
