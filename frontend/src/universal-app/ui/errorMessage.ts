export const defaultErrorMessage = "خطایی رخ داد. دوباره تلاش کنید.";

export function messageOf(error: unknown, fallback = defaultErrorMessage): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
