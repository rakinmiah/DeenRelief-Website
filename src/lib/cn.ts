/**
 * Minimal classnames joiner. Filters out falsy values so conditional
 * classes read cleanly:
 *
 *   cn("px-3 py-2", isActive && "bg-charcoal text-white", className)
 *
 * Intentionally dependency-free (no clsx / tailwind-merge) — the admin
 * kit's class strings are authored to not conflict, so a plain join is
 * enough and keeps the bundle lean.
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
