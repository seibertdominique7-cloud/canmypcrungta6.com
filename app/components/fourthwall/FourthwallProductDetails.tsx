/* eslint-disable @next/next/no-img-element -- Product images are returned at runtime by Fourthwall. */
'use client';

import { useMemo, useState } from 'react';

import type {
  FourthwallImage,
  FourthwallProduct,
  FourthwallVariant,
} from '../../lib/fourthwall-types';
import {
  formatFourthwallMoney,
  getFourthwallImageUrl,
  getFourthwallStartingPrice,
  isFourthwallVariantAvailable,
} from '../../lib/fourthwall-types';
import { useFourthwallCart } from './FourthwallCart';

export function FourthwallProductDetails({
  product,
}: {
  product: FourthwallProduct;
}) {
  const variants = useMemo(
    () => product.variants.filter(isFourthwallVariantAvailable),
    [product.variants],
  );
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [activeImageId, setActiveImageId] = useState(
    variants[0]?.images[0]?.id ?? product.images[0]?.id ?? '',
  );
  const [notice, setNotice] = useState('');
  const { addItem, busyVariantId, error } = useFourthwallCart();
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
  const displayPrice = selectedVariant?.unitPrice ?? getFourthwallStartingPrice(product);
  const gallery = useMemo(
    () => uniqueImages([...(selectedVariant?.images ?? []), ...product.images]),
    [product.images, selectedVariant],
  );
  const activeImage =
    gallery.find((image) => image.id === activeImageId) ?? gallery[0] ?? null;
  const colors = uniqueAttribute(variants, 'color');
  const sizes = uniqueAttribute(variants, 'size');
  const busy = selectedVariant ? busyVariantId === selectedVariant.id : false;

  const chooseVariant = (variant: FourthwallVariant) => {
    setSelectedVariantId(variant.id);
    setActiveImageId(variant.images[0]?.id ?? product.images[0]?.id ?? '');
    setNotice('');
  };

  const chooseAttribute = (type: 'color' | 'size', name: string) => {
    const otherType = type === 'color' ? 'size' : 'color';
    const otherName = selectedVariant?.attributes?.[otherType]?.name;
    const next =
      variants.find(
        (variant) =>
          variant.attributes?.[type]?.name === name &&
          (!otherName || variant.attributes?.[otherType]?.name === otherName),
      ) ??
      variants.find((variant) => variant.attributes?.[type]?.name === name);
    if (next) chooseVariant(next);
  };

  const submit = async () => {
    if (!selectedVariant) return;
    setNotice('');
    if (await addItem(selectedVariant.id, quantity)) {
      setNotice('Added to your cart.');
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-10">
      <section aria-label={`${product.name} images`}>
        <div className="theme-glass-card flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-slate-950/50 p-4 sm:p-7">
          {activeImage ? (
            <img
              alt={`${product.name} product image`}
              className="h-full w-full object-contain"
              fetchPriority="high"
              src={getFourthwallImageUrl(activeImage)}
            />
          ) : (
            <p className="text-sm font-bold text-slate-500">Product image unavailable</p>
          )}
        </div>
        {gallery.length > 1 ? (
          <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
            {gallery.slice(0, 12).map((image, index) => (
              <button
                aria-label={`View product image ${index + 1}`}
                aria-pressed={image.id === activeImage?.id}
                className={`aspect-square overflow-hidden rounded-xl border bg-slate-950/50 p-1.5 transition ${
                  image.id === activeImage?.id
                    ? 'border-pink-400 ring-2 ring-pink-400/20'
                    : 'border-white/10 hover:border-violet-300/40'
                }`}
                key={image.id}
                onClick={() => setActiveImageId(image.id)}
                type="button"
              >
                <img
                  alt=""
                  className="h-full w-full object-contain"
                  loading="lazy"
                  src={getFourthwallImageUrl(image)}
                />
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="theme-glass-strong h-fit rounded-3xl p-5 sm:p-7 lg:sticky lg:top-6">
        <p className="theme-kicker text-xs font-black uppercase tracking-[0.2em]">
          Launch Day Gear
        </p>
        <h1 className="mt-2 text-balance text-3xl font-black text-white sm:text-4xl">
          {product.name}
        </h1>
        <p className="mt-3 text-xl font-black text-pink-200">
          {formatFourthwallMoney(displayPrice)}
        </p>
        {product.description ? (
          <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-300">
            {product.description}
          </p>
        ) : null}

        {colors.length ? (
          <fieldset className="mt-6">
            <legend className="text-sm font-black text-white">
              Color
              {selectedVariant?.attributes?.color?.name ? (
                <span className="ml-2 font-medium text-slate-400">
                  {selectedVariant.attributes.color.name}
                </span>
              ) : null}
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {colors.map((color) => {
                const selected = selectedVariant?.attributes?.color?.name === color.name;
                return (
                  <button
                    aria-label={`Choose ${color.name}`}
                    aria-pressed={selected}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
                      selected
                        ? 'border-pink-400 bg-pink-500/15 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-violet-300/40'
                    }`}
                    key={color.name}
                    onClick={() => chooseAttribute('color', color.name)}
                    type="button"
                  >
                    <span
                      className="size-4 rounded-full border border-white/30"
                      style={{ backgroundColor: safeSwatch(color.swatch) }}
                    />
                    {color.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {sizes.length ? (
          <fieldset className="mt-6">
            <legend className="text-sm font-black text-white">Size</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {sizes.map((size) => {
                const matching = variants.find(
                  (variant) =>
                    variant.attributes?.size?.name === size.name &&
                    (!selectedVariant?.attributes?.color?.name ||
                      variant.attributes?.color?.name ===
                        selectedVariant.attributes.color.name),
                );
                const selected = selectedVariant?.attributes?.size?.name === size.name;
                return (
                  <button
                    aria-pressed={selected}
                    className={`rounded-xl border px-3.5 py-2 text-xs font-black ${
                      selected
                        ? 'border-pink-400 bg-pink-500/15 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-violet-300/40'
                    } disabled:cursor-not-allowed disabled:opacity-35`}
                    disabled={!matching}
                    key={size.name}
                    onClick={() => chooseAttribute('size', size.name)}
                    type="button"
                  >
                    {size.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {variants.length > 1 ? (
          <label className="mt-6 grid gap-2 text-sm font-black text-white">
            Product option
            <select
              className="theme-input w-full rounded-xl px-3 py-3 text-sm font-medium"
              onChange={(event) => {
                const variant = variants.find((item) => item.id === event.target.value);
                if (variant) chooseVariant(variant);
              }}
              value={selectedVariant?.id}
            >
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.attributes?.description || variant.name} -{' '}
                  {formatFourthwallMoney(variant.unitPrice)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-[130px_1fr]">
          <label className="grid gap-2 text-sm font-black text-white">
            Quantity
            <select
              className="theme-input rounded-xl px-3 py-3 text-sm"
              onChange={(event) => setQuantity(Number(event.target.value))}
              value={quantity}
            >
              {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <button
            className="theme-primary-button self-end rounded-xl px-5 py-3.5 text-sm font-black"
            disabled={!selectedVariant || busy}
            onClick={() => void submit()}
            type="button"
          >
            {busy ? 'Adding…' : selectedVariant ? 'Add to Cart' : 'Sold Out'}
          </button>
        </div>

        {notice || error ? (
          <p
            aria-live="polite"
            className={`mt-4 rounded-xl border p-3 text-sm ${
              error
                ? 'border-red-400/30 bg-red-500/10 text-red-200'
                : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
            }`}
          >
            {error || notice}
          </p>
        ) : null}
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Secure payment, fulfillment, shipping, and returns are handled by Fourthwall.
        </p>
      </section>
    </div>
  );
}

function uniqueImages(images: FourthwallImage[]) {
  const seen = new Set<string>();
  return images.filter((image) => {
    const key = image.id || getFourthwallImageUrl(image);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueAttribute(
  variants: FourthwallVariant[],
  type: 'color' | 'size',
) {
  const values = new Map<string, { name: string; swatch?: string | null }>();
  for (const variant of variants) {
    const attribute = variant.attributes?.[type];
    if (attribute?.name && !values.has(attribute.name.toLowerCase())) {
      values.set(attribute.name.toLowerCase(), attribute);
    }
  }
  return Array.from(values.values());
}

function safeSwatch(value?: string | null) {
  return value && /^#[0-9a-f]{3,8}$/i.test(value) ? value : '#94a3b8';
}
