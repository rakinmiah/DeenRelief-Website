/**
 * Who may see + use the /admin/social section.
 *
 * The social tools (Campaign Command Center, /now spotlight, banner,
 * short links, First Response, performance, media library, brand
 * assets, QR) are restricted to a specific allow-list of emails rather
 * than a role — so a general admin (e.g. a trustee like Melissa or Ola)
 * does NOT get the social section, while the dedicated accounts do.
 *
 * Plain data + helper, no imports — safe to use from both client
 * components (the nav) and server code (the section guard).
 *
 * Enforced in two places:
 *   - the nav (admin-nav.tsx) hides the Social link, and
 *   - src/app/admin/social/layout.tsx blocks direct URL access.
 */
export const SOCIAL_ALLOWED_EMAILS = [
  "info@deenrelief.org",
  "socialmedia@deenrelief.org",
];

/** True if the email is allowed into the /admin/social section. */
export function canAccessSocial(email: string | null | undefined): boolean {
  if (!email) return false;
  return SOCIAL_ALLOWED_EMAILS.includes(email.toLowerCase().trim());
}
