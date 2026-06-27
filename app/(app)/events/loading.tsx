// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
// app/(app)/events/loading.tsx — YouTube-style skeleton loader for TNR events listings

export default function EventsLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-12 py-8 flex flex-col gap-8">
      {/* Header Skeleton */}
      <section className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-pulse">
        <div className="flex flex-col gap-2 max-w-2xl w-full">
          <div className="h-10 bg-zinc-200 dark:bg-zinc-800 w-80 rounded-2xl"></div>
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 w-full rounded-lg mt-2"></div>
        </div>
        <div className="h-12 bg-zinc-200 dark:bg-zinc-800 w-full md:w-44 rounded-full"></div>
      </section>

      {/* Bento Grid Skeleton */}
      <section className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-pulse">
        {/* Featured Card */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 md:p-8 border border-[var(--bg-border)] flex flex-col gap-6 h-[380px]">
          <div className="h-6 bg-zinc-100 dark:bg-zinc-800 w-32 rounded-full"></div>
          <div className="h-8 bg-zinc-100 dark:bg-zinc-800 w-3/4 rounded-xl mt-2"></div>
          <div className="h-4 bg-zinc-100 dark:bg-zinc-800 w-full rounded-lg"></div>
          <div className="h-4 bg-zinc-100 dark:bg-zinc-800 w-5/6 rounded-lg"></div>
          <div className="mt-auto h-12 bg-zinc-100 dark:bg-zinc-800 w-1/3 rounded-full"></div>
        </div>

        {/* Sidebar Cards */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-[var(--bg-border)] flex flex-col gap-6 h-[380px]">
          <div className="h-6 bg-zinc-100 dark:bg-zinc-800 w-24 rounded-full"></div>
          <div className="flex flex-col gap-4">
            <div className="h-16 bg-zinc-100 dark:bg-zinc-800 w-full rounded-xl"></div>
            <div className="h-16 bg-zinc-100 dark:bg-zinc-800 w-full rounded-xl"></div>
            <div className="h-16 bg-zinc-100 dark:bg-zinc-800 w-full rounded-xl"></div>
          </div>
        </div>
      </section>
    </div>
  );
}
