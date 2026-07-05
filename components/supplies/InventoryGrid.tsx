'use client';
// components/supplies/InventoryGrid.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import { useState } from 'react';
import SupplyCard from './SupplyCard';
import SupplyRequestModal from './SupplyRequestModal';
import { Supply } from '@/lib/actions/supplies';

interface Props {
  readonly initialSupplies?: Supply[];
}

const CATEGORIES = [
  { value: 'all', label: 'All Items' },
  { value: 'food', label: 'Feline Nutrition' },
  { value: 'medical', label: 'Clinicals' },
  { value: 'trapping', label: 'TNR Gear' },
  { value: 'shelter', label: 'Colony Shelter' },
];

export default function InventoryGrid({ initialSupplies = [] }: Props) {
  const [supplies, setSupplies] = useState<Supply[]>(initialSupplies);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);

  const refetchSupplies = async () => {
    try {
      const res = await fetch('/api/supplies/inventory');
      const data = await res.json();
      if (data.supplies) {
        setSupplies(data.supplies);
      }
    } catch {
      console.error('Failed to reload supplies');
    }
  };

  const filteredSupplies = activeCategory === 'all'
    ? supplies
    : supplies.filter((s) => s.category === activeCategory);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Category Tabs */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--empire-cream)]">Supply Catalog</h3>
          <p className="text-xs text-gray-400 mt-1">Acquire traps, shelters, or veterinary supplements for registered colonies.</p>
        </div>

        <div className="flex gap-1 bg-black/40 border border-white/5 p-1 rounded-xl overflow-x-auto scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat.value
                  ? 'bg-[var(--life-teal)] text-white'
                  : 'text-gray-400 hover:text-[var(--empire-cream)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredSupplies.length === 0 ? (
          <div className="col-span-full text-center py-20 text-xs text-gray-500 font-mono">
            No supplies registered under this category.
          </div>
        ) : (
          filteredSupplies.map((supply) => (
            <SupplyCard
              key={supply.id}
              supply={supply}
              onRequest={(s) => setSelectedSupply(s)}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {selectedSupply && (
        <SupplyRequestModal
          supply={selectedSupply}
          onClose={() => setSelectedSupply(null)}
          onRequested={refetchSupplies}
        />
      )}
    </div>
  );
}
