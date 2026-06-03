import { requireSocialAccess } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

/**
 * Section guard for /admin/social/*. The social tools are restricted to
 * the SOCIAL_ALLOWED_EMAILS allow-list (info@ + socialmedia@), so a
 * general admin (e.g. a trustee like Melissa or Ola) who navigates here
 * directly is redirected away. This is the single hard-enforcement
 * point — the nav also hides the link, but this blocks URL access.
 */
export default async function AdminSocialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSocialAccess();
  return <>{children}</>;
}
