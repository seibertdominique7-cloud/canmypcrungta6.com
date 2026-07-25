interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

/**
 * A glass-morphism styled card with icon, title, and description.
 */
export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="theme-glass-card group relative rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:border-fuchsia-300/35 hover:shadow-2xl hover:shadow-fuchsia-950/25 sm:p-8">
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-fuchsia-400/[0.06] via-violet-400/[0.035] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>

      <div className="relative z-10 flex flex-col gap-3 sm:gap-4">
        <span className="mb-0 block transform text-4xl transition-transform duration-300 group-hover:scale-110 sm:mb-2 sm:text-5xl">
          {icon}
        </span>

        <h3 className="text-xl font-bold text-white leading-tight">{title}</h3>

        <p className="text-slate-300 leading-relaxed text-base">{description}</p>
      </div>

      <div className="absolute bottom-0 left-5 right-5 h-px rounded-full bg-gradient-to-r from-transparent via-fuchsia-300/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
    </div>
  );
}
