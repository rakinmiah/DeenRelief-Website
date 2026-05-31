/**
 * Provision (or reset) a per-user admin password.
 *
 * Creates/updates an admin_users row with a freshly-generated TEMPORARY
 * password and must_change_password=true, then prints the temp password
 * so you can hand it to the person over a secure channel. On their first
 * sign-in they're forced through /admin/change-password to set their own.
 *
 * Prerequisite: apply migration 035 first (adds the password columns).
 *
 * Run:
 *   node --env-file=.env.local --import tsx scripts/set-admin-password.ts <email> [role]
 *
 * Examples:
 *   node --env-file=.env.local --import tsx scripts/set-admin-password.ts melissa@deenrelief.org
 *   node --env-file=.env.local --import tsx scripts/set-admin-password.ts ola@deenrelief.org admin
 *
 * Role defaults to 'admin' (full access). Re-running for an existing
 * email issues a fresh temporary password (handy for "I forgot mine").
 */

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { hashAdminPassword } from "../src/lib/admin-password";

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(
      `Missing ${name}. Run with: node --env-file=.env.local --import tsx scripts/set-admin-password.ts <email> [role]`
    );
    process.exit(1);
  }
  return v;
}

/** 16 chars from an unambiguous alphabet, grouped for easy reading. */
function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(16);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return (out.match(/.{1,4}/g) ?? [out]).join("-");
}

const VALID_ROLES = ["admin", "social", "writer", "sponsorship"];

async function main() {
  const email = (process.argv[2] ?? "").toLowerCase().trim();
  const role = (process.argv[3] ?? "admin").trim();

  if (!email || !email.includes("@")) {
    console.error(
      "Usage: node --env-file=.env.local --import tsx scripts/set-admin-password.ts <email> [role]"
    );
    process.exit(1);
  }
  if (!VALID_ROLES.includes(role)) {
    console.error(`Invalid role "${role}". Must be one of: ${VALID_ROLES.join(", ")}`);
    process.exit(1);
  }

  const supabase = createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const tempPassword = generateTempPassword();
  const passwordHash = await hashAdminPassword(tempPassword);
  const now = new Date().toISOString();

  const { data: existing, error: lookupErr } = await supabase
    .from("admin_users")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (lookupErr) {
    console.error("Lookup failed:", lookupErr.message);
    process.exit(1);
  }

  if (existing) {
    const { error } = await supabase
      .from("admin_users")
      .update({
        role,
        password_hash: passwordHash,
        must_change_password: true,
        password_updated_at: now,
      })
      .eq("id", existing.id);
    if (error) {
      console.error("Update failed:", error.message);
      process.exit(1);
    }
    console.log(`Updated existing admin_users row for ${email}.`);
  } else {
    const { error } = await supabase.from("admin_users").insert({
      email,
      role,
      password_hash: passwordHash,
      must_change_password: true,
      password_updated_at: now,
      created_by_email: "set-admin-password-script",
    });
    if (error) {
      console.error("Insert failed:", error.message);
      process.exit(1);
    }
    console.log(`Created admin_users row for ${email} (role=${role}).`);
  }

  console.log("\n──────────────────────────────────────────────");
  console.log(`  Email:              ${email}`);
  console.log(`  Temporary password: ${tempPassword}`);
  console.log("──────────────────────────────────────────────");
  console.log("Share this over a secure channel. They'll be forced to set");
  console.log("their own password at /admin/login on first sign-in.\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
