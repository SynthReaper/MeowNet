// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
// app/(app)/cats/loading.tsx — YouTube-style skeleton loader for cat listing directory

export default function CatsLoading() {
  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-12 py-10 md:py-16 flex flex-col gap-10">
      {/* Header Skeleton */}
      <section className="flex flex-col gap-2 max-w-3xl animate-pulse">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 w-64 rounded-2xl"></div>
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 w-full rounded-lg mt-2"></div>
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 w-5/6 rounded-lg"></div>
      </section>

      {/* Toolbar Skeleton */}
      <section className="bg-white rounded-xl p-4 md:p-6 shadow-ambient flex flex-col md:flex-row gap-6 items-center justify-between border border-[var(--bg-border)] animate-pulse">
        <div className="h-12 bg-zinc-100 dark:bg-zinc-800 w-full md:w-96 rounded-full"></div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          <div className="h-8 bg-zinc-100 dark:bg-zinc-800 w-20 rounded-full"></div>
          <div className="h-8 bg-zinc-100 dark:bg-zinc-800 w-24 rounded-full"></div>
          <div className="h-8 bg-zinc-100 dark:bg-zinc-800 w-24 rounded-full"></div>
        </div>
      </section>

      {/* Grid Skeleton */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-[var(--bg-border)] shadow-ambient p-4 flex flex-col gap-4 animate-pulse h-full min-h-[300px]">
            <div className="w-full h-48 bg-zinc-100 dark:bg-zinc-800 rounded-lg"></div>
            <div className="h-6 bg-zinc-100 dark:bg-zinc-800 w-2/3 rounded-md"></div>
            <div className="flex gap-2 mt-1">
              <div className="h-5 bg-zinc-100 dark:bg-zinc-800 w-16 rounded-full"></div>
              <div className="h-5 bg-zinc-100 dark:bg-zinc-800 w-24 rounded-full"></div>
            </div>
            <div className="mt-auto h-4 bg-zinc-100 dark:bg-zinc-800 w-1/2 rounded-md"></div>
          </div>
        ))}
      </section>
    </div>
  );
}
