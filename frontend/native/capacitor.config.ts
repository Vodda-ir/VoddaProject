import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ir.vodda.vodda",
  appName: "Vodda",
  webDir: "dist",
  server: {
    // https scheme keeps the WebView in a secure context — without it
    // getUserMedia (کلاس تصویری) is rejected outright on Android WebView.
    androidScheme: "https",
    iosScheme: "capacitor",
  },
  android: {
    allowMixedContent: false,
    // AndroidManifest باید CAMERA و RECORD_AUDIO را داشته باشد؛ WebView
    // درخواست مجوز را به ران‌تایم اندروید منتقل می‌کند (Capacitor built-in).
  },
  ios: {
    // Info.plist هم نیاز به NSCameraUsageDescription / NSMicrophoneUsageDescription دارد.
  },
};

export default config;
