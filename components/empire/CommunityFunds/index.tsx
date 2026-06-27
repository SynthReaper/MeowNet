'use client';
// components/empire/CommunityFunds/index.tsx — Client component for community fundraising and direct sponsorships

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCommunityFund, donateToFund } from '@/lib/actions/cats';

interface Fund {
  id: string;
  name: string;
  category: string;
  target_points: number;
  raised_points: number;
  description: string | null;
  is_anonymous: boolean;
  created_at: string;
  profiles?: {
    display_name: string | null;
  } | null;
}

interface CommunityFundsProps {
  funds: Fund[];
  userPoints: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  general: 'globe_uk',
  tnr: 'content_cut',
  medical: 'medical_services',
  food: 'restaurant',
};

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General Care (All Cats)',
  tnr: 'TNR Operations',
  medical: 'Medical Relief',
  food: 'Colony Feeding',
};

export default function CommunityFunds({ funds, userPoints }: CommunityFundsProps) {
  const router = useRouter();
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);

  // Form states
  const [fundName, setFundName] = useState('');
  const [fundCategory, setFundCategory] = useState('general');
  const [fundTarget, setFundTarget] = useState(500);
  const [fundDesc, setFundDesc] = useState('');
  const [fundAnon, setFundAnon] = useState(false);

  const [donateAmount, setDonateAmount] = useState(50);
  const [donateAnon, setDonateAnon] = useState(false);

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dummy payment states for checkout step
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'pay'>('details');
  const [cardNumber, setCardNumber] = useState('4111 5555 6666 7777');

  const handleCreateFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundName.trim()) {
      setError('Please provide a name for the fund.');
      return;
    }
    if (fundTarget <= 0) {
      setError('Target points must be greater than 0.');
      return;
    }

    setIsPending(true);
    setError(null);
    const res = await createCommunityFund(fundName, fundCategory, fundTarget, fundDesc, fundAnon);
    setIsPending(false);

    if (res.success) {
      setShowCreateModal(false);
      setFundName('');
      setFundTarget(500);
      setFundDesc('');
      setFundAnon(false);
      router.refresh();
    } else {
      setError(res.error || 'Failed to create fund.');
    }
  };

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFund) return;
    if (donateAmount <= 0) {
      setError('Donation amount must be greater than 0.');
      return;
    }
    if (donateAmount > userPoints) {
      setError(`You do not have enough Karma Points. Available: ${userPoints} pts.`);
      return;
    }

    if (checkoutStep === 'details') {
      setCheckoutStep('pay');
      return;
    }

    setIsPending(true);
    setError(null);
    const res = await donateToFund(selectedFund.id, donateAmount, donateAnon);
    setIsPending(false);

    if (res.success) {
      setShowDonateModal(false);
      setDonateAmount(50);
      setDonateAnon(false);
      setCheckoutStep('details');
      router.refresh();
    } else {
      setError(res.error || 'Donation failed.');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-ambient border border-[var(--bg-border)] flex flex-col gap-6 text-[var(--empire-cream)] mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--bg-border)]/20 pb-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[var(--empire-gold)] flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl icon-fill" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
            <span>Community Care Funds</span>
          </h2>
          <p className="font-body text-sm text-[var(--empire-cream)]/60">Sponsor stray colonies or TNR projects with your Karma Points.</p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] font-body text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 transform hover:-translate-y-0.5"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span>Create Fund</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {funds.length === 0 ? (
          <div className="md:col-span-2 text-center py-12 bg-[var(--bg-elevated)] border border-dashed border-[var(--bg-border)] rounded-2xl">
            <span className="material-symbols-outlined text-4xl text-[var(--empire-cream)]/20 mb-2">volunteer_activism</span>
            <p className="font-body text-sm text-[var(--empire-cream)]/50">No community care funds active. Be the first to start a fund!</p>
          </div>
        ) : (
          funds.map((fund) => {
            const percent = Math.min(Math.round((fund.raised_points / fund.target_points) * 100), 100);
            return (
              <div 
                key={fund.id} 
                className="bg-[var(--bg-elevated)] border border-[var(--bg-border)]/30 rounded-2xl p-5 flex flex-col justify-between hover:shadow-ambient transition-all duration-300 relative group"
              >
                <div>
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <span 
                      className="w-10 h-10 rounded-xl bg-white border border-[var(--bg-border)]/40 flex items-center justify-center text-[var(--empire-gold)] shadow-sm shrink-0"
                    >
                      <span className="material-symbols-outlined text-lg">{CATEGORY_ICONS[fund.category] || 'folder'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 font-body text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ffdcc5] text-[var(--empire-gold-dim)] uppercase tracking-wider border border-[var(--bg-border)]/20">
                      {CATEGORY_LABELS[fund.category]}
                    </span>
                  </div>

                  <h3 className="font-display text-base font-bold text-[var(--empire-cream)] group-hover:text-[var(--empire-gold)] transition-colors mb-1 truncate">
                    {fund.name}
                  </h3>
                  <p className="font-body text-xs text-[var(--empire-cream)]/60 line-clamp-2 leading-relaxed mb-4 min-h-[32px]">
                    {fund.description || 'No description provided.'}
                  </p>
                </div>

                <div>
                  {/* Funding Bar */}
                  <div className="flex justify-between items-center text-[11px] font-body text-[var(--empire-cream)]/60 mb-1.5">
                    <span className="font-semibold">{fund.raised_points.toLocaleString()} / {fund.target_points.toLocaleString()} pts</span>
                    <span className="font-bold text-[var(--life-teal)]">{percent}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/60 border border-[var(--bg-border)]/10 rounded-full overflow-hidden mb-4">
                    <div 
                      className="h-full bg-[var(--life-teal)] rounded-full transition-all duration-500" 
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-[var(--bg-border)]/20 gap-3">
                    <span className="font-body text-[10px] text-[var(--empire-cream)]/40 truncate">
                      By {fund.is_anonymous ? 'Anonymous Volunteer' : (fund.profiles?.display_name ?? 'Anonymous')}
                    </span>
                    
                    <button
                      onClick={() => {
                        setSelectedFund(fund);
                        setError(null);
                        setCheckoutStep('details');
                        setShowDonateModal(true);
                      }}
                      className="px-3 py-1.5 bg-[#8bf1e6]/20 hover:bg-[#8bf1e6]/30 text-[var(--life-teal)] border border-[var(--life-teal)]/30 font-body text-xs font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      Donate Points
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE FUND MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateFund} className="bg-white rounded-2xl border border-[var(--bg-border)] max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-[var(--empire-cream)]/50 hover:text-[var(--empire-cream)] transition-colors border-none bg-transparent cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="font-display text-lg font-bold text-[var(--empire-gold)] mb-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined">add_circle</span>
              <span>Launch Care Fund</span>
            </h3>
            <p className="font-body text-xs text-[var(--empire-cream)]/60 mb-6">
              Create a fund where anyone can pool points together to sponsor collective care efforts.
            </p>

            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="font-body text-xs font-bold text-[var(--empire-cream)]/70">Fund Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Winter Shelter Building Fund"
                  value={fundName}
                  onChange={(e) => setFundName(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)]/50 rounded-lg p-2.5 font-body text-xs mt-1 text-[var(--empire-cream)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-xs font-bold text-[var(--empire-cream)]/70">Category</label>
                  <select 
                    value={fundCategory}
                    onChange={(e) => setFundCategory(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)]/50 rounded-lg p-2.5 font-body text-xs mt-1 text-[var(--empire-cream)]"
                  >
                    <option value="general">General Care</option>
                    <option value="tnr">TNR Operations</option>
                    <option value="medical">Medical Relief</option>
                    <option value="food">Colony Feeding</option>
                  </select>
                </div>

                <div>
                  <label className="font-body text-xs font-bold text-[var(--empire-cream)]/70">Target Points</label>
                  <input 
                    type="number"
                    value={fundTarget}
                    onChange={(e) => setFundTarget(Number(e.target.value))}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)]/50 rounded-lg p-2.5 font-body text-xs mt-1 text-[var(--empire-cream)]"
                  />
                </div>
              </div>

              <div>
                <label className="font-body text-xs font-bold text-[var(--empire-cream)]/70">Description</label>
                <textarea 
                  placeholder="Describe what the pooled points will be used for..."
                  value={fundDesc}
                  onChange={(e) => setFundDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)]/50 rounded-lg p-2.5 font-body text-xs mt-1 text-[var(--empire-cream)]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer p-1">
                <input 
                  type="checkbox"
                  checked={fundAnon}
                  onChange={(e) => setFundAnon(e.target.checked)}
                  className="accent-[var(--empire-gold)]"
                />
                <span className="font-body text-xs text-[var(--empire-cream)]/70">Launch anonymously (hide creator profile)</span>
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-[#ba1a1a] rounded-xl p-3 font-body text-xs mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button 
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="border border-[var(--bg-border)] text-[var(--empire-cream)] hover:bg-[var(--bg-elevated)] font-body text-xs font-semibold px-4 py-2.5 rounded-full cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isPending}
                className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] font-body text-xs font-bold px-5 py-2.5 rounded-full shadow-md cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>Launch Fund</span>
                {isPending && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DONATE MODAL */}
      {showDonateModal && selectedFund && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleDonate} className="bg-white rounded-2xl border border-[var(--bg-border)] max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              type="button"
              onClick={() => setShowDonateModal(false)}
              className="absolute top-4 right-4 text-[var(--empire-cream)]/50 hover:text-[var(--empire-cream)] transition-colors border-none bg-transparent cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {checkoutStep === 'details' ? (
              <>
                <h3 className="font-display text-lg font-bold text-[var(--empire-gold)] mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined">volunteer_activism</span>
                  <span>Donate to Care Fund</span>
                </h3>
                <p className="font-body text-xs text-[var(--empire-cream)]/60 mb-6">
                  Support "<strong>{selectedFund.name}</strong>" by contributing your Karma Points.
                </p>

                <div className="flex flex-col gap-4 mb-6">
                  <div>
                    <label className="font-body text-xs font-bold text-[var(--empire-cream)]/70">Point Donation Amount</label>
                    <input 
                      type="number"
                      value={donateAmount}
                      onChange={(e) => setDonateAmount(Number(e.target.value))}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)]/50 rounded-lg p-2.5 font-body text-xs mt-1 text-[var(--empire-cream)]"
                    />
                    <div className="font-body text-[10px] text-[var(--empire-cream)]/40 mt-1.5 font-medium flex justify-between">
                      <span>Available points: {userPoints} pts</span>
                      <span>Category: {CATEGORY_LABELS[selectedFund.category]}</span>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer p-1">
                    <input 
                      type="checkbox"
                      checked={donateAnon}
                      onChange={(e) => setDonateAnon(e.target.checked)}
                      className="accent-[var(--empire-gold)]"
                    />
                    <span className="font-body text-xs text-[var(--empire-cream)]/70">Donate anonymously (hide profile in donors list)</span>
                  </label>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-[#ba1a1a] rounded-xl p-3 font-body text-xs mb-4">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <button 
                    type="button"
                    onClick={() => setShowDonateModal(false)}
                    className="border border-[var(--bg-border)] text-[var(--empire-cream)] hover:bg-[var(--bg-elevated)] font-body text-xs font-semibold px-4 py-2.5 rounded-full cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] font-body text-xs font-bold px-5 py-2.5 rounded-full shadow-md cursor-pointer transition-colors"
                  >
                    Proceed to Payment
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-display text-lg font-bold text-[var(--empire-gold)] mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined">credit_card</span>
                  <span>Sandbox Checkout</span>
                </h3>
                <p className="font-body text-xs text-[var(--empire-cream)]/60 mb-6">
                  Verify sandbox payment details to complete point transfer of <strong className="text-[var(--empire-gold)] font-bold font-data">{donateAmount} pts</strong>.
                </p>

                <div className="bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--bg-border)]/30 mb-6 flex flex-col gap-4 text-[var(--empire-cream)]">
                  <div>
                    <label className="font-body text-[10px] font-bold text-[var(--empire-cream)]/60 uppercase">Sandbox Card Number</label>
                    <input 
                      type="text" 
                      value={cardNumber} 
                      onChange={(e) => setCardNumber(e.target.value)} 
                      className="w-full bg-white border border-[var(--bg-border)]/50 rounded-lg p-2 font-data text-xs mt-1 text-[var(--empire-cream)]" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-body text-[10px] font-bold text-[var(--empire-cream)]/60 uppercase">Expiry Date</label>
                      <input 
                        type="text" 
                        defaultValue="12/28"
                        disabled
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)]/20 rounded-lg p-2 font-data text-xs mt-1 text-[var(--empire-cream)]/40" 
                      />
                    </div>
                    <div>
                      <label className="font-body text-[10px] font-bold text-[var(--empire-cream)]/60 uppercase">CVV</label>
                      <input 
                        type="text" 
                        defaultValue="123"
                        disabled
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--bg-border)]/20 rounded-lg p-2 font-data text-xs mt-1 text-[var(--empire-cream)]/40" 
                      />
                    </div>
                  </div>

                  <div className="text-[10px] font-body text-amber-600 font-semibold bg-amber-50 border border-amber-200/50 rounded-xl p-2.5 flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-xs mt-0.5">info</span>
                    <span>No actual credit cards or funds are used. Points will be transferred directly.</span>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-[#ba1a1a] rounded-xl p-3 font-body text-xs mb-4">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 justify-between">
                  <button 
                    type="button"
                    onClick={() => setCheckoutStep('details')}
                    className="border border-[var(--bg-border)] text-[var(--empire-cream)] hover:bg-[var(--bg-elevated)] font-body text-xs font-semibold px-4 py-2.5 rounded-full cursor-pointer transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    type="submit"
                    disabled={isPending}
                    className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] font-body text-xs font-bold px-5 py-2.5 rounded-full shadow-md cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span>Complete Checkout</span>
                    {isPending && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
