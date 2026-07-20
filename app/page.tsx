import { FeatureCard } from './components/FeatureCard';
import { EmailSignup } from './components/EmailSignup';
import { ScreenshotAnalyzer } from './components/ScreenshotAnalyzer';
import { HomepageArticles } from './components/content/HomepageArticles';
import { HomepageAd } from './components/ads/AdPlacements';
import {
  getRequirementDisclaimer,
  getRequirementLabel,
} from './data/gta6-requirements';
import { getHomepageArticles, getSiteContentMap } from './lib/cms-data';

export const dynamic = 'force-dynamic';
export default async function Home() {
  const [content, articles] = await Promise.all([getSiteContentMap(), getHomepageArticles(3)]);
  return (
    <div className="public-theme min-h-screen">
      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        {/* Header section with headline and subtitle */}
        <header className="flex flex-col items-center justify-center w-full max-w-4xl mb-12 sm:mb-16 lg:mb-20 text-center">
          {/* Main headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 tracking-tight leading-tight">
            <span className="theme-accent-text">{content.homepage_title || 'Can My PC Run GTA VI?'}</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mb-6 leading-relaxed">
            {content.homepage_description || 'Check if your gaming rig meets the current requirements for Grand Theft Auto VI. Get instant compatibility results and personalized upgrade recommendations.'}
          </p>

          {/* Disclaimer */}
          <p className="max-w-2xl rounded-full border border-white/10 bg-slate-950/35 px-4 py-2 text-sm italic text-slate-300 backdrop-blur-sm">
            {'\u26A0\uFE0F'} {getRequirementLabel()}: {content.estimated_requirements_disclaimer || getRequirementDisclaimer()}
          </p>
        </header>

        <ScreenshotAnalyzer uploadButtonText={content.upload_button_text} manualEntryButtonText={content.manual_entry_button_text} scannerText={content.scanner_coming_soon_text} />

        <HomepageArticles articles={articles} />

        {/* Feature cards section */}
        <section className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-4 sm:px-0">
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

        <HomepageAd className="my-10 w-full max-w-5xl px-4 sm:my-12 sm:px-0" />

        <div className="mb-16 mt-10 flex w-full justify-center px-4 sm:mt-12 sm:px-0">
          <EmailSignup description={content.email_signup_description} heading={content.email_signup_heading} signupSource="homepage" variant="homepage" />
        </div>
      </main>

    </div>
  );
}
