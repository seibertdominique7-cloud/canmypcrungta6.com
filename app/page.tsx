'use client';

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
            Can My PC Run<br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              GTA VI?
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mb-6 leading-relaxed">
            Check if your gaming rig meets the estimated requirements for Grand Theft Auto VI. Get instant compatibility results and personalized upgrade recommendations.
          </p>

          {/* Disclaimer */}
          <p className="text-sm text-slate-400 italic max-w-2xl">
            ⚠️ Disclaimer: Rockstar Games has not released official PC requirements. These are community estimates based on available information.
          </p>
        </header>

        {/* CTA Buttons section */}
        <section className="flex flex-col sm:flex-row gap-4 sm:gap-3 mb-16 lg:mb-24 w-full max-w-3xl px-4 sm:px-0">
          {/* Primary button - Upload Screenshot */}
          <a
            href="#upload-screenshot"
            className="flex-1 py-4 px-8 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/50 text-center text-lg"
            aria-label="Upload screenshot of your system specs"
          >
            📸 Upload Screenshot
          </a>

          {/* Secondary button - Manual Entry */}
          <a
            href="#manual-entry"
            className="flex-1 py-4 px-8 border-2 border-slate-400 hover:border-slate-200 text-slate-200 hover:text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 hover:bg-slate-800/50 text-center text-lg"
            aria-label="Enter your PC specs manually"
          >
            ⚙️ Enter Specs Manually
          </a>

          {/* Tertiary button - Download Scanner */}
          <a
            href="#download-scanner"
            className="flex-1 py-4 px-8 text-slate-300 hover:text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 border border-transparent hover:border-blue-400/50 text-center text-lg hover:bg-slate-800/30"
            aria-label="Download PC scanner tool in beta"
          >
            ⬇️ Download Scanner (Beta)
          </a>
        </section>

        {/* Feature cards section */}
        <section className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-4 sm:px-0">
          
          {/* Card 1: Screenshot Detection */}
          <FeatureCard
            icon="📷"
            title="Screenshot Detection"
            description="Upload a screenshot of your system specs to instantly check compatibility."
          />

          {/* Card 2: Manual Compatibility Check */}
          <FeatureCard
            icon="🔧"
            title="Manual Compatibility Check"
            description="Enter your components manually and get a detailed breakdown of your PC's performance."
          />

          {/* Card 3: Upgrade Recommendations */}
          <FeatureCard
            icon="⚡"
            title="Upgrade Recommendations"
            description="Get personalized upgrade suggestions to meet the estimated GTA VI requirements."
          />

        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-slate-800 bg-slate-950/50 py-8 text-center text-sm text-slate-400">
        <p>
          Made for gaming enthusiasts • Stay tuned for GTA VI • 
          <a href="#privacy" className="text-blue-400 hover:text-blue-300 ml-1">Privacy Policy</a>
        </p>
      </footer>
    </div>
  );
}

/**
 * FeatureCard Component
 * A glass-morphism styled card with icon, title, and description
 * Includes hover effects for interactivity
 */
interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="group relative p-8 rounded-xl backdrop-blur-md bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent pointer-events-none"></div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col gap-4">
        {/* Icon */}
        <span className="text-5xl mb-2 block transform group-hover:scale-110 transition-transform duration-300">
          {icon}
        </span>
        
        {/* Title */}
        <h3 className="text-xl font-bold text-white leading-tight">
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-slate-300 leading-relaxed text-base">
          {description}
        </p>
      </div>

      {/* Subtle bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full"></div>
    </div>
  );
}
