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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="border border-[var(--bg-border)] bg-[var(--bg-surface)] rounded-2xl p-6 shadow-2xl w-full max-w-md relative flex flex-col gap-4 text-[var(--text-primary)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer border-none bg-transparent"
          aria-label="Close modal"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        <div>
          <h3 className="text-lg font-bold text-[var(--empire-cream)]">Request Supply Item</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Submit a request. All requests require verification by coordinators.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--bg-border)]/40 rounded-xl">
            <span className="text-[10px] text-[var(--text-secondary)] font-mono block uppercase">Requested Item</span>
            <span className="text-sm font-bold text-[var(--empire-cream)]">{supply.name}</span>
            <span className="text-xs text-[var(--text-secondary)] block mt-1 font-mono">Available: {supply.quantity} {supply.unit}</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Quantity to Request: {quantity}
            </label>
            <input
              type="range"
              min="1"
              max={supply.quantity}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full h-1.5 bg-[var(--bg-border)]/30 rounded-lg appearance-none cursor-pointer accent-[var(--life-teal)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Purpose / Colony ID</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
              placeholder="Indicate which stray cat colony or event needs this item..."
              className="w-full h-24 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--life-teal)] outline-none resize-none"
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
              className="btn btn-ghost flex-1 py-2 text-xs uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-teal flex-1 py-2 text-xs uppercase disabled:opacity-50"
            >
              {isPending ? 'Requesting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
