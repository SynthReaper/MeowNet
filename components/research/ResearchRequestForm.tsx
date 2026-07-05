'use client';
// components/research/ResearchRequestForm.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState, useTransition } from 'react';
import { requestResearchData } from '@/lib/actions/partners';

interface Props {
  readonly defaultEmail: string;
}

export default function ResearchRequestForm({ defaultEmail }: Props) {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState(defaultEmail);
  const [institution, setInstitution] = useState('');
  const [purpose, setPurpose] = useState('');
  const [dataTypes, setDataTypes] = useState<string[]>(['colony_welfare']);
  const [message, setMessage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (purpose.length < 50) {
      setMessage('Research focus description must be at least 50 characters.');
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.append('researcher_email', email);
      formData.append('institution', institution);
      formData.append('research_purpose', purpose);
      formData.append('requested_data_types', JSON.stringify(dataTypes));

      const res = await requestResearchData(formData);
      if (res.success && res.requestId) {
        setRequestId(res.requestId);
        setMessage('Research request submitted successfully. Copy your Request ID and wait for administrator approval.');
        setInstitution('');
        setPurpose('');
      } else {
        setMessage(res.error || 'Failed to submit request.');
      }
    });
  };

  const handleToggleDataType = (type: string) => {
    setDataTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-2xl p-6 shadow-xl flex flex-col gap-5">
      <div>
        <h3 className="text-base font-bold text-[var(--empire-cream)]">Request Population Export</h3>
        <p className="text-xs text-gray-400 mt-1">Submit your academic application for aggregate TNR and fuzzed population records.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs font-body text-[var(--empire-cream)]">
        <div>
          <label htmlFor="res-email" className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Researcher Email</label>
          <input
            id="res-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your-name@institution.edu"
            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none"
          />
        </div>

        <div>
          <label htmlFor="res-inst" className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Institution / Association Name</label>
          <input
            id="res-inst"
            type="text"
            required
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="e.g. University of Seattle Biology Department"
            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Requested Data Streams</label>
          <div className="flex flex-col gap-2">
            {[
              { id: 'colony_welfare', label: 'Colony Welfare Statistics' },
              { id: 'tnr_effectiveness', label: 'TNR Effectiveness Curves' },
              { id: 'fuzzed_density', label: 'Fuzzed Density Quadrants' },
            ].map((type) => (
              <label key={type.id} className="flex items-center gap-2 cursor-pointer text-xs text-gray-400 hover:text-white">
                <input
                  type="checkbox"
                  checked={dataTypes.includes(type.id)}
                  onChange={() => handleToggleDataType(type.id)}
                  className="rounded bg-black/60 border-white/10 text-[var(--life-teal)] focus:ring-[var(--life-teal)]"
                />
                <span className="ml-2">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="res-purpose" className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Intended Research Focus (min 50 chars)</label>
          <textarea
            id="res-purpose"
            required
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Describe in detail how you will use this dataset to model stray migrations, vaccine density spreads, etc..."
            className="w-full h-24 bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isPending || dataTypes.length === 0}
          className="bg-[var(--life-teal)] text-white hover:opacity-90 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
        >
          {isPending ? 'Submitting Request...' : 'Submit Application'}
        </button>
      </form>

      {message && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-center flex flex-col gap-2">
          <p className="font-bold text-[var(--empire-gold)]">{message}</p>
          {requestId && (
            <div className="mt-1">
              <span className="text-[10px] text-gray-500 block uppercase font-mono tracking-wider">Request ID</span>
              <code className="text-xs font-mono font-black text-[var(--empire-cream)] select-all bg-black/40 px-2 py-1 rounded border border-white/5 mt-1 inline-block">
                {requestId}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
