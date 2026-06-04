import type { Metadata } from "next";
import { requireSponsor } from "@/lib/supabase-server";
import { getSponsorProfileView, resolveSponsor } from "@/lib/sponsor-donor";
import ProfileClient from "./ProfileClient";

export const metadata: Metadata = { title: "Your profile" };
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

export default async function SponsorProfilePage() {
  const user = await requireSponsor();
  const sponsor = await resolveSponsor(user);
  const view = await getSponsorProfileView(sponsor);
  const giving = view.giving;

  return (
    <section className="bg-white">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="mb-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green/10 ring-1 ring-charcoal/5 flex items-center justify-center shrink-0">
            <span className="font-heading font-bold text-2xl text-green/70">
              {(view.fullName.trim()[0] ?? view.email.trim()[0] ?? "•").toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-charcoal leading-tight">
              {view.fullName || "Your profile"}
            </h1>
            <p className="text-grey text-sm sm:text-base truncate">{view.email}</p>
            {view.memberSince && (
              <p className="text-xs text-grey/70 mt-0.5">
                Supporter since {formatMonthYear(view.memberSince)}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <ProfileClient
            initial={{
              fullName: view.fullName,
              email: view.email,
              phone: view.phone,
              address: view.address,
            }}
          />

          {giving && (
            <section className="rounded-2xl border border-charcoal/5 bg-cream shadow-sm p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="font-heading font-bold text-lg text-charcoal">
                  Your giving
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${
                    view.giftAidActive
                      ? "bg-green-light text-green"
                      : "bg-grey-light text-grey"
                  }`}
                >
                  {view.giftAidActive ? "Gift Aid active" : "Gift Aid not set up"}
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
                  value={formatMonthYear(view.memberSince)}
                />
              </div>
              {view.giftAidActive && giving.giftAidReclaimablePence > 0 && (
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
