'use client';

// components/profile/PrintButton.tsx — Client component print button
export default function PrintButton() {
  return (
    <button
      onClick={() => {
        if (typeof window !== 'undefined') window.print();
      }}
      className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all shadow-md flex items-center gap-2 cursor-pointer border-none"
    >
      <span className="material-symbols-outlined text-sm">download</span>
      <span>Download / Print Certificate</span>
    </button>
  );
}
