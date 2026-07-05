'use client';
// components/supplies/SupplyRequestModal.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState, useTransition } from 'react';
import { requestSupply, Supply } from '@/lib/actions/supplies';

interface Props {
  readonly supply: Supply;
  readonly onClose: () => void;
  readonly onRequested?: () => void;
}

export default function SupplyRequestModal({ supply, onClose, onRequested }: Props) {
  const [isPending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(1);
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity > supply.quantity) {
      setError('Cannot request more than available stock.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('supply_id', supply.id);
      formData.append('quantity_requested', String(quantity));
      formData.append('purpose', purpose);

      const res = await requestSupply(formData);
      if (res.success) {
        if (onRequested) onRequested();
        onClose();
      } else {
        setError(res.error || 'Failed to request supply.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="border border-[rgba(255,255,255,0.08)] bg-[#0d0e12] rounded-2xl p-6 shadow-2xl w-full max-w-md relative flex flex-col gap-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-all cursor-pointer"
          aria-label="Close modal"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        <div>
          <h3 className="text-lg font-bold text-[var(--empire-cream)]">Request Supply Item</h3>
          <p className="text-xs text-gray-400 mt-1">Submit a request. All requests require verification by coordinators.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
            <span className="text-[10px] text-gray-500 font-mono block uppercase">Requested Item</span>
            <span className="text-sm font-bold text-[var(--empire-cream)]">{supply.name}</span>
            <span className="text-xs text-gray-400 block mt-1 font-mono">Available: {supply.quantity} {supply.unit}</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
              Quantity to Request: {quantity}
            </label>
            <input
              type="range"
              min="1"
              max={supply.quantity}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full h-1.5 bg-black/60 rounded-lg appearance-none cursor-pointer accent-[var(--life-teal)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Purpose / Colony ID</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
              placeholder="Indicate which stray cat colony or event needs this item..."
              className="w-full h-24 bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--empire-cream)] focus:border-[var(--life-teal)] outline-none resize-none"
            />
          </div>

          {error && (
            <div className="text-xs font-bold text-red-400 font-mono text-center bg-red-950/20 py-2 rounded-lg border border-red-900/30">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-[var(--life-teal)] text-white hover:opacity-90 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
            >
              {isPending ? 'Requesting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
