"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartLineItem } from "@/lib/bazaar-types";
import {
  findProductById,
  resolveUnitPricePence,
} from "@/lib/bazaar-placeholder";

/**
 * Cart state for the Bazaar.
 *
 * Persistence: localStorage under DR_BAZAAR_CART_KEY. Survives reloads,
 * doesn't survive private-mode tabs (intentional — incognito carts
 * shouldn't carry over). When we wire authenticated accounts post-launch,
 * cart can sync to Supabase on login.
 *
 * Pricing snapshot: when a user adds an item, we snapshot the unit price.
 * This protects against the catalog price changing mid-session — the user
 * sees and pays the price they added at. The checkout endpoint will
 * reconcile against current Supabase prices and reject the session if
 * anything has changed materially.
 */

const DR_BAZAAR_CART_KEY = "dr_bazaar_cart_v1";

interface CartContextValue {
  items: CartLineItem[];
  addItem: (productId: string, variantId?: string, quantity?: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotalPence: number;
  /** True after first hydrate from localStorage. Prevents flash-of-empty-cart on SSR. */
  isHydrated: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

function lineKey(item: CartLineItem): string {
  return `${item.productId}::${item.variantId ?? ""}`;
}

export function BazaarCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount. The set-state-in-effect lint
  // doesn't apply to client-only browser APIs that aren't available
  // during SSR — this IS the canonical hydration pattern for cart state.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DR_BAZAAR_CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLineItem[];
        if (Array.isArray(parsed)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setItems(parsed);
        }
      }
    } catch {
      // Corrupt cart — discard. Better than throwing on every page load.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsHydrated(true);
  }, []);

  // Persist on every change, but only after hydrate (avoid clobbering on first render).
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(DR_BAZAAR_CART_KEY, JSON.stringify(items));
    } catch {
      // Quota exceeded or private mode — silently degrade. The cart will
      // still work in-memory for this session, just won't survive reload.
    }
  }, [items, isHydrated]);

  const addItem = useCallback(
    (productId: string, variantId?: string, quantity: number = 1) => {
      setItems((current) => {
        const product = findProductById(productId);
        if (!product) return current;
        const unitPrice = resolveUnitPricePence(product, variantId);

        const existing = current.find(
          (i) => i.productId === productId && i.variantId === variantId
        );
        if (existing) {
          return current.map((i) =>
            lineKey(i) === lineKey(existing)
              ? { ...i, quantity: i.quantity + quantity }
              : i
          );
        }
        return [
          ...current,
          {
            productId,
            variantId,
            quantity,
            unitPricePenceSnapshot: unitPrice,
          },
        ];
      });
    },
    []
  );

  const removeItem = useCallback((productId: string, variantId?: string) => {
    setItems((current) =>
      current.filter(
        (i) => !(i.productId === productId && i.variantId === variantId)
      )
    );
  }, []);

  const updateQuantity = useCallback(
    (productId: string, variantId: string | undefined, quantity: number) => {
      if (quantity < 1) {
        removeItem(productId, variantId);
        return;
      }
      setItems((current) =>
        current.map((i) =>
          i.productId === productId && i.variantId === variantId
            ? { ...i, quantity }
            : i
        )
      );
    },
    [removeItem]
  );

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotalPence = items.reduce(
      (sum, i) => sum + i.unitPricePenceSnapshot * i.quantity,
      0
    );
    return {
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      itemCount,
      subtotalPence,
      isHydrated,
    };
  }, [items, addItem, removeItem, updateQuantity, clearCart, isHydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useBazaarCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useBazaarCart must be used inside BazaarCartProvider");
  }
  return ctx;
}

// formatPence has been moved to src/lib/bazaar-format.ts so server and
// client surfaces can share the same helper. Re-exported below for any
// existing client-side imports of this module.
export { formatPence } from "@/lib/bazaar-format";
