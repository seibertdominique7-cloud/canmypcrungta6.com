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
    <div className="group relative p-8 rounded-xl backdrop-blur-md bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent pointer-events-none"></div>

      <div className="relative z-10 flex flex-col gap-4">
        <span className="text-5xl mb-2 block transform group-hover:scale-110 transition-transform duration-300">
          {icon}
        </span>

        <h3 className="text-xl font-bold text-white leading-tight">{title}</h3>

        <p className="text-slate-300 leading-relaxed text-base">{description}</p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full"></div>
    </div>
  );
}
