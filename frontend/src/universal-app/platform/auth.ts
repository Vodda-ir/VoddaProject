import type { AuthUser } from "./types";

export type AuthUserPayload = Omit<AuthUser, "needProfile"> & {
  need_profile?: boolean;
};

export function normalizeAuthUser(payload: AuthUserPayload, needProfile = payload.need_profile === true): AuthUser {
  const { need_profile: _needProfile, ...user } = payload;
  return {
    ...user,
    needProfile,
  };
}
