import { FeatureCard } from './components/FeatureCard';
import { EmailSignup } from './components/EmailSignup';
import { ScreenshotAnalyzer } from './components/ScreenshotAnalyzer';
import {
  getRequirementDisclaimer,
  getRequirementLabel,
} from './data/gta6-requirements';

export default function Home() {
  return (
    <div className="public-theme min-h-screen">
      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        {/* Header section with headline and subtitle */}
        <header className="flex flex-col items-center justify-center w-full max-w-4xl mb-12 sm:mb-16 lg:mb-20 text-center">
          {/* Main headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 tracking-tight leading-tight">
            Can My PC Run
            <br />
            <span className="theme-accent-text">
              GTA VI?
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mb-6 leading-relaxed">
            Check if your gaming rig meets the current requirements for Grand Theft Auto VI. Get
            instant compatibility results and personalized upgrade recommendations.
          </p>

          {/* Disclaimer */}
          <p className="max-w-2xl rounded-full border border-white/10 bg-slate-950/35 px-4 py-2 text-sm italic text-slate-300 backdrop-blur-sm">
            {'\u26A0\uFE0F'} {getRequirementLabel()}: {getRequirementDisclaimer()}
          </p>
        </header>

        <ScreenshotAnalyzer />

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

        <div className="mb-16 mt-10 flex w-full justify-center px-4 sm:mt-12 sm:px-0">
          <EmailSignup signupSource="homepage" variant="homepage" />
        </div>
      </main>

    </div>
  );
}
