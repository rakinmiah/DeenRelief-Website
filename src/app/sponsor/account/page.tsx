import type { Metadata } from "next";
import { createServerSupabase, requireSponsor } from "@/lib/supabase-server";
import { getSponsorById } from "@/lib/sponsorship-admin";
import { getSponsorProfileView } from "@/lib/sponsor-donor";
import AccountClient from "./AccountClient";
import ProfileClient from "./ProfileClient";
import SecurityClient from "./SecurityClient";
import MfaClient from "./MfaClient";

export const metadata: Metadata = { title: "Your account" };
export const dynamic = "force-dynamic";

function formatGbp(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
  }).format(pence / 100);
}

function formatMonthYear(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export default async function SponsorAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const user = await requireSponsor();
  const { billing } = await searchParams;

  const sponsor = await getSponsorById(user.id);
  const view = sponsor ? await getSponsorProfileView(sponsor) : null;
  const hasBilling = Boolean(sponsor?.stripeCustomerId);

  const supabase = await createServerSupabase();
  const { data: openRequests } = await supabase
    .from("sponsor_data_requests")
    .select("request_type, status")
    .eq("status", "pending");
  const hasPendingErasure = (openRequests ?? []).some(
    (r) => r.request_type === "erasure"
  );

  const displayName = view?.fullName || sponsor?.fullName || "Account settings";
  const email = view?.email || sponsor?.contactEmail || user.email || "";
  const giving = view?.giving ?? null;

  return (
    <section className="bg-white">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="mb-10">
          <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
            Your account
          </span>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-2">
            {displayName}
          </h1>
          <p className="text-grey text-base">{email}</p>
        </div>

        <div className="space-y-6">
          {/* Personal details + address (editable) */}
          {view && (
            <ProfileClient
              initial={{
                fullName: view.fullName,
                email: view.email,
                phone: view.phone,
                address: view.address,
              }}
            />
          )}

          {/* Sign-in & security */}
          <SecurityClient
            email={email}
            lastSignInAt={user.last_sign_in_at ?? null}
          />

          {/* Two-factor authentication */}
          <MfaClient />

          {/* Your giving (read-only, from the donor record) */}
          {giving && (
            <section className="rounded-2xl border border-charcoal/5 bg-cream shadow-sm p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="font-heading font-bold text-lg text-charcoal">
                  Your giving
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${
                    view?.giftAidActive
                      ? "bg-green-light text-green"
                      : "bg-grey-light text-grey"
                  }`}
                >
                  {view?.giftAidActive ? "Gift Aid active" : "Gift Aid not set up"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                <Stat label="Total given" value={formatGbp(giving.totalPence)} />
                <Stat
                  label="Monthly sponsorship"
                  value={
                    giving.hasActiveRecurring
                      ? `${formatGbp(giving.activeMonthlyPence)}/mo`
                      : "—"
                  }
                />
                <Stat label="Donations" value={String(giving.donationsCount)} />
                <Stat
                  label="Supporter since"
                  value={formatMonthYear(view?.memberSince ?? null)}
                />
              </div>
              {view?.giftAidActive && giving.giftAidReclaimablePence > 0 && (
                <p className="mt-4 text-xs text-grey/80 leading-relaxed">
                  With Gift Aid, the government adds an extra{" "}
                  <strong className="text-charcoal">
                    {formatGbp(giving.giftAidReclaimablePence)}
                  </strong>{" "}
                  to your giving at no cost to you.
                </p>
              )}
            </section>
          )}

          {/* Billing self-service via the Stripe-hosted portal */}
          <section className="rounded-2xl border border-charcoal/5 bg-white shadow-sm p-6">
            <h2 className="font-heading font-bold text-lg text-charcoal mb-2">
              Manage your sponsorship
            </h2>
            {billing === "error" && (
              <p className="mb-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5">
                Sorry — we couldn&apos;t open the billing portal just then.
                Please try again, or email us.
              </p>
            )}
            {billing === "none" && (
              <p className="mb-3 rounded-lg bg-amber-light/60 border border-amber/30 text-amber-dark text-sm px-3.5 py-2.5">
                We don&apos;t have payment details linked to your account yet.
                Email us and we&apos;ll help.
              </p>
            )}
            <p className="text-sm text-grey mb-5 leading-[1.7]">
              Update your card, change or pause your monthly amount, view your
              payment history, and download receipts — all in our secure payment
              portal.
            </p>
            {hasBilling ? (
              <a
                href="/api/sponsor/billing-portal"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm rounded-full bg-green text-white font-semibold shadow-sm hover:bg-green-dark transition-colors"
              >
                Manage billing &amp; payments
              </a>
            ) : (
              <a
                href="mailto:info@deenrelief.org?subject=Manage%20my%20sponsorship"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm rounded-full border border-charcoal/15 text-charcoal/80 font-medium hover:border-green hover:text-green transition-colors"
              >
                Contact us about billing
              </a>
            )}
          </section>

          {/* Email preferences + data controls */}
          <AccountClient
            marketingConsent={Boolean(sponsor?.marketingConsent)}
            notifyNewUpdate={sponsor?.notifyNewUpdate !== false}
            hasPendingErasure={hasPendingErasure}
          />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/50 mb-1">
        {label}
      </p>
      <p className="text-lg font-heading font-bold text-charcoal">{value}</p>
    </div>
  );
}
