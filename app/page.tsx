import { FeatureCard } from './components/FeatureCard';
import { EmailSignup } from './components/EmailSignup';
import { ScreenshotAnalyzer } from './components/ScreenshotAnalyzer';
import { HomepageArticles } from './components/content/HomepageArticles';
import { HomepageFourthwallMerch } from './components/fourthwall/HomepageFourthwallMerch';
import { HomepageAd } from './components/ads/AdPlacements';
import {
  getRequirementDisclaimer,
  getRequirementLabel,
} from './data/gta6-requirements';
import { getHomepageArticles, getSiteContentMap } from './lib/cms-data';
import { getFourthwallProducts, isFourthwallConfigured } from './lib/fourthwall';

export const dynamic = 'force-dynamic';
export default async function Home() {
  const [content, articles, fourthwallProducts] = await Promise.all([
    getSiteContentMap(),
    getHomepageArticles(3),
    isFourthwallConfigured()
      ? getFourthwallProducts()
          .then((products) => products.slice(0, 3))
          .catch(() => [])
      : Promise.resolve([]),
  ]);
  return (
    <div className="public-theme min-h-screen">
      {/* Main content */}
      <main className="relative z-10 flex min-h-screen flex-col items-center px-4 pb-10 pt-8 sm:px-6 sm:pb-12 sm:pt-12 lg:px-8 lg:pb-0 lg:pt-0">
        {/* Header section with headline and subtitle */}
        <header className="mb-8 flex w-full max-w-4xl flex-col items-center justify-center text-center sm:mb-12 lg:mb-20">
          {/* Main headline */}
          <h1 className="mb-4 text-balance text-[clamp(2.35rem,12vw,3rem)] font-bold leading-[1.05] tracking-tight sm:mb-6 sm:text-6xl sm:leading-tight lg:text-7xl">
            <span className="theme-accent-text">{content.homepage_title || 'Can My PC Run GTA VI?'}</span>
          </h1>

          {/* Subtitle */}
          <p className="mb-4 max-w-xl text-base leading-6 text-slate-300 sm:mb-6 sm:max-w-2xl sm:text-xl sm:leading-relaxed">
            {content.homepage_description || 'Check if your gaming rig meets the current requirements for Grand Theft Auto VI. Get instant compatibility results and personalized upgrade recommendations.'}
          </p>

          {/* Disclaimer */}
          <p className="max-w-2xl rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-2 text-xs leading-5 italic text-slate-300 backdrop-blur-sm sm:rounded-full sm:px-4 sm:text-sm">
            {'\u26A0\uFE0F'} {getRequirementLabel()}: {content.estimated_requirements_disclaimer || getRequirementDisclaimer()}
          </p>
        </header>

        <ScreenshotAnalyzer uploadButtonText={content.upload_button_text} manualEntryButtonText={content.manual_entry_button_text} scannerText={content.scanner_coming_soon_text} />

        <HomepageArticles articles={articles} />

        <HomepageFourthwallMerch products={fourthwallProducts} />

        {/* Feature cards section */}
        <section className="grid w-full max-w-5xl grid-cols-1 gap-5 px-0 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Screenshot Detection */}
          <FeatureCard
            icon={'\u{1F4F7}'}
            title="Screenshot Detection"
            description="Upload a screenshot of your system specs to instantly check compatibility."
          />

          {/* Card 2: Manual Compatibility Check */}
          <FeatureCard
            icon={'\u{1F527}'}
            title="Manual Compatibility Check"
            description="Enter your components manually and get a detailed breakdown of your PC's performance."
          />

          {/* Card 3: Upgrade Recommendations */}
          <FeatureCard
            icon={'\u26A1'}
            title="Upgrade Recommendations"
            description="Get personalized upgrade suggestions to meet the current GTA VI requirements."
          />
        </section>

        <HomepageAd className="my-8 w-full max-w-5xl px-0 sm:my-12" />

        <div className="mb-10 mt-8 flex w-full justify-center px-0 sm:mb-16 sm:mt-12">
          <EmailSignup description={content.email_signup_description} heading={content.email_signup_heading} signupSource="homepage" variant="homepage" />
        </div>
      </main>

    </div>
  );
}
