import { FeatureCard } from './components/FeatureCard';
import { ScreenshotAnalyzer } from './components/ScreenshotAnalyzer';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Subtle background gradient overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-900/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-900/20 rounded-full blur-3xl"></div>
      </div>

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        {/* Header section with headline and subtitle */}
        <header className="flex flex-col items-center justify-center w-full max-w-4xl mb-12 sm:mb-16 lg:mb-20 text-center">
          {/* Main headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 tracking-tight leading-tight">
            Can My PC Run
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              GTA VI?
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mb-6 leading-relaxed">
            Check if your gaming rig meets the estimated requirements for Grand Theft Auto VI. Get
            instant compatibility results and personalized upgrade recommendations.
          </p>

          {/* Disclaimer */}
          <p className="text-sm text-slate-400 italic max-w-2xl">
            {'\u26A0\uFE0F'} Disclaimer: Rockstar Games has not released official PC requirements.
            These are community estimates based on available information.
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
            description="Get personalized upgrade suggestions to meet the estimated GTA VI requirements."
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-slate-800 bg-slate-950/50 py-8 text-center text-sm text-slate-400">
        <p>
          Made for gaming enthusiasts
          {' \u2022 '}
          Stay tuned for GTA VI
          {' \u2022 '}
          <a href="#privacy" className="text-blue-400 hover:text-blue-300 ml-1">
            Privacy Policy
          </a>
        </p>
      </footer>
    </div>
  );
}
