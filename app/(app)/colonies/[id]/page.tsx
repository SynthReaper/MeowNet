// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
// app/(app)/colonies/[id]/page.tsx — Colony detailed overview page
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ColonyInteraction from '@/components/colonies/ColonyInteraction';
import ColonyDetailsSidebar from '@/components/colonies/ColonyDetailsSidebar';

export const dynamic = 'force-dynamic';

interface ColonyDetail {
  id: string;
  name: string;
  description: string | null;
  location: any;
  population_estimate: number;
  tnr_count: number;
  caretaker_id: string | null;
  created_by: string | null;
  created_at: string;
  caretaker?: {
    display_name: string | null;
  } | null;
  creator?: {
    display_name: string | null;
  } | null;
}

interface CatItem {
  id: string;
  name: string | null;
  photo_url: string;
  status: string;
  location: any;
  age_estimate: string | null;
  breed_estimate: string | null;
  created_at: string;
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseGeoPoint(loc: any) {
  let lat = 0;
  let lng = 0;
  if (loc && typeof loc === 'object') {
    const geojson = loc as { type?: string; coordinates?: number[] };
    if (geojson.type === 'Point' && Array.isArray(geojson.coordinates) && geojson.coordinates.length >= 2) {
      lng = geojson.coordinates[0];
      lat = geojson.coordinates[1];
    }
  } else if (typeof loc === 'string') {
    const match = loc.match(/POINT\(([^ ]+) ([^ )]+)\)/);
    if (match) {
      lng = parseFloat(match[1]);
      lat = parseFloat(match[2]);
    }
  }
  return { lat, lng };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('colonies' as never)
    .select('name')
    .eq('id', id)
    .single() as { data: { name: string } | null };

  return {
    title: data ? data.name : 'Colony Details',
  };
}

