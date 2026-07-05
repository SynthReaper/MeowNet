'use client';
// components/stories/StoriesHubClient.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState } from 'react';
import Link from 'next/link';
import StoryCard, { Story } from '@/components/stories/StoryCard';
import StorySubmissionForm from '@/components/stories/StorySubmissionForm';

interface AdoptedCat {
  readonly id: string;
  readonly name: string | null;
  readonly photo_url: string;
  readonly status: string;
  readonly breed_estimate: string | null;
  readonly age_estimate: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly profiles?: {
    readonly display_name: string | null;
  } | null;
}

interface Props {
  readonly adoptedCats: AdoptedCat[];
  readonly stories: Story[];
}

export default function StoriesHubClient({ adoptedCats, stories }: Props) {
  const [activeTab, setActiveTab] = useState<'adopted' | 'stories'>('adopted');
  const [storiesList, setStoriesList] = useState<Story[]>(stories);

  const formatFriendlyDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr.slice(0, 10);
    }
  };

  const handleStorySubmitted = async () => {
    // Refresh story list
    const res = await fetch('/api/stories');
    const data = await res.json();
    if (data.stories) setStoriesList(data.stories);
  };

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-12 py-10 md:py-16 flex flex-col gap-10">
      {/* Header Section */}
      <section className="flex flex-col gap-2 max-w-3xl">
        <h1 className="font-display text-4xl font-bold text-[var(--empire-cream)] flex items-center gap-2">
          <span className="material-symbols-outlined text-4xl text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
          <span>Success Chronicles &amp; Happy Tails</span>
        </h1>
        <p className="font-body text-lg text-[var(--empire-cream)]/70">
          The ultimate goal of MeowNet. Celebrate the community's collective impact as felines find loving forever homes.
        </p>
      </section>

      {/* Tabs */}
      <div className="flex border-b border-white/5 gap-6">
        <button
          onClick={() => setActiveTab('adopted')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'adopted'
              ? 'border-[var(--life-teal)] text-[var(--empire-cream)]'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Happy Tails ({adoptedCats.length})
        </button>
        <button
          onClick={() => setActiveTab('stories')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'stories'
              ? 'border-[var(--life-teal)] text-[var(--empire-cream)]'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Chronicles Queue ({storiesList.length})
        </button>
      </div>

      {activeTab === 'adopted' ? (
        <section className="w-full">
          {adoptedCats.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-4xl text-[var(--empire-gold)]/40">pets</span>
              <h3 className="font-display text-base font-bold text-[var(--empire-cream)]">Awaiting happy stories</h3>
              <p className="font-body text-xs text-[var(--empire-cream)]/60 max-w-sm">
                No cat sightings have been marked as adopted yet. Keep up the rescue and volunteer work!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {adoptedCats.map((cat) => (
                <div
                  key={cat.id}
                  className="story-card flex flex-col h-full bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all"
                >
                  {/* Photo frame */}
                  <div className="h-56 bg-black/40 relative overflow-hidden border-b border-white/5 flex items-center justify-center">
                    {cat.photo_url ? (
                      <img src={cat.photo_url} alt={cat.name || 'Happy cat'} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-5xl text-[var(--empire-gold)]/30">pets</span>
                    )}
                    <span className="absolute top-3 right-3 bg-[var(--life-teal)] text-white text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm">
                      Adopted
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex flex-col gap-3 flex-grow justify-between">
                    <div className="flex flex-col gap-1.5">
                      <h3 className="font-display text-base font-bold text-[var(--empire-cream)] truncate">
                        {cat.name || 'Happy Feline'}
                      </h3>
                      <p className="font-body text-[10px] text-[var(--empire-cream)]/60 font-semibold uppercase tracking-wider">
                        {cat.breed_estimate || 'Community Tabby'} · {cat.age_estimate || 'Adult'}
                      </p>
                      <p className="font-body text-xs text-[var(--empire-cream)]/75 mt-1 leading-relaxed italic">
                        "I have officially moved from the streets into a loving forever home! Big purrs to everyone who looked out for me."
                      </p>
                    </div>

                    <div className="border-t border-white/5 pt-3 mt-2 flex flex-col gap-1 text-[10px] font-body text-[var(--empire-cream)]/50">
                      <div className="flex justify-between">
                        <span>Sighted By:</span>
                        <strong className="text-[var(--empire-cream)]/70">{cat.profiles?.display_name || 'Volunteer'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Happy Tail Date:</span>
                        <strong className="text-[var(--empire-cream)]/70">{formatFriendlyDate(cat.updated_at)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <section className="lg:col-span-2 flex flex-col gap-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Published Chronicles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {storiesList.length === 0 ? (
                <div className="col-span-full border border-dashed border-white/10 rounded-2xl p-12 text-center text-xs text-gray-500 font-mono">
                  No success stories have been published yet. Be the first to share one!
                </div>
              ) : (
                storiesList.map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))
              )}
            </div>
          </section>

          <section className="lg:col-span-1">
            <StorySubmissionForm onSubmitted={handleStorySubmitted} />
          </section>
        </div>
      )}
    </div>
  );
}
