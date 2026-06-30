// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
// app/(app)/community/loading.tsx — 2-column channel layout skeleton loader for community discussion room

export default function CommunityLoading() {
  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-[var(--bg-surface)] animate-pulse">
      {/* Sidebar Skeleton */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-[var(--bg-elevated)] border-r border-[var(--bg-border)]">
        {/* Workspace header skeleton */}
        <div className="px-4 py-4 border-b border-[var(--bg-border)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0"></div>
          <div className="flex flex-col gap-1.5 flex-grow">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 w-24 rounded"></div>
            <div className="h-3 bg-zinc-200/60 dark:bg-zinc-800/60 w-16 rounded"></div>
          </div>
        </div>

        {/* Channels list skeleton */}
        <div className="flex-1 py-4 px-3 flex flex-col gap-3">
          <div className="h-3 bg-zinc-200/50 dark:bg-zinc-800/50 w-12 rounded px-2 mb-2"></div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg">
              <div className="w-4 h-4 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
              <div className="h-4 bg-zinc-200/80 dark:bg-zinc-800/80 w-32 rounded"></div>
            </div>
          ))}
        </div>

        {/* User footer skeleton */}
        <div className="px-4 py-3 border-t border-[var(--bg-border)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0"></div>
          <div className="flex flex-col gap-1.5 flex-grow">
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 w-20 rounded"></div>
            <div className="h-2.5 bg-zinc-200/60 dark:bg-zinc-800/60 w-12 rounded"></div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area Skeleton */}
      <div className="flex-grow flex flex-col min-w-0 overflow-hidden bg-[var(--bg-surface)]">
        {/* Channel Header skeleton */}
        <div className="shrink-0 px-6 py-4 border-b border-[var(--bg-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-zinc-200 dark:bg-zinc-800 rounded shrink-0"></div>
            <div className="flex flex-col gap-1.5">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 w-28 rounded"></div>
              <div className="h-3 bg-zinc-200/60 dark:bg-zinc-800/60 w-48 rounded"></div>
            </div>
          </div>
          <div className="h-3 bg-zinc-200/60 dark:bg-zinc-800/60 w-16 rounded"></div>
        </div>

        {/* Message feed skeleton */}
        <div className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0 mt-0.5"></div>
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 w-32 rounded"></div>
                  <div className="h-3 bg-zinc-200/40 dark:bg-zinc-800/40 w-16 rounded"></div>
                </div>
                <div className="h-4 bg-zinc-200/80 dark:bg-zinc-800/80 w-3/4 rounded"></div>
                <div className="h-4 bg-zinc-200/80 dark:bg-zinc-800/80 w-1/2 rounded"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Input box skeleton */}
        <div className="shrink-0 border-t border-[var(--bg-border)] px-6 py-4">
          <div className="h-11 bg-zinc-200/70 dark:bg-zinc-800/70 rounded-xl w-full flex items-center justify-between px-4">
            <div className="h-4 bg-zinc-200/30 dark:bg-zinc-800/30 w-48 rounded"></div>
            <div className="w-7 h-7 bg-zinc-200/30 dark:bg-zinc-800/30 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
