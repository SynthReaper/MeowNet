// app/(app)/cats/[id]/page.tsx — Cat profile (ISR 300s)
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { BCS_SCALE, BCS_RISK_COLORS } from '@/lib/veterinary/bcsScale';
import { VETERINARY_DISCLAIMER } from '@/lib/veterinary/triageRules';
import { getBreedProfile } from '@/lib/veterinary/breedProfiles';
import CatActions from '@/components/cats/CatActions';
import NeuterBadge from '@/components/cats/NeuterBadge';

export const revalidate = 300;

interface CatData {
  id: string; photo_url: string; status: string; name: string | null;
  breed_estimate: string | null; breed_confidence: number | null;
  bcs_estimate: number | null; health_flags: string[]; health_notes: string | null;
  age_estimate: string | null; color: string | null; sterilized: boolean;
  vaccinated: boolean; microchipped: boolean; contact_info: string | null;
  shelter_url: string | null; owner_id: string;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data } = await supabase.from('cats' as never).select('name, breed_estimate, status').eq('id', id).single();
  const cat = data as Pick<CatData, 'name' | 'breed_estimate' | 'status'> | null;
  if (!cat) return { title: 'Cat Not Found' };
  return {
    title: cat.name ? `${cat.name} the Cat` : 'Cat Profile',
    description: `${cat.status} cat${cat.breed_estimate ? ` — likely ${cat.breed_estimate}` : ''} on MeowNet.`,
  };
}

