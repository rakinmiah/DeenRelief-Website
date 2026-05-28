import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import {
  BRAND_VARIANTS,
  brandVariantHint,
  brandVariantLabel,
  listActiveBrandAssets,
  type BrandAsset,
  type BrandVariant,
} from "@/lib/brand-assets";
import UploadForm from "./UploadForm";
import ArchiveButton from "./ArchiveButton";

export const metadata: Metadata = {
  title: "Brand assets | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/social/brand-assets — uploadable logo variants.
 *
 * Shows one card per recognised variant (logo-on-light, logo-on-dark,
 * logo-amber). Each card has either the active asset preview + archive
 * button, or an upload form when no asset is set yet. Renderer reads
 * the active variant deterministically — no Claude Vision involved.
 */
export default async function BrandAssetsPage() {
  await requireAdminSession();
  const active = await listActiveBrandAssets();

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-6 md:mb-8">
        <Link
          href="/admin/social"
          className="inline-block text-[12px] font-semibold uppercase tracking-[0.1em] text-amber-dark mb-2 hover:text-amber-darker"
        >
          ← Social tools
        </Link>
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-charcoal tracking-[-0.01em]">
          Brand assets
        </h1>
        <p className="text-charcoal/70 text-[15px] leading-relaxed mt-2 max-w-2xl">
          Upload colour variants of the Deen Relief logo. The slide and
          social-image renderers automatically pick the right variant
          per context: the dark/green logo on cream backgrounds, the
          light/white logo on dark backgrounds. PNG or SVG with
          transparent backgrounds work best.
        </p>
      </div>

      <div className="space-y-6">
        {(BRAND_VARIANTS as readonly BrandVariant[]).map((variant) => (
          <VariantCard
            key={variant}
            variant={variant}
            asset={active[variant]}
          />
        ))}
      </div>
    </main>
  );
}

function VariantCard({
  variant,
  asset,
}: {
  variant: BrandVariant;
  asset: BrandAsset | null;
}) {
  // Card background is themed to match the slide context the variant
  // is used in — a quick visual preview of where each logo lands.
  const isOnDark = variant === "logo-on-dark";
  const previewBg = isOnDark ? "#1F4D3B" : "#F7F3E8";

  return (
    <section className="bg-white border border-charcoal/10 rounded-2xl p-5 md:p-6">
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div>
          <h2 className="text-charcoal font-heading font-semibold text-[17px]">
            {brandVariantLabel(variant)}
          </h2>
          <p className="text-charcoal/65 text-[13px] mt-1 leading-relaxed max-w-2xl">
            {brandVariantHint(variant)}
          </p>
        </div>
        <span
          className={`text-[10px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full ${
            asset
              ? "bg-green-light text-green-dark"
              : "bg-amber-light text-amber-dark"
          }`}
        >
          {asset ? "Uploaded" : "Not set"}
        </span>
      </div>

      {asset ? (
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-start">
          {/* Preview pane — themed background to mirror the slide context. */}
          <div
            className="aspect-square rounded-xl border border-charcoal/10 flex items-center justify-center p-6"
            style={{ backgroundColor: previewBg }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.publicUrl}
              alt={`${variant} preview`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="flex flex-col gap-2 text-[13px]">
            <div className="text-charcoal/85">
              <span className="font-mono text-[12px]">
                {asset.originalFilename ?? asset.storagePath.split("/").pop()}
              </span>
            </div>
            <div className="text-[12px] text-charcoal/55">
              {asset.mimeType}
              {asset.bytes ? ` · ${(asset.bytes / 1024).toFixed(1)} KB` : ""}
              {" · uploaded "}
              {asset.uploadedAt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {asset.uploadedByEmail ? ` by ${asset.uploadedByEmail}` : ""}
            </div>
            {asset.notes && (
              <p className="text-[12px] text-charcoal/70 leading-relaxed bg-cream/40 rounded-md px-3 py-2 mt-1">
                {asset.notes}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-charcoal/5">
              <a
                href={asset.publicUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-[12px] text-charcoal/65 hover:text-charcoal underline underline-offset-2"
              >
                Open full size ↗
              </a>
              <ArchiveButton id={asset.id} />
              <details className="ml-auto text-[12px] text-charcoal/60">
                <summary className="cursor-pointer hover:text-charcoal">
                  Replace
                </summary>
                <div className="mt-3 pt-3 border-t border-charcoal/5">
                  <UploadForm variant={variant} compact />
                </div>
              </details>
            </div>
          </div>
        </div>
      ) : (
        <UploadForm variant={variant} />
      )}
    </section>
  );
}
