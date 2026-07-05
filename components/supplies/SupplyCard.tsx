'use client';
// components/supplies/SupplyCard.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { Supply } from '@/lib/actions/supplies';

interface Props {
  readonly supply: Supply;
  readonly onRequest: (supply: Supply) => void;
}

export default function SupplyCard({ supply, onRequest }: Props) {
  const categoryIcons = {
    food: 'lunch_dining',
    medical: 'medical_services',
    trapping: 'toll',
    shelter: 'roofing',
    other: 'category',
  };

  const isLowStock = supply.quantity <= 5;

  return (
    <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-md rounded-xl p-4 flex flex-col gap-3 shadow-md">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-[var(--empire-cream)] truncate">{supply.name}</h4>
          <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block mt-1">
            Category: {supply.category}
          </span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-white/5 text-gray-400 flex items-center justify-center">
          <span className="material-symbols-outlined text-base">
            {categoryIcons[supply.category] || 'category'}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-end mt-1">
        <div>
          <span className="text-xs text-gray-400 block font-mono">Stock Level</span>
          <span
            className={`text-lg font-black ${
              isLowStock ? 'text-red-400' : 'text-[var(--life-teal)]'
            }`}
          >
            {supply.quantity} {supply.unit}
          </span>
        </div>

        {supply.expiration_date && (
          <div className="text-right">
            <span className="text-[9px] text-gray-500 block uppercase font-mono">Expires</span>
            <span className="text-[10px] text-gray-300 font-mono">
              {new Date(supply.expiration_date).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {supply.notes && (
        <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2 mt-1">{supply.notes}</p>
      )}

      <button
        onClick={() => onRequest(supply)}
        disabled={supply.quantity === 0}
        className="w-full mt-2 bg-[var(--life-teal)] text-white hover:opacity-90 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {supply.quantity === 0 ? 'Out of Stock' : 'Request Item'}
      </button>
    </div>
  );
}
