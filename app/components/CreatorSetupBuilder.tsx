'use client';

import Link from 'next/link';
import {
  forwardRef,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import type { ProductRecord } from '../lib/affiliate-types';
import { toCreatorCardProduct } from '../lib/creator-product-presentation';
import {
  buildCreatorSetupPlan,
  CREATOR_BUDGET_OPTIONS,
  CREATOR_GOAL_OPTIONS,
  CREATOR_OWNED_GEAR_OPTIONS,
  CREATOR_PRIORITY_OPTIONS,
  type CreatorBudget,
  type CreatorGoal,
  type CreatorOwnedGear,
  type CreatorPriority,
  type CreatorSetupPlan,
} from '../lib/creator-setup-builder';
import { RecommendationProductCard } from './RecommendationProductCard';

export function CreatorSetupBuilder({ products }: { products: ProductRecord[] }) {
  const [budget, setBudget] = useState<CreatorBudget | ''>('');
  const [ownedGear, setOwnedGear] = useState<CreatorOwnedGear[]>([]);
  const [goal, setGoal] = useState<CreatorGoal | ''>('');
  const [priority, setPriority] = useState<CreatorPriority | ''>('');
  const [plan, setPlan] = useState<CreatorSetupPlan | null>(null);
  const [error, setError] = useState('');
  const resultsRef = useRef<HTMLElement>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!budget || !goal || !priority) {
      setError('Choose a budget, creator goal, and first priority to build your setup.');
      return;
    }

    setError('');
    setPlan(buildCreatorSetupPlan(products, { budget, ownedGear, goal, priority }));
    window.requestAnimationFrame(() => resultsRef.current?.focus());
  };

  return (
    <div className="grid gap-8">
      <form
        className="theme-glass-card rounded-3xl p-5 sm:p-7"
        noValidate
        onSubmit={submit}
      >
        <div className="grid gap-8">
          <ChoiceGroup
            legend="1. What is your total budget?"
            name="budget"
            onChange={(value) => setBudget(value as CreatorBudget)}
            options={CREATOR_BUDGET_OPTIONS}
            value={budget}
          />

          <fieldset>
            <legend className="text-lg font-black text-white">
              2. What gear do you already have?
            </legend>
            <p className="mt-1 text-sm text-slate-400">
              Leave everything unchecked if you are starting from scratch.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CREATOR_OWNED_GEAR_OPTIONS.map((option) => {
                const checked = ownedGear.includes(option.value);
                return (
                  <label className={choiceClass(checked)} key={option.value}>
                    <input
                      checked={checked}
                      className="size-4 accent-fuchsia-400"
                      onChange={(event) =>
                        setOwnedGear((current) =>
                          option.value === 'NONE'
                            ? event.target.checked
                              ? ['NONE']
                              : []
                            : event.target.checked
                              ? [...current.filter((item) => item !== 'NONE'), option.value]
                              : current.filter((item) => item !== option.value),
                        )
                      }
                      type="checkbox"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <ChoiceGroup
            legend="3. What is your main goal?"
            name="goal"
            onChange={(value) => setGoal(value as CreatorGoal)}
            options={CREATOR_GOAL_OPTIONS}
            value={goal}
          />

          <ChoiceGroup
            legend="4. What should be prioritized?"
            name="priority"
            onChange={(value) => setPriority(value as CreatorPriority)}
            options={CREATOR_PRIORITY_OPTIONS}
            value={priority}
          />
        </div>

        {error ? (
          <p
            aria-live="polite"
            className="mt-6 rounded-xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            className="theme-primary-button rounded-xl px-6 py-3.5 text-sm font-black"
            type="submit"
          >
            Build My Streaming Setup
          </button>
          <Link
            className="theme-secondary-button rounded-xl px-5 py-3 text-center text-sm font-black"
            href="/creator-setup-guide"
          >
            Read the Setup Guide
          </Link>
        </div>
      </form>

      {plan ? (
        <CreatorPlan plan={plan} ref={resultsRef} />
      ) : null}
    </div>
  );
}

function ChoiceGroup({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-lg font-black text-white">{legend}</legend>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <label className={choiceClass(value === option.value)} key={option.value}>
            <input
              checked={value === option.value}
              className="size-4 accent-fuchsia-400"
              name={name}
              onChange={() => onChange(option.value)}
              type="radio"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const CreatorPlan = forwardRef<HTMLElement, { plan: CreatorSetupPlan }>(
  function CreatorPlan({ plan }, ref) {
    const productCount =
      plan.essentials.length + plan.nextUpgrades.length + plan.futureUpgrades.length;

    return (
      <section
        className="scroll-mt-6 outline-none"
        ref={ref}
        tabIndex={-1}
      >
        <div className="theme-glass-card rounded-3xl p-5 sm:p-7">
          <p className="theme-kicker text-xs font-black uppercase tracking-[0.18em]">
            Your creator setup path
          </p>
          <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
            Start with the gear that solves the biggest need
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
            {plan.summary}
          </p>
          <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-500">
            Before buying internal PC parts, confirm motherboard, case, power-supply,
            cooling, and memory compatibility.
          </p>
        </div>

        {productCount > 0 ? (
          <div className="mt-8 grid gap-10">
            <ProductGroup
              description="The highest-impact additions for the answers you selected."
              products={plan.essentials}
              title="Essential Upgrades"
            />
            <ProductGroup
              description="Add these after the essentials are working reliably."
              products={plan.nextUpgrades}
              title="Next Upgrades"
            />
            <ProductGroup
              description="Useful finishing upgrades when your workflow and budget grow."
              products={plan.futureUpgrades}
              title="Future Upgrades"
            />
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-7 text-center">
            <h3 className="text-xl font-black text-white">No matching products are available yet</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Your setup order is still available below. The product list only shows enabled,
              creator-relevant items with valid retailer links.
            </p>
          </div>
        )}

        <section className="theme-glass-card mt-8 rounded-3xl p-5 sm:p-7">
          <h3 className="text-2xl font-black text-white">Recommended setup order</h3>
          <ol className="mt-5 grid gap-3">
            {plan.setupOrder.map((step, index) => (
              <li
                className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300"
                key={step}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/15 text-xs font-black text-fuchsia-200">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              className="theme-primary-button rounded-xl px-5 py-3 text-center text-sm font-black"
              href="/creator-setup-guide"
            >
              View Creator Setup Guide
            </Link>
            <Link
              className="theme-secondary-button rounded-xl px-5 py-3 text-center text-sm font-black"
              href="/"
            >
              Recheck My PC
            </Link>
          </div>
        </section>

        {productCount > 0 ? (
          <p className="mt-5 text-xs leading-5 text-slate-500">
            Disclosure: We may earn a commission when you purchase through links on this page,
            at no additional cost to you. Recommendations are based on your selections and
            current catalog tiers, not a promise of streaming success or income.
          </p>
        ) : null}
      </section>
    );
  },
);

function ProductGroup({
  title,
  description,
  products,
}: {
  title: string;
  description: string;
  products: ProductRecord[];
}) {
  if (products.length === 0) return null;

  return (
    <section>
      <h3 className="text-2xl font-black text-white">{title}</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{description}</p>
      <div className="mt-5 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <RecommendationProductCard
            categoryLabel={product.valueTier ?? 'Creator pick'}
            compact
            key={product.id}
            product={toCreatorCardProduct(product, 'creator-setup-builder')}
          />
        ))}
      </div>
    </section>
  );
}

function choiceClass(selected: boolean) {
  return `flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold transition focus-within:ring-2 focus-within:ring-fuchsia-300/70 ${
    selected
      ? 'border-fuchsia-300/50 bg-fuchsia-400/15 text-white'
      : 'border-white/10 bg-black/20 text-slate-300 hover:border-fuchsia-300/30 hover:bg-fuchsia-400/[0.07]'
  }`;
}
