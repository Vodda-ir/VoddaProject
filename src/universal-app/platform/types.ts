export type PlatformKind = "web" | "native";

export type AuthUser = {
  id: number;
  name: string;
  mobile: string;
  role: string;
  city: string;
  bio: string;
  wallet: number;
  avatar_url?: string;
  updated_at?: string;
  needProfile: boolean;
};

export type VerifyOtpResult = {
  user: AuthUser;
  needProfile: boolean;
};

export type PlatformRequestInit = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit;
};

export type PlatformImageSource = "prompt" | "camera" | "photos";

export type PlatformImagePickerOptions = {
  source?: PlatformImageSource;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
};

export interface PlatformMediaCapabilities {
  pickImage(options?: PlatformImagePickerOptions): Promise<File | null>;
}

export interface PlatformCapabilities {
  media?: PlatformMediaCapabilities;
}

export interface SecureTokenStorage {
  getToken(): Promise<string | null>;
  setToken(token: string): Promise<void>;
  clearToken(): Promise<void>;
}

export type PlatformUploadProgress = (fraction: number) => void;

export interface PlatformRuntime {
  readonly kind: PlatformKind;
  readonly apiBaseUrl: string;
  readonly capabilities?: PlatformCapabilities;

  request<T>(path: string, init?: PlatformRequestInit): Promise<T>;
  /**
   * باگ avatar-upload — آپلود multipart با progress واقعی. در وب از مسیر BFF
   * با کوکی HttpOnly و در نیتیو با Bearer token به دامنهٔ سرور می‌رود.
   */
  requestWithProgress?<T>(path: string, init?: PlatformRequestInit, onProgress?: PlatformUploadProgress): Promise<T>;
  requestOtp(mobile: string): Promise<void>;
  verifyOtp(mobile: string, code: string): Promise<VerifyOtpResult>;
  restoreSession(): Promise<AuthUser | null>;
  logout(): Promise<void>;
}
