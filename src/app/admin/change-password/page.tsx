import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import ChangePasswordClient from "./ChangePasswordClient";

export const metadata: Metadata = {
  title: "Change password | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Admin change-password screen. Uses getAdminSession() (NOT the require*
 * guards) so a session flagged mustChange can actually land here without
 * the guards bouncing it straight back.
 *
 * `forced` = a one-time temporary password is in play; the user must set
 * a new one before they can use the rest of the admin app.
 */
export default async function AdminChangePasswordPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <ChangePasswordClient
      email={session.email}
      forced={session.mustChange === true}
    />
  );
}
