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
 *
 * Uses Supabase's REST (PostgREST) API directly via fetch — NOT
 * @supabase/supabase-js, whose client eagerly opens a realtime
 * WebSocket that Node 20 doesn't support.
 */

import crypto from "node:crypto";
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

  const baseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const restUrl = `${baseUrl}/rest/v1/admin_users`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  const tempPassword = generateTempPassword();
  const passwordHash = await hashAdminPassword(tempPassword);
  const now = new Date().toISOString();

  // Look up an existing row (case-insensitive exact match via ilike).
  const lookupRes = await fetch(
    `${restUrl}?select=id&email=ilike.${encodeURIComponent(email)}`,
    { headers }
  );
  if (!lookupRes.ok) {
    console.error(`Lookup failed (${lookupRes.status}):`, await lookupRes.text());
    process.exit(1);
  }
  const existing = (await lookupRes.json()) as Array<{ id: string }>;

  if (existing.length > 0) {
    const res = await fetch(`${restUrl}?id=eq.${existing[0].id}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({
        role,
        password_hash: passwordHash,
        must_change_password: true,
        password_updated_at: now,
      }),
    });
    if (!res.ok) {
      console.error(`Update failed (${res.status}):`, await res.text());
      process.exit(1);
    }
    console.log(`Updated existing admin_users row for ${email}.`);
  } else {
    const res = await fetch(restUrl, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({
        email,
        role,
        password_hash: passwordHash,
        must_change_password: true,
        password_updated_at: now,
        created_by_email: "set-admin-password-script",
      }),
    });
    if (!res.ok) {
      console.error(`Insert failed (${res.status}):`, await res.text());
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
