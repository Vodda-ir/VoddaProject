import { mountUniversalApp } from "../../src/universal-app/entry";
import { createNativePlatformRuntime } from "../../src/universal-app/platform/native";
import { secureTokenStorage } from "./secure-token-storage";

function requireNativeApiBaseUrl() {
  const apiBaseUrl = import.meta.env.VITE_NATIVE_API_BASE_URL?.trim();
  if (!apiBaseUrl) {
    throw new Error("VITE_NATIVE_API_BASE_URL is required for the native app");
  }
  return apiBaseUrl.replace(/\/+$/, "");
}

const root = document.getElementById("root");
if (!root) throw new Error("Native app root element was not found");

const platform = createNativePlatformRuntime({
  apiBaseUrl: requireNativeApiBaseUrl(),
  tokenStorage: secureTokenStorage,
});

mountUniversalApp(root, {
  config: { basePath: "" },
  platform,
});
