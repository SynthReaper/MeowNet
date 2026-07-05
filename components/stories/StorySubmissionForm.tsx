'use client';
// components/stories/StorySubmissionForm.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState, useTransition } from 'react';
import { submitStory } from '@/lib/actions/education';

interface Props {
  readonly onSubmitted?: () => void;
}

export default function StorySubmissionForm({ onSubmitted }: Props) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);

      // Parse tags to JSON array string
      const tagsArray = tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      formData.append('tags', JSON.stringify(tagsArray));

      if (heroImage) {
        formData.append('hero_image', heroImage);
      }

      const res = await submitStory(formData);
      if (res.success) {
        setMessage('Story submitted successfully! Awaiting moderator verification.');
        setTitle('');
        setContent('');
        setTagsStr('');
        setHeroImage(null);
        if (onSubmitted) onSubmitted();
      } else {
        setMessage(res.error || 'Failed to submit story.');
      }
    });
  };

  return (
    <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl flex flex-col gap-5 w-full">
      <div>
        <h3 className="text-lg font-bold text-[var(--empire-cream)]">Share a Success Story</h3>
        <p className="text-xs text-gray-400 mt-1">Document a rescue mission, TNR campaign milestone, or stray cat adoption success.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Story Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. The Miracle of Colony 7"
            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Story Narrative</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            placeholder="Write details about the rescue, volunteers involved, veterinary support..."
            className="w-full h-32 bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Tags (comma-separated)</label>
            <input
              type="text"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="e.g. tnr, rescue, adoption"
              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Hero Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setHeroImage(e.target.files?.[0] || null)}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-gray-400 focus:border-[var(--life-teal)] outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="bg-[var(--life-teal)] text-white hover:opacity-90 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50 mt-2"
        >
          {isPending ? 'Submitting...' : 'Submit Story'}
        </button>
      </form>

      {message && (
        <div className="text-center text-xs font-bold text-[var(--empire-gold)] mt-2">
          {message}
        </div>
      )}
    </div>
  );
}