export default async function CatProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data, error } = await supabase.from('cats' as never).select('*').eq('id', id).single();
  if (error || !data) notFound();
  const cat = data as CatData;

  const isOwner = user.id === cat.owner_id;

  // Check if user has already pledged support
  let hasPledged = false;
  if (user) {
    const { data: userPledges } = await supabase
      .from('cat_caregivers' as never)
      .select('user_id')
      .eq('cat_id', id)
      .eq('user_id', user.id)
      .limit(1);
    hasPledged = !!(userPledges && userPledges.length > 0);
  }

  // Fetch caregivers list
  const { data: caregiversData } = await supabase
    .from('cat_caregivers' as never)
    .select('pledge, created_at, is_anonymous, profiles:profiles(display_name, avatar_url)' as never)
    .eq('cat_id', id)
    .order('created_at', { ascending: false });

  const caregivers = (caregiversData ?? []) as unknown as Array<{
    pledge: string;
    created_at: string;
    is_anonymous: boolean;
    profiles: {
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  }>;

  const bcsData = cat.bcs_estimate ? BCS_SCALE[cat.bcs_estimate as keyof typeof BCS_SCALE] : null;
  const breedProfile = cat.breed_estimate ? getBreedProfile(cat.breed_estimate) : null;

  // Build timeline events
  const timelineEvents = [
    {
      title: 'First Sighting Logged',
      icon: 'visibility',
      date: 'Recent Sighting',
      desc: `Cat first identified and registered in MeowNet database as ${cat.status.replace('_', ' ')}.`,
      color: 'border-tertiary-container text-tertiary',
    },
  ];

  if (cat.sterilized) {
    timelineEvents.unshift({
      title: 'TNR Procedure Completed',
      icon: 'medical_services',
      date: 'Confirmed Neutered',
      desc: 'Cat has been successfully trapped, sterilized (neutered/spayed), ear-tipped, and returned to colony area.',
      color: 'border-primary-container text-[var(--empire-gold)]',
    });
  }

  if (cat.vaccinated) {
    timelineEvents.unshift({
      title: 'Vaccinations Recorded',
      icon: 'vaccines',
      date: 'Up-to-Date',
      desc: 'Rabies and FVRCP booster vaccines administered. Vital immunizations updated successfully.',
      color: 'border-secondary-container text-[var(--life-teal)]',
    });
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-12 py-8 flex flex-col gap-8">
      {/* Back Button */}
      <div>
        <Link href="/cats" className="inline-flex items-center gap-2 text-[var(--empire-gold)] hover:text-[#e6b020] font-body text-sm font-semibold transition-colors no-underline">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Back to Cat Logs</span>
        </Link>
      </div>

      {/* Hero Section & Bio Bento */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Hero Image */}
        <div className="md:col-span-8 rounded-2xl overflow-hidden shadow-ambient bg-white border border-[var(--bg-border)] relative group min-h-[350px] md:min-h-[450px]">
          <img 
            alt={cat.name ?? 'Cat'} 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            src={cat.photo_url} 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full p-6 z-10">
            <h1 className="font-display text-3xl md:text-4xl text-white font-bold mb-2">
              {cat.name ?? 'Unnamed Cat'}
            </h1>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white rounded-full font-body text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">pets</span>
                <span>{cat.breed_estimate ?? 'Street Native'}</span>
              </span>
              <span className={`px-3 py-1 rounded-full font-body text-xs flex items-center gap-1 text-white bg-[var(--empire-gold)]`}>
                <span className="material-symbols-outlined text-sm">info</span>
                <span className="capitalize">{cat.status.replace('_', ' ')}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Bio & Actions */}
        <div className="md:col-span-4 flex flex-col gap-6">
          {/* Bio Card */}
          <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)] flex-grow flex flex-col">
            <h2 className="font-display text-lg text-[var(--empire-gold)] font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">info</span>
              <span>A Little About {cat.name ?? 'this friend'}</span>
            </h2>
            
            <p className="font-body text-sm text-[var(--empire-cream)]/70 flex-grow leading-relaxed">
              {cat.health_notes || `${cat.name || 'This cat'} is currently classified as ${cat.status.replace('_', ' ')} and is tracked by the local MeowNet volunteer network. Use the details below to check vaccination history and help coordinate care.`}
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-[var(--bg-border)]/40 pb-2">
                <span className="font-body text-xs font-semibold text-[var(--empire-cream)]/50 uppercase tracking-wider">AGE (EST)</span>
                <span className="font-body text-sm font-semibold text-[var(--empire-cream)]">{cat.age_estimate ?? 'Unknown'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[var(--bg-border)]/40 pb-2">
                <span className="font-body text-xs font-semibold text-[var(--empire-cream)]/50 uppercase tracking-wider">COLOR</span>
                <span className="font-body text-sm font-semibold text-[var(--empire-cream)] capitalize">{cat.color ?? 'Unknown'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[var(--bg-border)]/40 pb-2">
                <span className="font-body text-xs font-semibold text-[var(--empire-cream)]/50 uppercase tracking-wider">STERILIZED</span>
                <span className="font-body text-sm font-semibold text-[var(--empire-cream)]">{cat.sterilized ? '✅ Yes' : '❌ No'}</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="font-body text-xs font-semibold text-[var(--empire-cream)]/50 uppercase tracking-wider">VACCINATED</span>
                <span className="font-body text-sm font-semibold text-[var(--empire-cream)]">{cat.vaccinated ? '✅ Yes' : '❌ No'}</span>
              </div>
            </div>
          </div>

          {/* Interactive Actions block */}
          <CatActions catId={cat.id} isOwner={isOwner} shelterUrl={cat.shelter_url} hasPledged={hasPledged} />

          {cat.contact_info && (
            <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--bg-border)]/40">
              <div className="font-body text-xs font-semibold text-[var(--empire-cream)]/50 uppercase tracking-wider mb-1">Rescue Contact</div>
              <div className="font-body text-sm text-[var(--life-teal)] font-semibold">{cat.contact_info}</div>
            </div>
          )}
        </div>
      </section>

      {/* Main Grid for secondary information */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Journey History (Timeline) - 7 columns */}
        <section className="lg:col-span-7 bg-white p-6 md:p-8 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
          <h2 className="font-display text-xl text-[var(--empire-gold)] font-bold mb-8 flex items-center gap-2">
            <span className="material-symbols-outlined">timeline</span>
            <span>Journey So Far</span>
          </h2>
          
          <div className="relative border-l-2 border-[var(--bg-border)] ml-4 md:ml-6 space-y-8">
            {timelineEvents.map((event, idx) => (
              <div key={idx} className="relative pl-8 md:pl-10">
                <div className={`absolute -left-[17px] top-0 w-8 h-8 bg-white border-4 rounded-full flex items-center justify-center ${event.color}`}>
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {event.icon}
                  </span>
                </div>
                <div className="bg-[var(--bg-elevated)] p-4 rounded-xl shadow-sm border border-[var(--bg-border)]/30">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <h3 className="font-display text-sm font-bold text-[var(--empire-cream)]">{event.title}</h3>
                    <span className="font-body text-[10px] font-semibold text-[var(--empire-cream)]/40 uppercase tracking-wider">{event.date}</span>
                  </div>
                  <p className="font-body text-xs text-[var(--empire-cream)]/70 leading-relaxed">{event.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Diagnostic/Pledge sidebar - 5 columns */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          {/* Neuter verification badge */}
          <NeuterBadge 
            catId={cat.id} 
            isSterilized={cat.sterilized} 
            canRequest={!!user} 
          />

          {/* Care Pledges */}
          <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
            <h2 className="font-display text-base text-[var(--empire-gold)] font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--life-teal)]" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
              <span>Guardians & Care Pledges</span>
            </h2>

            {caregivers.length === 0 ? (
              <p className="font-body text-xs text-[var(--empire-cream)]/50 leading-relaxed">
                No active care pledges yet. Click "Lend a Paw" to pledge food, trapping help, foster care, or medical sponsorship for this cat!
              </p>
            ) : (
              <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                {caregivers.map((cg, idx) => {
                  const pledgeLabels: Record<string, string> = {
                    food: '🍲 Pledged Food & Water',
                    tnr: '✂️ Pledged TNR Trap Help',
                    foster: '🫂 Pledged Temp Foster',
                    vet: '🩺 Pledged Vet Care Sponsor',
                  };
                  return (
                    <div key={idx} className="bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--bg-border)]/20 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[var(--bg-border)]/20 overflow-hidden flex items-center justify-center shrink-0 border border-[var(--bg-border)]/35">
                        {!cg.is_anonymous && cg.profiles?.avatar_url ? (
                          <img src={cg.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm">🐱</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-body text-[11px] font-bold text-[var(--empire-cream)] truncate">
                          {cg.is_anonymous ? 'Anonymous Volunteer' : (cg.profiles?.display_name ?? 'Anonymous Volunteer')}
                        </div>
                        <div className="font-body text-[10px] text-[var(--life-teal)] font-semibold mt-0.5">
                          {pledgeLabels[cg.pledge] || cg.pledge}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Breed Diagnostics */}
          {cat.breed_estimate && (
            <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
              <h2 className="font-display text-base text-[var(--empire-gold)] font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined">science</span>
                <span>AI Breed Diagnostics</span>
              </h2>
              
              <div className="mb-4">
                <div className="font-body text-xs text-[var(--empire-cream)]/50 mb-0.5">AI Breed Estimate</div>
                <div className="font-display text-lg text-[var(--life-teal)] font-bold">{cat.breed_estimate}</div>
                {cat.breed_confidence && (
                  <div className="font-data text-[11px] text-[var(--empire-cream)]/40 mt-0.5">
                    {(cat.breed_confidence * 100).toFixed(0)}% confidence score
                  </div>
                )}
              </div>

              {breedProfile && (
                <div className="space-y-3 pt-3 border-t border-[var(--bg-border)]/40">
                  <div className="font-body text-xs font-semibold text-[var(--empire-cream)]">🧬 Breed Profile Health Notes</div>
                  {breedProfile.conditions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {breedProfile.conditions.map((cond) => (
                        <span key={cond} className="px-2 py-0.5 bg-[var(--bg-elevated)] border border-[var(--bg-border)]/50 rounded-md font-body text-[10px] text-[var(--status-tnr)] font-medium">
                          {cond}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="font-body text-xs text-[var(--empire-cream)]/70 leading-relaxed">
                    {breedProfile.note}
                  </p>
                </div>
              )}

              <p className="font-body text-[10px] text-[var(--empire-cream)]/40 italic leading-relaxed pt-3 border-t border-[var(--bg-border)]/40">
                {VETERINARY_DISCLAIMER}
              </p>
            </div>
          )}

          {/* BCS Scale Diagnostics */}
          {bcsData && (
            <div className="bg-white p-6 rounded-2xl shadow-ambient border border-[var(--bg-border)]">
              <h2 className="font-display text-base text-[var(--empire-gold)] font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined">monitor_heart</span>
                <span>Body Condition Score (BCS)</span>
              </h2>
              
              <div 
                className="p-4 rounded-xl border mb-3"
                style={{ 
                  backgroundColor: `${BCS_RISK_COLORS[bcsData.risk]}10`, 
                  borderColor: `${BCS_RISK_COLORS[bcsData.risk]}30` 
                }}
              >
                <div className="font-body text-xs text-[var(--empire-cream)]/60 mb-0.5">Estimated BCS Rating</div>
                <div 
                  className="font-display text-lg font-bold" 
                  style={{ color: BCS_RISK_COLORS[bcsData.risk] }}
                >
                  Score {cat.bcs_estimate}/9 — {bcsData.label}
                </div>
                <p className="font-body text-xs text-[var(--empire-cream)]/70 mt-2 leading-relaxed">
                  {bcsData.guidance}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
