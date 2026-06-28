'use client';

// components/cats/NeuterBadge.tsx — Holographic Neuter Verification Badge
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { requestNeuterVerification, getNeuterProof } from '@/lib/actions/neuter';

interface Props {
  catId: string;
  isSterilized: boolean;
  canRequest: boolean;
}

export default function NeuterBadge({ catId, isSterilized, canRequest }: Props) {
  const router = useRouter();
  const [proof, setProof] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form states
  const [clinicName, setClinicName] = useState('');
  const [neuterDate, setNeuterDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 3D Card tilt states
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    let isMounted = true;
    async function loadProof() {
      try {
        const res = await getNeuterProof(catId);
        if (isMounted && res.success && res.proof) {
          setProof(res.proof);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadProof();
    return () => {
      isMounted = false;
    };
  }, [catId]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    
    // Tilt calculations
    const rotateX = -(y - yc) / 6;
    const rotateY = (x - xc) / 6;

    setTiltStyle({
      transform: `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      background: `radial-gradient(circle at ${x}px ${y}px, rgba(235, 132, 36, 0.15) 0%, rgba(255,255,255,0) 80%), white`,
      transition: 'none'
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(600px) rotateX(0deg) rotateY(0deg)',
      background: 'white',
      transition: 'transform 0.5s ease, background 0.5s ease'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicName || !neuterDate) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await requestNeuterVerification(catId, clinicName, neuterDate);
      if (res.success) {
        setShowModal(false);
        setClinicName('');
        setNeuterDate('');
        router.refresh();
        alert('Verification request submitted successfully. Staff will review it shortly!');
      } else {
        setError(res.error || 'Failed to submit verification request.');
      }
    } catch {
      setError('Connection error.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-[var(--bg-border)] shadow-ambient flex items-center justify-center min-h-[140px]">
        <div className="w-6 h-6 border-2 border-[var(--empire-gold)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Case A: Verified spay/neuter display holographic certificate badge
  if (isSterilized && proof && proof.status === 'verified') {
    return (
      <div 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={tiltStyle}
        className="bg-white p-6 rounded-3xl border-2 border-[var(--empire-gold)] shadow-ambient cursor-pointer relative overflow-hidden group select-none transition-all duration-300 flex flex-col gap-4 text-[#5c4a3c]"
        onClick={() => router.push(`/verify/${proof.id}`)}
      >
        {/* Holographic light overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-amber-500/5 mix-blend-overlay pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="flex justify-between items-start gap-4">
          <div className="flex-grow">
            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--empire-gold)] block">
              Cryptographic Certification
            </span>
            <h3 className="font-display text-base font-black text-[#3b2d23] mt-1.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[var(--empire-gold)]">verified</span>
              <span>Proof of Neuter</span>
            </h3>
          </div>
          <span className="text-3xl">🛡️</span>
        </div>

        <div className="border-t border-[#dbc2b2]/30 pt-3 flex flex-col gap-1 text-[10px] font-semibold text-[#5c4a3c]/60 font-body">
          <div className="flex justify-between">
            <span>Clinic:</span>
            <strong className="text-[#3b2d23] truncate max-w-[140px]">{proof.clinic_name}</strong>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <strong className="text-[#3b2d23]">
              {new Date(proof.neuter_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
            </strong>
          </div>
        </div>

        <div className="text-[8px] font-data text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg p-2 mt-1 break-all truncate max-w-full">
          Signature: {proof.signature.substring(0, 18)}...
        </div>
      </div>
    );
  }

  // Case B: Unsterilized cat and user can request verification
  return (
    <div className="bg-white p-6 rounded-3xl border border-[var(--bg-border)] shadow-ambient flex flex-col gap-4 text-[#5c4a3c]">
      <div>
        <h3 className="font-display text-sm font-bold text-[var(--empire-cream)] mb-1 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">health_and_safety</span>
          <span>Sterilization Registry</span>
        </h3>
        <p className="font-body text-xs text-[var(--empire-cream)]/50 leading-relaxed">
          {proof 
            ? `A request is currently ${proof.status} for verification by MeowNet staff.`
            : 'Have you trapped and spayed this cat? Register the clinic details to claim verifiable spay badges and +50 XP points.'
          }
        </p>
      </div>

      {proof ? (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl font-body text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wider justify-center">
          <span className="material-symbols-outlined text-sm">pending_actions</span>
          <span>Request Status: {proof.status}</span>
        </div>
      ) : (
        canRequest && (
          <button
            onClick={() => setShowModal(true)}
            className="w-full bg-[var(--life-teal)] text-white hover:opacity-90 font-body text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">gavel</span>
            <span>Request Verification</span>
          </button>
        )
      )}

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[var(--bg-border)] max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-[var(--empire-cream)] flex flex-col gap-4">
            <button 
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-[var(--empire-cream)]/50 hover:text-[var(--empire-cream)] transition-colors border-none bg-transparent cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div>
              <h3 className="font-display text-lg font-bold text-[var(--empire-gold)] mb-1 flex items-center gap-1.5">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
                <span>Registry Request</span>
              </h3>
              <p className="font-body text-xs text-[var(--empire-cream)]/60">
                Provide spay/neuter surgery details to request cryptographic audit registry sign-off.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 font-body text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[9px] font-bold text-[var(--empire-cream)]/50 uppercase block mb-1">Attending Vet Clinic / Rescue Organization</label>
                <input
                  type="text"
                  placeholder="e.g. Community Pet Clinic, TNR Mobile Vet"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="w-full bg-[var(--bg-void)] text-[var(--empire-cream)] font-body text-xs p-2.5 rounded-lg border border-[var(--bg-border)]/40 outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-[var(--empire-cream)]/50 uppercase block mb-1">Date of Surgery</label>
                <input
                  type="date"
                  value={neuterDate}
                  onChange={(e) => setNeuterDate(e.target.value)}
                  className="w-full bg-[var(--bg-void)] text-[var(--empire-cream)] font-body text-xs p-2.5 rounded-lg border border-[var(--bg-border)]/40 outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end text-xs font-bold uppercase mt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 bg-transparent text-[var(--empire-cream)]/50 hover:bg-[var(--bg-elevated)] rounded-lg border border-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[var(--empire-gold)] text-white rounded-lg hover:bg-[#e6b020] cursor-pointer"
                >
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