export default async function ColonyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Fetch Colony details
  const { data: colony, error } = await supabase
    .from('colonies' as never)
    .select('id, name, description, location, population_estimate, tnr_count, caretaker_id, created_by, created_at, caretaker:profiles!colonies_caretaker_id_fkey(display_name), creator:profiles!colonies_created_by_fkey(display_name)')
    .eq('id', id)
    .single() as { data: ColonyDetail | null; error: any };

  if (error || !colony) {
    notFound();
  }

  // 2. Fetch user role
  let userRole = 'user';
  if (user) {
    const { data: p } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null };
    if (p) userRole = p.role;
  }

  // 2b. Fetch shelters, medical logs, community funds, and user points
  let shelters: any[] = [];
  try {
    const { data } = await supabase.from('winter_shelters' as never).select('*').eq('colony_id', id);
    if (data) shelters = data;
  } catch {}

  let medicalLogs: any[] = [];
  try {
    const { data } = await supabase
      .from('colony_medical_logs' as never)
      .select('id, log_type, notes, created_at, profiles:recorded_by(display_name)')
      .eq('colony_id', id)
      .order('created_at', { ascending: false });
    if (data) {
      medicalLogs = data.map((row: any) => ({
        id: row.id,
        log_type: row.log_type,
        notes: row.notes,
        created_at: row.created_at,
        recorded_by: row.profiles?.display_name || 'Anonymous Rescuer'
      }));
    }
  } catch {}

  let fundBalance = 0;
  try {
    const { data } = await supabase.from('community_fund' as never).select('balance').eq('colony_id', id).maybeSingle();
    if (data) fundBalance = (data as any).balance || 0;
  } catch {}

  let userPoints = 0;
  if (user) {
    try {
      const { data } = await supabase.from('profiles' as never).select('empire_points').eq('id', user.id).single();
      if (data) userPoints = (data as any).empire_points || 0;
    } catch {}
  }

  // 3. Parse coordinates
  const colonyCoords = parseGeoPoint(colony.location);

  // 4. Fetch all cats and filter by distance (Haversine formula within 500m)
  const { data: allCats } = await supabase
    .from('cats' as never)
    .select('id, name, photo_url, status, location, age_estimate, breed_estimate, created_at') as { data: CatItem[] | null };

  const nearbyCats = (allCats ?? [])
    .map((cat) => {
      const catCoords = parseGeoPoint(cat.location);
      const distance = getDistanceMeters(
        colonyCoords.lat,
        colonyCoords.lng,
        catCoords.lat,
        catCoords.lng
      );
      return { ...cat, distance };
    })
    .filter((cat) => cat.distance <= 500)
    .sort((a, b) => a.distance - b.distance);

  const pct = colony.population_estimate > 0 
    ? Math.min(100, Math.round((colony.tnr_count / colony.population_estimate) * 100))
    : 0;

  return (
    <div className="flex-grow w-full max-w-5xl mx-auto px-4 md:px-12 py-10 md:py-16 flex flex-col gap-8">
      {/* Back link */}
      <div>
        <Link
          href="/colonies"
          className="font-body text-xs font-bold text-[var(--empire-gold)] hover:underline flex items-center gap-1 no-underline"
        >
          <span className="material-symbols-outlined text-xs">arrow_back</span>
          <span>Back to colonies list</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Details & Nearby Felines */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Main Info Card */}
          <section className="bg-white border border-[var(--bg-border)] rounded-2xl p-6 md:p-8 shadow-ambient flex flex-col gap-6">
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-extrabold text-[var(--empire-cream)]">
                  {colony.name}
                </h1>
                <p className="font-body text-xs text-[var(--empire-cream)]/50 mt-1 flex items-center gap-1.5 font-semibold">
                  <span className="material-symbols-outlined text-sm text-[var(--empire-cream)]/40">my_location</span>
                  <span>Coords: {colonyCoords.lat.toFixed(5)}°, {colonyCoords.lng.toFixed(5)}°</span>
                </p>
                <Link
                  href={`/colonies/${colony.id}/qr`}
                  className="font-body text-[10px] font-bold text-[var(--empire-gold)] hover:underline flex items-center gap-1 mt-1.5 w-fit no-underline"
                >
                  <span className="material-symbols-outlined text-xs">qr_code_2</span>
                  <span>Print Colony QR Sticker</span>
                </Link>
              </div>
              
              <ColonyInteraction
                colonyId={colony.id}
                caretakerId={colony.caretaker_id}
                createdBy={colony.created_by}
                currentUserId={user?.id || null}
                userRole={userRole}
                populationEstimate={colony.population_estimate}
                tnrCount={colony.tnr_count}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
              {/* Details */}
              <div className="md:col-span-2 flex flex-col gap-4">
                <div>
                  <span className="text-[10px] font-bold text-[var(--empire-cream)]/45 uppercase tracking-wider block mb-1">Description</span>
                  <p className="font-body text-sm text-[var(--empire-cream)]/80 leading-relaxed bg-[var(--bg-elevated)]/50 p-4 rounded-xl border border-[var(--bg-border)]/20 whitespace-pre-wrap">
                    {colony.description || 'No detailed description available for this colony.'}
                  </p>
                </div>

                <div className="flex gap-6 text-xs text-[var(--empire-cream)]/60 font-body">
                  <div>
                    <span className="font-bold text-[10px] text-[var(--empire-cream)]/40 uppercase block mb-0.5">Registered By</span>
                    <span>{colony.creator?.display_name || 'Anonymous User'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[10px] text-[var(--empire-cream)]/40 uppercase block mb-0.5">Caretaker Assignment</span>
                    <span className="font-bold text-[var(--life-teal)]">{colony.caretaker?.display_name || 'Unassigned'}</span>
                  </div>
                </div>
              </div>

              {/* TNR meter */}
              <div className="bg-[var(--bg-elevated)]/40 border border-[var(--bg-border)]/50 rounded-2xl p-5 flex flex-col gap-4">
                <h3 className="font-display text-sm font-bold text-[var(--empire-cream)] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                  <span>TNR Tracker</span>
                </h3>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-[var(--empire-cream)]/45">
                    <span>Progress</span>
                    <span>{pct}% sterilized</span>
                  </div>
                  <div className="tnr-progress-track">
                    <div className="tnr-progress-fill" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-[var(--bg-border)]/20 pt-3 text-xs text-[var(--empire-cream)]/80 font-body">
                  <div className="flex justify-between">
                    <span>{"TNR'd:"}</span>
                    <strong className="font-data">{colony.tnr_count}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. Population:</span>
                    <strong className="font-data">{colony.population_estimate}</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Nearby Felines Grid */}
          <section className="flex flex-col gap-5 mt-4">
            <div>
              <h2 className="font-display text-xl font-bold text-[var(--empire-cream)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--empire-gold)]">pets</span>
                <span>Nearby Felines</span>
              </h2>
              <p className="font-body text-xs text-[var(--empire-cream)]/50 mt-1">
                {"Registered stray or feral cats sighted within 500 meters of this colony's registered epicenter."}
              </p>
            </div>

            {nearbyCats.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[var(--bg-border)]/40 p-10 text-center shadow-ambient text-[var(--empire-cream)]/50 font-body text-xs italic">
                No cats are logged in this immediate area yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {nearbyCats.map((cat) => (
                  <div
                    key={cat.id}
                    className="bg-white rounded-2xl border border-[var(--bg-border)] shadow-ambient overflow-hidden flex flex-col hover:shadow-active transition-all"
                  >
                    {/* Photo */}
                    <div className="h-44 bg-[var(--bg-elevated)] relative overflow-hidden border-b border-[var(--bg-border)]/25 flex items-center justify-center">
                      {cat.photo_url ? (
                        <img src={cat.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-[var(--empire-gold)]/40">pets</span>
                      )}
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full font-body text-[8px] font-extrabold uppercase tracking-wider bg-black/40 text-white backdrop-blur-sm">
                        {cat.distance.toFixed(0)}m away
                      </span>
                    </div>

                    {/* Details */}
                    <div className="p-4 flex flex-col gap-3 flex-grow justify-between">
                      <div>
                        <h4 className="font-display text-sm font-bold text-[var(--empire-cream)] truncate">
                          {cat.name || 'Unnamed Cat'}
                        </h4>
                        <span className="font-body text-[10px] text-[var(--empire-cream)]/50 mt-0.5 block font-semibold">
                          {cat.breed_estimate || 'Unknown breed'} · {cat.age_estimate || 'Unknown age'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center mt-2 border-t border-[var(--bg-border)]/10 pt-3">
                        <span className={`px-2 py-0.5 rounded-full font-body text-[8px] font-bold uppercase tracking-wider`}>
                          {cat.status.replace('_', ' ')}
                        </span>
                        <Link
                          href={`/cats/${cat.id}`}
                          className="font-body text-[10px] font-bold text-[var(--empire-gold)] hover:underline flex items-center gap-0.5"
                        >
                          <span>View Profile</span>
                          <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Colony Operations Workspace */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <ColonyDetailsSidebar
            colonyId={colony.id}
            initialShelters={shelters}
            initialMedicalLogs={medicalLogs}
            initialFundBalance={fundBalance}
            isAuthorized={
              !!(user && 
                 (user.id === colony.caretaker_id || 
                  user.id === colony.created_by || 
                  userRole === 'admin' || 
                  userRole === 'moderator'))
            }
            userPoints={userPoints}
            initialPop={colony.population_estimate}
            initialTnr={colony.tnr_count}
            coords={colonyCoords}
          />
        </div>
      </div>
    </div>
  );
}
