export type UniversalAppConfig = {
  basePath: string;
};

function normalizeBasePath(value?: string): string {
  const trimmed = (value ?? "/app").trim();
  if (!trimmed || trimmed === "/") return "";
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

export function createUniversalAppConfig(
  overrides: Partial<UniversalAppConfig> = {},
): UniversalAppConfig {
  return {
    basePath: normalizeBasePath(overrides.basePath),
  };
}

export const defaultUniversalAppConfig = createUniversalAppConfig();
