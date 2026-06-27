'use client';
// components/cats/CatActions/index.tsx — Client component for cat owner and volunteer interactions

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteCat, lendAPaw, withdrawPledges } from '@/lib/actions/cats';

interface CatActionsProps {
  catId: string;
  isOwner: boolean;
  shelterUrl: string | null;
  hasPledged: boolean;
}

const PLEDGE_OPTIONS = [
  { value: 'food',   icon: 'restaurant', label: 'Food & Water Support', desc: 'Provide regular feeding and clean water.' },
  { value: 'tnr',    icon: 'content_cut', label: 'TNR Trap Assistance',  desc: 'Help coordinate trapping for spay/neutering.' },
  { value: 'foster', icon: 'home', label: 'Temporary Fostering',   desc: 'Provide a temporary home for socialisation.' },
  { value: 'vet',    icon: 'medical_services', label: 'Vet Care Sponsorship', desc: 'Contribute towards vaccination or medical bills.' },
];

export default function CatActions({ catId, isOwner, shelterUrl, hasPledged: initialHasPledged }: CatActionsProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [selectedPledges, setSelectedPledges] = useState<string[]>([]);
  const [hasPledged, setHasPledged] = useState(initialHasPledged);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal Step State
  const [step, setStep] = useState<'pledge' | 'payment'>('pledge');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Dummy Payment State
  const [payMethod, setPayMethod] = useState<'points' | 'card'>('points');
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');

  const togglePledge = (val: string) => {
    setSelectedPledges((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]);
  };

  const handleLendPaw = async () => {
    setIsPending(true);
    setError(null);
    const result = await lendAPaw(catId, selectedPledges, isAnonymous);
    setIsPending(false);
    if (result.success) {
      setHasPledged(true);
      setShowModal(false);
      setStep('pledge');
      setSelectedPledges([]);
      router.refresh();
    } else {
      setError(result.error || 'Failed to submit pledges.');
    }
  };

  const handleWithdraw = async () => {
    const confirm = window.confirm('Are you sure you want to withdraw your care pledges for this cat? You will forfeit the +5 Karma points reward.');
    if (!confirm) return;

    setIsPending(true);
    const result = await withdrawPledges(catId);
    setIsPending(false);

    if (result.success) {
      setHasPledged(false);
      router.refresh();
    } else {
      alert(`Failed to remove sponsorship: ${result.error}`);
    }
  };

  const handleConfirmPledge = () => {
    if (selectedPledges.length === 0) {
      setError('Please select at least one way to help.');
      return;
    }
    setError(null);
    setStep('payment');
  };

  const handleDelete = async () => {
    const confirm = window.confirm('Are you sure you want to delete this cat sighting? This action is permanent.');
    if (!confirm) return;

    setIsPending(true);
    const result = await deleteCat(catId);
    setIsPending(false);

    if (result.success) {
      router.push('/cats');
    } else {
      alert(`Delete failed: ${result.error}`);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Shelter / Rescue Action */}
      {shelterUrl ? (
        <a 
          href={shelterUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="w-full bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] font-body text-sm font-bold py-3 rounded-xl shadow-ambient transition-all flex items-center justify-center gap-2 no-underline transform hover:-translate-y-0.5"
        >
          <span className="material-symbols-outlined">home</span>
          <span>Visit Shelter / Rescue →</span>
        </a>
      ) : (
        <div className="flex flex-col gap-2 w-full">
          <button 
            onClick={() => !hasPledged && setShowModal(true)}
            className={`w-full font-body text-sm font-bold py-3 rounded-xl shadow-ambient transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 ${
              hasPledged 
                ? 'bg-[var(--life-teal)]/20 text-[var(--life-teal)] border border-[var(--life-teal)]/30 cursor-default' 
                : 'bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] cursor-pointer'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
            <span>{hasPledged ? 'Sponsoring This Cat' : 'Lend a Paw'}</span>
          </button>
          
          {hasPledged && (
            <button
              onClick={handleWithdraw}
              disabled={isPending}
              className="w-full font-body text-xs font-bold py-2 rounded-xl border border-red-200 text-[#ba1a1a] hover:bg-red-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">heart_broken</span>
              <span>Remove Sponsorship</span>
            </button>
          )}
        </div>
      )}

      {/* Owner Mutations */}
      {isOwner && (
        <div className="flex gap-2 w-full mt-1">
          <Link 
            href={`/cats/${catId}/edit`}
            className="flex-1 bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-[var(--empire-cream)] hover:bg-[var(--bg-border)]/15 font-body text-xs font-bold py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 no-underline"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            <span>Edit Details</span>
          </Link>
          <button 
            onClick={handleDelete}
            disabled={isPending}
            className="flex-1 bg-red-50 border border-red-200 text-[#ba1a1a] hover:bg-red-100/50 font-body text-xs font-bold py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* Lend a Paw Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[var(--bg-border)] max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-[var(--empire-cream)]">
            <button 
              onClick={() => {
                setShowModal(false);
                setStep('pledge');
              }}
              className="absolute top-4 right-4 text-[var(--empire-cream)]/50 hover:text-[var(--empire-cream)] transition-colors border-none bg-transparent cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {step === 'pledge' ? (
              <>
                <h3 className="font-display text-lg font-bold text-[var(--empire-gold)] mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined icon-filled" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                  <span>Lend a Paw Pledge</span>
                </h3>
                <p className="font-body text-xs text-[var(--empire-cream)]/60 mb-6">
                  How would you like to help this cat? Pledging support rewards you with <strong className="text-[var(--empire-gold)] font-bold font-data">+5 Karma points</strong>.
                </p>

                <div className="flex flex-col gap-3 mb-4">
                  {PLEDGE_OPTIONS.map((opt) => (
                    <label 
                      key={opt.value} 
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedPledges.includes(opt.value) 
                          ? 'bg-[var(--bg-border)]/10 border-[var(--empire-gold)]' 
                          : 'bg-[var(--bg-elevated)] border-[var(--bg-border)]/40 hover:bg-[var(--bg-border)]/10'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={selectedPledges.includes(opt.value)}
                        onChange={() => togglePledge(opt.value)}
                        className="mt-1 accent-[var(--empire-gold)]"
                      />
                      <div>
                        <div className="font-body text-xs font-bold text-[var(--empire-cream)] flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">{opt.icon}</span>
                          <span>{opt.label}</span>
                        </div>
                        <div className="font-body text-[10px] text-[var(--empire-cream)]/50 mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Anonymous Toggle Option */}
                <label className="flex items-center gap-2 mb-6 p-2 rounded-lg bg-[var(--bg-elevated)]/50 border border-[var(--bg-border)]/20 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="accent-[var(--empire-gold)]"
                  />
                  <span className="font-body text-xs text-[var(--empire-cream)]/70">Pledge anonymously (hide name/avatar in public feed)</span>
                </label>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-[#ba1a1a] rounded-xl p-3 font-body text-xs mb-4">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={() => setShowModal(false)}
                    className="border border-[var(--bg-border)] text-[var(--empire-cream)] hover:bg-[var(--bg-elevated)] font-body text-xs font-semibold px-4 py-2.5 rounded-full cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmPledge}
                    className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] font-body text-xs font-bold px-5 py-2.5 rounded-full shadow-md cursor-pointer transition-colors"
                  >
                    Continue to Payment
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-display text-lg font-bold text-[var(--empire-gold)] mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined icon-filled" style={{ fontVariationSettings: "'FILL' 1" }}>credit_card</span>
                  <span>Dummy Care Sponsorship Payment</span>
                </h3>
                <p className="font-body text-xs text-[var(--empire-cream)]/60 mb-6">
                  Verify mock payment to complete your care pledges. Pledging rewards you with <strong className="text-[var(--empire-gold)] font-bold font-data">+5 Karma points</strong>.
                </p>

                <div className="bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--bg-border)]/30 mb-6 flex flex-col gap-4 text-[var(--empire-cream)]">
                  {/* Payment Method Selector */}
                  <div className="flex gap-3 border-b border-[var(--bg-border)]/20 pb-4">
                    <button 
                      type="button" 
                      onClick={() => setPayMethod('points')}
                      className={`flex-1 font-body text-xs font-bold py-2 px-3 rounded-lg border transition-all ${
                        payMethod === 'points' 
                          ? 'bg-[var(--empire-gold)] text-white border-transparent' 
                          : 'bg-white text-[var(--empire-cream)]/70 border-[var(--bg-border)]/40 hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      Use Karma Points (50 pts)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPayMethod('card')}
                      className={`flex-1 font-body text-xs font-bold py-2 px-3 rounded-lg border transition-all ${
                        payMethod === 'card' 
                          ? 'bg-[var(--empire-gold)] text-white border-transparent' 
                          : 'bg-white text-[var(--empire-cream)]/70 border-[var(--bg-border)]/40 hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      Credit Card Mock
                    </button>
                  </div>

                  {payMethod === 'points' ? (
                    <div className="text-center py-4 flex flex-col items-center gap-1">
                      <span className="material-symbols-outlined text-[var(--empire-gold)] text-3xl font-bold animate-pulse">monetization_on</span>
                      <div className="font-body text-xs font-bold text-[var(--empire-cream)]">Pay 50 Karma Points</div>
                      <p className="font-body text-[10px] text-[var(--empire-cream)]/50 max-w-[250px] mt-1">We will deduct 50 points from your balance and register your sponsorship pledges.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="font-body text-[10px] font-bold text-[var(--empire-cream)]/60 uppercase">Mock Card Number</label>
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
                            value={cardExpiry} 
                            onChange={(e) => setCardExpiry(e.target.value)} 
                            className="w-full bg-white border border-[var(--bg-border)]/50 rounded-lg p-2 font-data text-xs mt-1 text-[var(--empire-cream)]" 
                          />
                        </div>
                        <div>
                          <label className="font-body text-[10px] font-bold text-[var(--empire-cream)]/60 uppercase">CVV</label>
                          <input 
                            type="text" 
                            value={cardCvv} 
                            onChange={(e) => setCardCvv(e.target.value)} 
                            className="w-full bg-white border border-[var(--bg-border)]/50 rounded-lg p-2 font-data text-xs mt-1 text-[var(--empire-cream)]" 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] font-body text-amber-600 font-semibold bg-amber-50 border border-amber-200/50 rounded-xl p-2.5 flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-xs mt-0.5">info</span>
                    <span>This is a sandbox checkout. Real funds are never charged. Pledging grants <strong>+5 Karma points</strong>.</span>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-[#ba1a1a] rounded-xl p-3 font-body text-xs mb-4">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 justify-between">
                  <button 
                    onClick={() => setStep('pledge')}
                    className="border border-[var(--bg-border)] text-[var(--empire-cream)] hover:bg-[var(--bg-elevated)] font-body text-xs font-semibold px-4 py-2.5 rounded-full cursor-pointer transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleLendPaw}
                    disabled={isPending}
                    className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] font-body text-xs font-bold px-5 py-2.5 rounded-full shadow-md cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span>Complete Pay & Pledge</span>
                    {isPending && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
