import type { Metadata } from "next";
import CartPageClient from "./CartPageClient";

export const metadata: Metadata = {
  title: "Your cart | Deen Relief Bazaar",
  description:
    "Review your selection from Deen Relief Bazaar before checking out.",
};

export default function CartPage() {
  return <CartPageClient />;
}
