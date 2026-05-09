import AdminShell from "@/components/admin/AdminShell";

/**
 * Admin layout — wraps every /admin/* page with the shared chrome.
 *
 * AdminShell internally bypasses its chrome on /admin/login (since
 * the login page has nothing to sign out of and no nav to traverse).
 *
 * Production auth gate (NOT in the mockup):
 *   const { data } = await supabase.auth.getUser();
 *   if (!data.user) redirect("/admin/login");
 *   const { data: adminRow } = await supabase
 *     .from("admin_users")
 *     .select("id")
 *     .eq("user_id", data.user.id)
 *     .maybeSingle();
 *   if (!adminRow) redirect("/admin/login?error=not-authorised");
 *
 * The layout returns server-side, so the gate runs before any page
 * data fetches. Saves leaking sensitive donor data via SSR.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
