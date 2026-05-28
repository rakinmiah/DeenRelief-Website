"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveBrandAssetAction } from "./actions";

export default function ArchiveButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleArchive() {
    if (
      !confirm(
        "Archive this brand asset? The variant will be empty until you upload a replacement."
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await archiveBrandAssetAction(id);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleArchive}
      disabled={pending}
      className="text-[12px] text-red-700 hover:text-red-900 underline underline-offset-2 disabled:opacity-50"
    >
      {pending ? "Archiving…" : "Archive"}
    </button>
  );
}
