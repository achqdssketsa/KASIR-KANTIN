import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type CartItem = {
  product_id: string;
  name: string;
  price: number;
  cost: number;
  qty: number;
};

type Ctx = {
  items: CartItem[];
  add: (p: Omit<CartItem, "qty">) => void;
  dec: (product_id: string) => void;
  remove: (product_id: string) => void;
  clear: () => void;
  subtotal: number;
  count: number;
};

const CartContext = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = useCallback((p: Omit<CartItem, "qty">) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.product_id === p.product_id);
      if (i >= 0) {
        const copy = [...prev];
        copy[i] = { ...copy[i], qty: copy[i].qty + 1 };
        return copy;
      }
      return [...prev, { ...p, qty: 1 }];
    });
  }, []);

  const dec = useCallback((product_id: string) => {
    setItems((prev) => prev.flatMap((x) => {
      if (x.product_id !== product_id) return [x];
      if (x.qty <= 1) return [];
      return [{ ...x, qty: x.qty - 1 }];
    }));
  }, []);

  const remove = useCallback((product_id: string) => {
    setItems((prev) => prev.filter((x) => x.product_id !== product_id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const subtotal = useMemo(() => items.reduce((s, x) => s + x.price * x.qty, 0), [items]);
  const count = useMemo(() => items.reduce((s, x) => s + x.qty, 0), [items]);

  return (
    <CartContext.Provider value={{ items, add, dec, remove, clear, subtotal, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
