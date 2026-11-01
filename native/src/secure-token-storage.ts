import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import type { SecureTokenStorage } from "../../src/universal-app/platform/types";

const TOKEN_KEY = "vodda.auth.token";

export const secureTokenStorage: SecureTokenStorage = {
  getToken() {
    return SecureStorage.getItem(TOKEN_KEY);
  },
  async setToken(token) {
    await SecureStorage.setItem(TOKEN_KEY, token);
  },
  async clearToken() {
    await SecureStorage.removeItem(TOKEN_KEY);
  },
};
