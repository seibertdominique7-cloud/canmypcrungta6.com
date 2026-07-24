import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { RecommendationProductCard } from '../components/RecommendationProductCard';
import { toCreatorCardProduct } from '../lib/creator-product-presentation';
import { getCreatorGuideProducts } from '../lib/creator-setup-data';
import { publicPageMetadata } from '../lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = publicPageMetadata({
  title: 'GTA VI Creator and Streaming Setup Guide',
  description:
    'Plan a practical GTA VI streaming, recording, and editing setup with clear advice for PC performance, audio, video, OBS, storage, and budgets.',
  path: '/creator-setup-guide',
});

export default async function CreatorSetupGuidePage() {
  const products = await getCreatorGuideProducts();

  return (
    <div className="public-theme min-h-screen text-slate-100">
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <nav aria-label="Creator setup navigation" className="flex flex-wrap gap-4 text-sm">
          <Link className="theme-link font-semibold" href="/">
            PC Compatibility Checker
          </Link>
          <Link className="theme-link font-semibold" href="/creator-setup-builder">
            Setup Builder
          </Link>
        </nav>

        <header className="mt-8 max-w-4xl">
          <p className="theme-kicker text-xs font-black uppercase tracking-[0.2em]">
            Practical creator guidance
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            GTA VI Creator Setup Guide
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
            Build a reliable workflow for gameplay, OBS, voice, camera, clips, and editing
            without buying every accessory at once.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            Starting with zero viewers is normal. Prioritize a repeatable setup and clear
            content before spending on premium production gear.
          </p>
          <div className="mt-6">
            <Link
              className="theme-primary-button inline-flex rounded-xl px-5 py-3 text-sm font-black"
              href="/creator-setup-builder"
            >
              Build My Streaming Setup
            </Link>
          </div>
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <article className="grid min-w-0 gap-6">
            <GuideSection id="what-you-need" title="What you actually need">
              <p>
                Start with a PC that can run the game while leaving headroom for OBS, a
                dependable microphone, stable internet, headphones, and enough storage for
                recordings. A webcam, lighting, second monitor, and stream controller improve
                the workflow, but they are not required for a first broadcast.
              </p>
            </GuideSection>

            <GuideSection id="what-you-do-not-need" title="What you do not need on day one">
              <ul className="grid gap-2">
                <li>An expensive camera before your lighting and audio are consistent.</li>
                <li>A second streaming PC before you understand your single-PC limits.</li>
                <li>A stream controller when keyboard shortcuts already cover your scenes.</li>
                <li>Premium accessories that do not solve a current workflow problem.</li>
              </ul>
            </GuideSection>

            <GuideSection id="pc-performance" title="PC performance and encoding headroom">
              <p>
                Gaming compatibility does not automatically guarantee smooth streaming.
                Gameplay, OBS, browser sources, alerts, chat, and local recording share CPU,
                GPU, memory, and storage resources. Test a private recording at your target
                settings, watch encoder and render lag in OBS, and lower output settings before
                assuming hardware must be replaced.
              </p>
            </GuideSection>

            <GuideSection id="microphone" title="Microphone and monitoring">
              <p>
                Clear voice audio usually matters more than camera quality. Put the microphone
                close to your mouth, lower gain, use a basic noise gate and limiter, then record
                a short test. Headphones prevent game audio from feeding back into the mic.
              </p>
            </GuideSection>

            <GuideSection id="camera-lighting" title="Webcam and lighting">
              <p>
                Face a soft light and keep bright windows behind the camera, not behind you.
                Good lighting can make a modest webcam look better than an expensive camera in
                a dark room. Add camera gear only when it supports the kind of content you plan
                to make.
              </p>
            </GuideSection>

            <GuideSection id="obs" title="OBS setup basics">
              <ol className="grid gap-2">
                <li>1. Run the auto-configuration wizard as a starting point.</li>
                <li>2. Use hardware encoding when your GPU supports it.</li>
                <li>3. Build a simple gameplay scene before adding alerts and browser sources.</li>
                <li>4. Make a local test recording and check audio balance, dropped frames, and lag.</li>
                <li>5. Save a backup of your scene collection and profile.</li>
              </ol>
            </GuideSection>

            <GuideSection id="monitor" title="Second monitor">
              <p>
                A second display makes it easier to watch chat, OBS status, stream health, and
                reference notes without covering the game. It is a workflow upgrade, not a
                requirement. A phone or tablet can cover chat while you are starting.
              </p>
            </GuideSection>

            <GuideSection id="storage" title="Storage for recordings and editing">
              <p>
                Recordings and editing caches grow quickly. Keep free space on the game drive,
                use a fast SSD for active projects, and move finished footage to an archive or
                backup. Do not rely on one drive as the only copy of important recordings.
              </p>
            </GuideSection>

            <GuideSection id="controls" title="Controllers and stream controls">
              <p>
                Keyboard shortcuts are enough for a simple setup. A stream controller becomes
                useful when you regularly switch scenes, mute sources, trigger clips, or run
                several actions together. Add it after your scenes and audio workflow are stable.
              </p>
            </GuideSection>

            <GuideSection id="budgets" title="Example budget paths">
              <div className="max-w-full overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Budget</th>
                      <th className="px-3 py-3">Start with</th>
                      <th className="px-3 py-3">Add later</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-slate-300">
                    <tr>
                      <td className="px-3 py-4 font-black text-white">Under $100</td>
                      <td className="px-3 py-4">Audio positioning, entry microphone, basic light</td>
                      <td className="px-3 py-4">Webcam or storage</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-4 font-black text-white">$100–$250</td>
                      <td className="px-3 py-4">Microphone plus webcam or storage</td>
                      <td className="px-3 py-4">Second monitor</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-4 font-black text-white">$250–$500</td>
                      <td className="px-3 py-4">Balanced audio, video, and recording storage</td>
                      <td className="px-3 py-4">Controls or PC headroom</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-4 font-black text-white">$500+</td>
                      <td className="px-3 py-4">Solve verified PC bottlenecks, then improve production</td>
                      <td className="px-3 py-4">Premium workflow upgrades</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                These are planning ranges, not current-price guarantees.
              </p>
            </GuideSection>

            <GuideSection id="order" title="Recommended order of upgrades">
              <ol className="grid gap-2">
                <li>1. Confirm stable game and recording performance.</li>
                <li>2. Make voice audio clear and consistent.</li>
                <li>3. Reserve storage space and test your recording workflow.</li>
                <li>4. Add camera and lighting if your content needs face video.</li>
                <li>5. Improve workspace visibility with a second monitor.</li>
                <li>6. Add stream controls and premium accessories last.</li>
              </ol>
            </GuideSection>

            <GuideSection id="mistakes" title="Common mistakes to avoid">
              <ul className="grid gap-2">
                <li>Buying several products before completing one private test recording.</li>
                <li>Using high microphone gain instead of moving the mic closer.</li>
                <li>Recording to a nearly full drive or keeping no backup.</li>
                <li>Adding too many browser sources, animations, and plugins at once.</li>
                <li>Assuming expensive gear guarantees viewers, revenue, or better content.</li>
              </ul>
            </GuideSection>
          </article>

          <aside className="self-start lg:sticky lg:top-5">
            <nav
              aria-label="On this page"
              className="theme-glass-card rounded-2xl p-4 text-sm"
            >
              <h2 className="font-black text-white">On this page</h2>
              <ul className="mt-3 grid gap-2 text-slate-400">
                <li><a className="theme-link" href="#what-you-need">Start here</a></li>
                <li><a className="theme-link" href="#pc-performance">PC performance</a></li>
                <li><a className="theme-link" href="#microphone">Audio</a></li>
                <li><a className="theme-link" href="#camera-lighting">Camera and lighting</a></li>
                <li><a className="theme-link" href="#obs">OBS</a></li>
                <li><a className="theme-link" href="#budgets">Budgets</a></li>
                <li><a className="theme-link" href="#recommended-products">Creator products</a></li>
              </ul>
            </nav>
          </aside>
        </div>

        <section className="mt-12" id="recommended-products">
          <p className="theme-kicker text-xs font-black uppercase tracking-[0.18em]">
            Existing product library
          </p>
          <h2 className="mt-3 text-3xl font-black text-white">Recommended creator products</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            These enabled products are selected from the same admin-managed Affiliate Products
            library used elsewhere on the site.
          </p>
          {products.length > 0 ? (
            <>
              <div className="mt-6 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <RecommendationProductCard
                    categoryLabel={product.valueTier ?? 'Creator pick'}
                    compact
                    key={product.id}
                    product={toCreatorCardProduct(product, 'creator-setup-guide')}
                  />
                ))}
              </div>
              <p className="mt-5 text-xs leading-5 text-slate-500">
                Disclosure: We may earn a commission when you purchase through links on this
                page, at no additional cost to you.
              </p>
            </>
          ) : (
            <p className="mt-6 rounded-2xl border border-dashed border-white/15 p-6 text-sm text-slate-400">
              No enabled creator products with valid retailer links are available right now.
            </p>
          )}
        </section>

        <section className="theme-glass-card mt-12 rounded-3xl p-6 sm:p-8">
          <h2 className="text-3xl font-black text-white">Turn the guide into your setup path</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
            Tell the builder what you own, what you want to create, and where you want to improve
            first. It will organize current catalog products without inventing unavailable gear.
          </p>
          <Link
            className="theme-primary-button mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-black"
            href="/creator-setup-builder"
          >
            Build My Streaming Setup
          </Link>
        </section>
      </main>
    </div>
  );
}

function GuideSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      className="theme-glass-card min-w-0 scroll-mt-6 rounded-3xl p-5 sm:p-7"
      id={id}
    >
      <h2 className="text-2xl font-black text-white sm:text-3xl">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
        {children}
      </div>
    </section>
  );
}
