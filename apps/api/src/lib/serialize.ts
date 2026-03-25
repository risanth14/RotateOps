export function toIso(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString();
}
