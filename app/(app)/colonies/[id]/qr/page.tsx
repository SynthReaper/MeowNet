// app/(app)/colonies/[id]/qr/page.tsx — Printable QR Sticker Generator
import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ColonyQRPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: colony, error } = await supabase
    .from('colonies' as never)
    .select('id, name, location, caretaker:profiles!colonies_caretaker_id_fkey(display_name)')
    .eq('id', id)
    .single();

  if (error || !colony) {
    notFound();
  }

  // Construct target report/info URL
  // We use relative path or local host protocol dynamically on the client, but for the sticker image,
  // we will print a generic domain that matches the live deployment: https://meownet.org/colonies/[id]
  const LiveUrl = `https://meownet.org/colonies/${id}`;
  const QrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=5c4a3c&data=${encodeURIComponent(LiveUrl)}`;

  return (
    <div className="min-h-screen bg-[var(--bg-void)] py-10 px-4 print:bg-white print:py-0">
      {/* Screen Controls */}
      <div className="max-w-md mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link 
          href={`/colonies/${id}`} 
          className="flex items-center gap-1 text-[var(--empire-cream)]/50 hover:text-[var(--empire-cream)] text-xs font-bold uppercase tracking-wider no-underline"
        >
          <span className="material-symbols-outlined text-xs">arrow_back</span>
          <span>Colony Details</span>
        </Link>
        <button
          onClick={() => {
            if (typeof window !== 'undefined') window.print();
          }}
          className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">print</span>
          <span>Print Sticker</span>
        </button>
      </div>

      {/* Printable Sticker Sheet */}
      <div className="max-w-md mx-auto bg-white border-[6px] border-[var(--empire-gold)] rounded-3xl p-8 flex flex-col items-center text-center text-[#5c4a3c] shadow-xl print:shadow-none print:border-[4px] print:my-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-2xl text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>pets</span>
          <span className="font-display font-black text-lg tracking-wider text-[#3b2d23] uppercase">MEOWNET</span>
        </div>
        
        <div className="w-full border-t border-[#dbc2b2]/40 my-3" />

        <h1 className="font-display text-xl font-extrabold text-[#3b2d23] leading-tight mb-1">
          🐈 Feral Cat Colony
        </h1>
        <p className="font-body text-sm font-bold text-[var(--empire-gold-dim)] uppercase tracking-wider mb-4">
          {(colony as any).name}
        </p>

        {/* QR Code Container */}
        <div className="bg-[#fcf9f6] border-2 border-[#dbc2b2]/30 p-4 rounded-2xl shadow-inner mb-5">
          <img 
            src={QrApiUrl} 
            alt="Colony QR Link"
            className="w-48 h-48 object-contain" 
          />
        </div>

        <h3 className="font-display text-xs font-black uppercase tracking-widest text-[#3b2d23] mb-1">
          Scan to report sightings
        </h3>
        <p className="font-body text-[10px] text-[#5c4a3c]/60 leading-relaxed max-w-[280px]">
          Seen a new stray or injured cat in this area? Scan this QR code with your phone camera to submit a field report instantly.
        </p>

        <div className="w-full border-t border-[#dbc2b2]/40 my-4" />

        <div className="flex flex-col gap-0.5 text-[9px] text-[#5c4a3c]/45 font-bold uppercase tracking-wider">
          <span>Assigned Caretaker: {(colony as any).caretaker?.display_name || 'Unassigned'}</span>
          <span>Colony ID: {id.substring(0, 8)}...</span>
        </div>
      </div>
    </div>
  );
}
