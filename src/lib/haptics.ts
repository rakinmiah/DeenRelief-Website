/**
 * Thin wrapper around navigator.vibrate() for haptic feedback on
 * meaningful admin actions — confirm presses, sheet opens, delete
 * commits.
 *
 * Why a helper instead of inline calls:
 *   - Some browsers (desktop Safari, every iOS browser) silently
 *     no-op on navigator.vibrate. Wrapping the call lets us
 *     short-circuit on platforms where it'd never fire anyway,
 *     and centralises any future feature-detection logic.
 *   - We can swap the underlying patterns without touching every
 *     call site — e.g. if iOS ever ships a real haptic API
 *     (currently they only fire haptics for certain native UI
 *     elements like sliders, not for arbitrary web JS).
 *   - Consistent "vocabulary" of presets keeps the feel coherent
 *     across the admin: a tap always feels like a tap, a confirm
 *     always feels like a confirm.
 *
 * The patterns are intentionally subtle. Long buzzes are
 * annoying; admin trustees use this tool dozens of times a day so
 * each haptic should feel like the lightest "tick" possible.
 */

type HapticPattern = "tap" | "select" | "confirm" | "warning" | "error";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  // Light tap — sheet opens, drawer opens, a non-committal action.
  tap: 6,
  // Selection — chip toggle, filter change. Even lighter than tap.
  select: 4,
  // Confirm — mark shipped, send email, save metadata. Two quick
  // ticks so it feels like "thunk-thunk".
  confirm: [8, 30, 8],
  // Warning — about to do something destructive. One firmer pulse.
  warning: 24,
  // Error — action failed or validation tripped. Three sharp ticks.
  error: [16, 40, 16, 40, 16],
};

/**
 * Fire a haptic pattern. No-op if the browser doesn't support
 * `navigator.vibrate` or the user has haptics disabled at the OS
 * level. Always safe to call.
 *
 * Returns whether the haptic was actually triggered, mostly for
 * tests / debugging — callers should not branch on this.
 */
export function haptic(pattern: HapticPattern): boolean {
  if (typeof window === "undefined") return false;
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.vibrate !== "function") return false;
  try {
    return navigator.vibrate(PATTERNS[pattern]);
  } catch {
    return false;
  }
}
