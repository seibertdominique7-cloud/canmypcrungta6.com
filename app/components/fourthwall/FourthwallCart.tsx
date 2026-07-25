/* eslint-disable @next/next/no-img-element -- Images are returned at runtime by Fourthwall. */
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { FourthwallCart as FourthwallCartRecord } from '../../lib/fourthwall-types';
import {
  formatFourthwallMoney,
  getFourthwallCartSubtotal,
  getFourthwallImageUrl,
} from '../../lib/fourthwall-types';

const CART_STORAGE_KEY = 'canmypcrungta6-fourthwall-cart';

interface FourthwallCartContextValue {
  cart: FourthwallCartRecord | null;
  itemCount: number;
  busyVariantId: string | null;
  error: string;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (variantId: string, quantity: number) => Promise<boolean>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  checkout: () => void;
}

const FourthwallCartContext = createContext<FourthwallCartContextValue | null>(null);

export function FourthwallCartProvider({
  checkoutBaseUrl,
  children,
}: {
  checkoutBaseUrl: string;
  children: React.ReactNode;
}) {
  const [cart, setCart] = useState<FourthwallCartRecord | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [busyVariantId, setBusyVariantId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const cartId = safeStorageGet();
    if (!cartId) return;
    void fetchCart(cartId)
      .then(setCart)
      .catch(() => safeStorageRemove());
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const addItem = useCallback(async (variantId: string, quantity: number) => {
    setBusyVariantId(variantId);
    setError('');
    try {
      let nextCart: FourthwallCartRecord;
      try {
        nextCart = await cartRequest('POST', {
          cartId: cart?.id,
          variantId,
          quantity,
        });
      } catch (requestError) {
        if (!cart?.id || !isMissingCartError(requestError)) throw requestError;
        safeStorageRemove();
        nextCart = await cartRequest('POST', { variantId, quantity });
      }
      setCart(nextCart);
      safeStorageSet(nextCart.id);
      setIsOpen(true);
      return true;
    } catch (requestError) {
      setError(errorMessage(requestError));
      return false;
    } finally {
      setBusyVariantId(null);
    }
  }, [cart]);

  const updateQuantity = useCallback(async (variantId: string, quantity: number) => {
    if (!cart?.id) return;
    setBusyVariantId(variantId);
    setError('');
    try {
      const nextCart = await cartRequest('PATCH', {
        cartId: cart.id,
        variantId,
        quantity,
      });
      setCart(nextCart);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusyVariantId(null);
    }
  }, [cart]);

  const checkout = useCallback(() => {
    if (!cart?.id) {
      setError('Your cart is empty.');
      return;
    }
    if (!checkoutBaseUrl) {
      setError('Checkout is not configured yet.');
      return;
    }
    const checkoutUrl = new URL('/cart/checkout', checkoutBaseUrl);
    checkoutUrl.searchParams.set('cartId', cart.id);
    checkoutUrl.searchParams.set(
      'currency',
      cart.items[0]?.variant.unitPrice.currency || 'USD',
    );
    window.location.assign(checkoutUrl.toString());
  }, [cart, checkoutBaseUrl]);

  const value = useMemo<FourthwallCartContextValue>(() => ({
    cart,
    itemCount: cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0,
    busyVariantId,
    error,
    isOpen,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    addItem,
    updateQuantity,
    checkout,
  }), [addItem, busyVariantId, cart, checkout, error, isOpen, updateQuantity]);

  return (
    <FourthwallCartContext.Provider value={value}>
      {children}
      <FourthwallCartButton />
      <FourthwallCartDrawer />
    </FourthwallCartContext.Provider>
  );
}

export function useFourthwallCart() {
  const value = useContext(FourthwallCartContext);
  if (!value) {
    throw new Error('useFourthwallCart must be used inside FourthwallCartProvider.');
  }
  return value;
}

function FourthwallCartButton() {
  const { itemCount, openCart } = useFourthwallCart();
  return (
    <button
      aria-label={`Open shopping cart with ${itemCount} item${itemCount === 1 ? '' : 's'}`}
      className="theme-primary-button fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black shadow-2xl sm:bottom-6 sm:right-6"
      onClick={openCart}
      type="button"
    >
      <span aria-hidden="true">Bag</span>
      <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{itemCount}</span>
    </button>
  );
}

function FourthwallCartDrawer() {
  const {
    cart,
    busyVariantId,
    checkout,
    closeCart,
    error,
    isOpen,
    updateQuantity,
  } = useFourthwallCart();
  const subtotal = getFourthwallCartSubtotal(cart);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        aria-label="Close shopping cart"
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
        onClick={closeCart}
        type="button"
      />
      <aside
        aria-label="Shopping cart"
        aria-modal="true"
        className="merch-cart-drawer absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-violet-300/20 bg-[#080f24] text-slate-100 shadow-2xl"
        role="dialog"
      >
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="theme-kicker text-xs font-black uppercase tracking-[0.18em]">
              Launch Day Gear
            </p>
            <h2 className="mt-1 text-xl font-black">Your cart</h2>
          </div>
          <button
            aria-label="Close cart"
            className="theme-secondary-button rounded-xl px-3 py-2 text-sm font-black"
            onClick={closeCart}
            type="button"
          >
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {cart?.items.length ? (
            <div className="grid gap-4">
              {cart.items.map((item) => {
                const image = getFourthwallImageUrl(item.variant.images[0]);
                const busy = busyVariantId === item.variant.id;
                return (
                  <article
                    className="grid grid-cols-[76px_1fr] gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                    key={item.variant.id}
                  >
                    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-slate-950/60">
                      {image ? (
                        <img
                          alt=""
                          className="h-full w-full object-contain"
                          src={image}
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">No image</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-white">
                        {item.variant.product.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.variant.attributes?.description || item.variant.name}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center rounded-xl border border-white/10">
                          <button
                            aria-label={`Decrease quantity of ${item.variant.product.name}`}
                            className="px-3 py-1.5 text-sm font-black disabled:opacity-40"
                            disabled={busy}
                            onClick={() =>
                              void updateQuantity(item.variant.id, Math.max(0, item.quantity - 1))
                            }
                            type="button"
                          >
                            -
                          </button>
                          <span className="min-w-8 text-center text-xs font-black">
                            {item.quantity}
                          </span>
                          <button
                            aria-label={`Increase quantity of ${item.variant.product.name}`}
                            className="px-3 py-1.5 text-sm font-black disabled:opacity-40"
                            disabled={busy || item.quantity >= 25}
                            onClick={() => void updateQuantity(item.variant.id, item.quantity + 1)}
                            type="button"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-sm font-black text-white">
                          {formatFourthwallMoney({
                            value: Number(item.variant.unitPrice.value) * item.quantity,
                            currency: item.variant.unitPrice.currency,
                          })}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center">
              <h3 className="text-xl font-black">Your cart is empty</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Choose an item and a product option to get started.
              </p>
            </div>
          )}
          {error ? (
            <p
              aria-live="polite"
              className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200"
            >
              {error}
            </p>
          ) : null}
        </div>

        <footer className="border-t border-white/10 bg-black/20 p-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-400">Estimated subtotal</span>
            <strong className="text-lg text-white">
              {subtotal ? formatFourthwallMoney(subtotal) : formatFourthwallMoney({ value: 0, currency: 'USD' })}
            </strong>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Shipping, taxes, and final availability are confirmed by Fourthwall at checkout.
          </p>
          <button
            className="theme-primary-button mt-4 w-full rounded-xl px-5 py-3 text-sm font-black"
            disabled={!cart?.items.length || Boolean(busyVariantId)}
            onClick={checkout}
            type="button"
          >
            Secure checkout
          </button>
        </footer>
      </aside>
    </div>
  );
}

async function fetchCart(cartId: string) {
  const response = await fetch(`/api/merch/cart?cartId=${encodeURIComponent(cartId)}`, {
    cache: 'no-store',
  });
  const payload = await response.json() as { cart?: FourthwallCartRecord; error?: string };
  if (!response.ok || !payload.cart) {
    throw new CartRequestError(payload.error || 'Cart could not be loaded.', response.status);
  }
  return payload.cart;
}

async function cartRequest(
  method: 'POST' | 'PATCH',
  body: { cartId?: string; variantId: string; quantity: number },
) {
  const response = await fetch('/api/merch/cart', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json() as { cart?: FourthwallCartRecord; error?: string };
  if (!response.ok || !payload.cart) {
    throw new CartRequestError(
      payload.error || 'The cart could not be updated.',
      response.status,
    );
  }
  return payload.cart;
}

class CartRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function isMissingCartError(error: unknown) {
  return error instanceof CartRequestError && error.status === 404;
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'The cart is temporarily unavailable. Please try again.';
}

function safeStorageGet() {
  try {
    return window.localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeStorageSet(cartId: string) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, cartId);
  } catch {
    // The live cart remains usable for this page view when storage is unavailable.
  }
}

function safeStorageRemove() {
  try {
    window.localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // Nothing else is required when storage is unavailable.
  }
}
