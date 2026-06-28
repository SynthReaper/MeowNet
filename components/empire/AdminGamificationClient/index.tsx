'use client';
// components/empire/AdminGamificationClient/index.tsx — Admin Gamification Controls (Client Component)

import React, { useState } from 'react';
import { createTriviaQuestion, createBingoTask, createGuild } from '@/lib/actions/gamification';

interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface BingoTemplate {
  id: string;
  label: string;
  type: string;
  description: string | null;
}

interface Guild {
  id: string;
  name: string;
  description: string | null;
  points: number;
}

interface AdminGamificationClientProps {
  initialTrivia: TriviaQuestion[];
  initialBingo: BingoTemplate[];
  initialGuilds: Guild[];
}

export default function AdminGamificationClient({
  initialTrivia,
  initialBingo,
  initialGuilds
}: AdminGamificationClientProps) {
  const [activeTab, setActiveTab] = useState<'trivia' | 'bingo' | 'guilds'>('trivia');
  const [triviaList, setTriviaList] = useState<TriviaQuestion[]>(initialTrivia);
  const [bingoList, setBingoList] = useState<BingoTemplate[]>(initialBingo);
  const [guildsList, setGuildsList] = useState<Guild[]>(initialGuilds);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [triviaForm, setTriviaForm] = useState({
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: ''
  });

  const [bingoForm, setBingoForm] = useState({
    label: '',
    type: 'log_cat',
    description: ''
  });

  const [guildForm, setGuildForm] = useState({
    name: '',
    description: '',
    logoUrl: ''
  });

  const handleTriviaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triviaForm.question || triviaForm.options.some(o => !o)) {
      setError('Please fill in the question and all 4 options.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await createTriviaQuestion(
        triviaForm.question,
        triviaForm.options,
        triviaForm.correctIndex,
        triviaForm.explanation
      ) as any;

      if (res.success && res.question) {
        setSuccess('Trivia question created successfully!');
        setTriviaList(prev => [...prev, res.question as TriviaQuestion]);
        setTriviaForm({
          question: '',
          options: ['', '', '', ''],
          correctIndex: 0,
          explanation: ''
        });
      } else {
        setError(res.error || 'Failed to create trivia question.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBingoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bingoForm.label || !bingoForm.description) {
      setError('Please fill in the label and description.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await createBingoTask(
        bingoForm.label,
        bingoForm.type,
        bingoForm.description
      ) as any;

      if (res.success && res.task) {
        setSuccess('Bingo task template created successfully!');
        setBingoList(prev => [...prev, res.task as BingoTemplate]);
        setBingoForm({
          label: '',
          type: 'log_cat',
          description: ''
        });
      } else {
        setError(res.error || 'Failed to create bingo task.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guildForm.name || !guildForm.description) {
      setError('Please fill in the guild name and description.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await createGuild(
        guildForm.name,
        guildForm.description,
        guildForm.logoUrl || undefined
      ) as any;

      if (res.success && res.guild) {
        setSuccess('Guild created successfully!');
        setGuildsList(prev => [...prev, res.guild as Guild]);
        setGuildForm({
          name: '',
          description: '',
          logoUrl: ''
        });
      } else {
        setError(res.error || 'Failed to create guild.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold flex items-center gap-2">
          <span className="material-symbols-outlined">info</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-[#e9faf4] border border-[#8bf1e6] text-[#0d594b] text-sm font-bold flex items-center gap-2">
          <span className="material-symbols-outlined">check_circle</span>
          <span>{success}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--bg-border)]/50 gap-4">
        {(['trivia', 'bingo', 'guilds'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setError(null); setSuccess(null); }}
            className={`py-3.5 px-4 font-display text-sm font-extrabold capitalize border-b-2 transition-all cursor-pointer ${
              activeTab === tab
                ? 'border-[var(--empire-gold)] text-[var(--empire-gold)]'
                : 'border-transparent text-[var(--empire-cream)]/50 hover:text-[var(--empire-cream)]'
            }`}
          >
            {tab === 'trivia' ? 'Daily Trivia' : tab === 'bingo' ? 'Bingo Tasks' : 'Regional Guilds'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Creator Forms (Left - 5 columns) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-[var(--bg-border)] flex flex-col gap-4 shadow-sm">
          <h2 className="font-display text-base text-[var(--empire-cream)] font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--life-teal)]">add_box</span>
            <span>Create New Content</span>
          </h2>

          {activeTab === 'trivia' && (
            <form onSubmit={handleTriviaSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-body text-xs font-bold text-[var(--empire-cream)]/60">Question Text</label>
                <textarea
                  required
                  value={triviaForm.question}
                  onChange={e => setTriviaForm(prev => ({ ...prev, question: e.target.value }))}
                  className="p-3 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--empire-cream)] bg-[var(--bg-elevated)] min-h-[60px]"
                  placeholder="e.g. What is the recommended bedding material..."
                />
              </div>

              {triviaForm.options.map((option, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  <label className="font-body text-[10px] font-bold text-[var(--empire-cream)]/60">Option {idx + 1}</label>
                  <input
                    required
                    type="text"
                    value={option}
                    onChange={e => {
                      const opts = [...triviaForm.options];
                      opts[idx] = e.target.value;
                      setTriviaForm(prev => ({ ...prev, options: opts }));
                    }}
                    className="p-2.5 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--empire-cream)] bg-[var(--bg-elevated)]"
                    placeholder={`e.g. Choice ${idx + 1}`}
                  />
                </div>
              ))}

              <div className="flex flex-col gap-1.5">
                <label className="font-body text-xs font-bold text-[var(--empire-cream)]/60">Correct Option Index</label>
                <select
                  value={triviaForm.correctIndex}
                  onChange={e => setTriviaForm(prev => ({ ...prev, correctIndex: Number(e.target.value) }))}
                  className="p-2.5 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--empire-cream)] bg-[var(--bg-elevated)] cursor-pointer"
                >
                  <option value={0}>Option 1</option>
                  <option value={1}>Option 2</option>
                  <option value={2}>Option 3</option>
                  <option value={3}>Option 4</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-body text-xs font-bold text-[var(--empire-cream)]/60">Educational Explanation</label>
                <textarea
                  required
                  value={triviaForm.explanation}
                  onChange={e => setTriviaForm(prev => ({ ...prev, explanation: e.target.value }))}
                  className="p-3 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--empire-cream)] bg-[var(--bg-elevated)] min-h-[60px]"
                  placeholder="e.g. Straw is highly recommended because it repels moisture..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[var(--life-teal)] hover:bg-[#6edcd0] text-white rounded-xl font-display text-xs font-extrabold cursor-pointer transition-all shadow-sm"
              >
                {isSubmitting ? 'Publishing...' : 'Publish Question'}
              </button>
            </form>
          )}

          {activeTab === 'bingo' && (
            <form onSubmit={handleBingoSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-body text-xs font-bold text-[var(--empire-cream)]/60">Square Label</label>
                <input
                  required
                  type="text"
                  value={bingoForm.label}
                  onChange={e => setBingoForm(prev => ({ ...prev, label: e.target.value }))}
                  className="p-2.5 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--empire-cream)] bg-[var(--bg-elevated)]"
                  placeholder="e.g. Clean EXIF Photo"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-body text-xs font-bold text-[var(--empire-cream)]/60">Task Type Key</label>
                <select
                  value={bingoForm.type}
                  onChange={e => setBingoForm(prev => ({ ...prev, type: e.target.value }))}
                  className="p-2.5 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--empire-cream)] bg-[var(--bg-elevated)] cursor-pointer"
                >
                  <option value="log_cat">Log Stray Cat</option>
                  <option value="check_weather">Check Weather safety watch</option>
                  <option value="view_map">Check Leaflet Map</option>
                  <option value="join_chat">Message in Channel</option>
                  <option value="trivia_complete">Submit Daily Trivia</option>
                  <option value="fuzz_location">Snap location coordinates</option>
                  <option value="clean_exif">Strip EXIF image upload</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-body text-xs font-bold text-[var(--empire-cream)]/60">Task Description</label>
                <textarea
                  required
                  value={bingoForm.description}
                  onChange={e => setBingoForm(prev => ({ ...prev, description: e.target.value }))}
                  className="p-3 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--empire-cream)] bg-[var(--bg-elevated)] min-h-[60px]"
                  placeholder="e.g. Upload a photo sighting with location snaps fuzzed..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[var(--life-teal)] hover:bg-[#6edcd0] text-white rounded-xl font-display text-xs font-extrabold cursor-pointer transition-all shadow-sm"
              >
                {isSubmitting ? 'Publishing...' : 'Publish Bingo Task'}
              </button>
            </form>
          )}

          {activeTab === 'guilds' && (
            <form onSubmit={handleGuildSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-body text-xs font-bold text-[var(--empire-cream)]/60">Guild Name</label>
                <input
                  required
                  type="text"
                  value={guildForm.name}
                  onChange={e => setGuildForm(prev => ({ ...prev, name: e.target.value }))}
                  className="p-2.5 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--empire-cream)] bg-[var(--bg-elevated)]"
                  placeholder="e.g. West Side Felines Guild"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-body text-xs font-bold text-[var(--empire-cream)]/60">Description</label>
                <textarea
                  required
                  value={guildForm.description}
                  onChange={e => setGuildForm(prev => ({ ...prev, description: e.target.value }))}
                  className="p-3 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--empire-cream)] bg-[var(--bg-elevated)] min-h-[60px]"
                  placeholder="e.g. Coordinating rescue loops across..."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-body text-xs font-bold text-[var(--empire-cream)]/60">Logo URL (Optional)</label>
                <input
                  type="text"
                  value={guildForm.logoUrl}
                  onChange={e => setGuildForm(prev => ({ ...prev, logoUrl: e.target.value }))}
                  className="p-2.5 border border-[var(--bg-border)] rounded-xl font-body text-xs text-[var(--empire-cream)] bg-[var(--bg-elevated)]"
                  placeholder="e.g. https://images.unsplash.com/photo-..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[var(--life-teal)] hover:bg-[#6edcd0] text-white rounded-xl font-display text-xs font-extrabold cursor-pointer transition-all shadow-sm"
              >
                {isSubmitting ? 'Creating...' : 'Create Guild'}
              </button>
            </form>
          )}
        </div>

        {/* Existing Content Registry (Right - 7 columns) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-[var(--bg-border)] flex flex-col gap-4 shadow-sm">
          <h2 className="font-display text-base text-[var(--empire-cream)] font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>lists</span>
            <span>Existing Registry ({activeTab === 'trivia' ? triviaList.length : activeTab === 'bingo' ? bingoList.length : guildsList.length})</span>
          </h2>

          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2">
            {activeTab === 'trivia' && triviaList.map((q, idx) => (
              <div key={q.id} className="p-4 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] flex flex-col gap-2">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-display text-xs font-black text-[var(--empire-gold)]">Q{idx + 1}</span>
                  <p className="font-body text-xs font-bold text-[var(--empire-cream)] flex-grow leading-snug">{q.question}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {q.options.map((opt, oIdx) => (
                    <span
                      key={oIdx}
                      className={`px-2 py-1 rounded text-[10px] font-semibold border ${
                        oIdx === q.correct_index
                          ? 'bg-[#e9faf4] border-[#8bf1e6] text-[#0d594b]'
                          : 'bg-white border-[var(--bg-border)]/40 text-[var(--empire-cream)]/60'
                      }`}
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {activeTab === 'bingo' && bingoList.map((t) => (
              <div key={t.id} className="p-4 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-display text-xs font-extrabold text-[var(--empire-cream)]">{t.label}</span>
                  <span className="bg-[var(--bg-border)] border border-black/5 text-[9px] font-bold text-[var(--empire-cream)]/50 px-2 py-0.5 rounded-full">
                    {t.type}
                  </span>
                </div>
                <p className="font-body text-[10px] text-[var(--empire-cream)]/50 font-medium leading-relaxed">{t.description}</p>
              </div>
            ))}

            {activeTab === 'guilds' && guildsList.map((g) => (
              <div key={g.id} className="p-4 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-display text-xs font-extrabold text-[var(--empire-cream)]">{g.name}</span>
                  <span className="font-body text-[10px] font-bold text-[var(--empire-gold)] flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                    <span>{g.points} points</span>
                  </span>
                </div>
                <p className="font-body text-[10px] text-[var(--empire-cream)]/50 font-medium leading-relaxed">{g.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
