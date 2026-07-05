'use client';
// components/stories/StoryCard.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

interface Profile {
  readonly display_name: string | null;
}

interface Story {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly hero_image_url: string | null;
  readonly tags: string[];
  readonly published_at: string | null;
  readonly profiles?: Profile | null;
}

interface Props {
  readonly story: Story;
}

export default function StoryCard({ story }: Props) {
  const authorName = story.profiles?.display_name || 'Anonymous Volunteer';

  return (
    <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl overflow-hidden flex flex-col justify-between shadow-xl h-full">
      <div>
        {story.hero_image_url ? (
          <img
            src={story.hero_image_url}
            alt={story.title}
            className="w-full h-48 object-cover border-b border-white/5"
          />
        ) : (
          <div className="w-full h-48 bg-white/5 border-b border-white/5 flex flex-col items-center justify-center text-gray-500 gap-2">
            <span className="material-symbols-outlined text-4xl">menu_book</span>
            <span className="text-[10px] uppercase font-mono tracking-wider">Success Story</span>
          </div>
        )}

        <div className="p-5 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h4 className="text-base font-bold text-[var(--empire-cream)] leading-snug">{story.title}</h4>
            <span className="text-[10px] text-gray-400 font-mono">
              Published by: {authorName}
            </span>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed line-clamp-4">{story.content}</p>
        </div>
      </div>

      <div className="p-5 pt-0 flex flex-wrap gap-1.5">
        {story.tags && story.tags.map((tag) => (
          <span key={tag} className="text-[9px] font-bold bg-white/5 text-[var(--empire-gold)] border border-[var(--empire-gold)]/10 px-2 py-0.5 rounded font-mono uppercase">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
}
export type { Story };
