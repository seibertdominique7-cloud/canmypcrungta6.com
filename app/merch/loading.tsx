export default function MerchLoading() {
  return (
    <main className="public-theme min-h-screen px-4 py-10 text-slate-100 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl" aria-busy="true" aria-label="Loading merchandise">
        <div className="mx-auto h-12 w-72 animate-pulse rounded-2xl bg-white/10" />
        <div className="mx-auto mt-4 h-5 w-full max-w-xl animate-pulse rounded-full bg-white/5" />
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              className="theme-glass-card overflow-hidden rounded-3xl"
              key={index}
            >
              <div className="aspect-square animate-pulse bg-white/5" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-4/5 animate-pulse rounded-full bg-white/10" />
                <div className="h-4 w-2/5 animate-pulse rounded-full bg-white/5" />
                <div className="h-10 animate-pulse rounded-xl bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
