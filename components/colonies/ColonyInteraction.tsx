'use client';
// components/colonies/ColonyInteraction.tsx — Client component for Colony detail interactions

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { joinColonyAsCaretaker, updateColonyStats } from '@/lib/actions/colonies';

interface Props {
  colonyId: string;
  caretakerId: string | null;
  createdBy: string | null;
  currentUserId: string | null;
  userRole: string;
  populationEstimate: number;
  tnrCount: number;
}

export default function ColonyInteraction({
  colonyId,
  caretakerId,
  createdBy,
  currentUserId,
  userRole,
  populationEstimate,
  tnrCount,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pop, setPop] = useState(populationEstimate);
  const [tnr, setTnr] = useState(tnrCount);
  const [error, setError] = useState<string | null>(null);

  const isAuthorizedToUpdate = 
    currentUserId && 
    (currentUserId === caretakerId || 
     currentUserId === createdBy || 
     userRole === 'admin' || 
     userRole === 'moderator');

  const handleJoin = async () => {
    if (!confirm('Are you sure you want to register as the caretaker for this colony?')) return;
    setLoading(true);
    try {
      const res = await joinColonyAsCaretaker(colonyId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Failed to join colony.');
      }
    } catch {
      alert('Network error.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tnr > pop) {
      setError("TNR count cannot be greater than the estimated population.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await updateColonyStats(colonyId, pop, tnr);
      if (res.success) {
        setIsModalOpen(false);
        router.refresh();
      } else {
        setError(res.error || 'Failed to update colony statistics.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-3 flex-wrap">
      {currentUserId && !caretakerId && (
        <button
          onClick={handleJoin}
          disabled={loading}
          className="bg-[var(--life-teal)] text-white hover:opacity-90 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-base">volunteer_activism</span>
          <span>Become Caretaker</span>
        </button>
      )}

      {isAuthorizedToUpdate && (
        <button
          onClick={() => {
            setPop(populationEstimate);
            setTnr(tnrCount);
            setIsModalOpen(true);
          }}
          className="bg-[var(--bg-elevated)] border border-[var(--bg-border)]/60 text-[var(--empire-cream)] hover:bg-[var(--bg-border)]/20 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">edit_note</span>
          <span>Update Statistics</span>
        </button>
      )}

      {/* Stats Update Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[var(--bg-surface)] border border-[var(--bg-border)]/50 shadow-2xl rounded-2xl z-10 p-6 flex flex-col gap-4">
            <div>
              <h3 className="font-display text-lg font-bold text-[var(--empire-gold)] flex items-center gap-2">
                <span className="material-symbols-outlined">edit_note</span>
                <span>Update Colony Stats</span>
              </h3>
              <p className="font-body text-[10px] text-[var(--empire-cream)]/50 mt-0.5">
                Update the estimated total cat count and sterilized cat count for this colony.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl font-body text-[10px] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider block mb-1">Estimated Population</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={pop}
                  onChange={(e) => setPop(parseInt(e.target.value) || 0)}
                  className="w-full bg-[var(--bg-void)] text-[var(--empire-cream)] font-body text-xs p-2.5 rounded-xl border border-[var(--bg-border)]/60 focus:border-[var(--empire-gold)] outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider block mb-1">TNR sterilized Count</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={tnr}
                  onChange={(e) => setTnr(parseInt(e.target.value) || 0)}
                  className="w-full bg-[var(--bg-void)] text-[var(--empire-cream)] font-body text-xs p-2.5 rounded-xl border border-[var(--bg-border)]/60 focus:border-[var(--empire-gold)] outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end text-xs font-bold uppercase mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 bg-transparent text-[var(--empire-cream)]/50 hover:bg-[var(--bg-elevated)] rounded-lg border border-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[var(--empire-gold)] text-white rounded-lg hover:bg-[#e6b020] cursor-pointer"
                >
                  {loading ? 'Updating…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
