import { Suspense } from "react";
import type { Metadata } from "next";
import PreviewClient from "./PreviewClient";

export const metadata: Metadata = {
  title: "Order received | Deen Relief Bazaar",
  description: "Thank you for your order.",
};

export default function OrderPreviewPage() {
  return (
    <Suspense fallback={null}>
      <PreviewClient />
    </Suspense>
  );
}
