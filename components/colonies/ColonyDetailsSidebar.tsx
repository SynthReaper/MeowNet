'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addWinterShelter, inspectWinterShelter } from '@/lib/actions/colonies';
import { createMedicalLog, transferEmpirePointsToColonyFund } from '@/lib/actions/medical';

interface Shelter {
  id: string;
  material: string;
  capacity_cats: number | null;
  insulation_r: number | null;
  last_inspected: string | null;
}

interface MedicalLog {
  id: string;
  log_type: 'vaccine' | 'parasite_treatment' | 'injury' | 'checkup';
  notes: string;
  created_at: string;
  recorded_by: string;
}

interface Props {
  colonyId: string;
  initialShelters: Shelter[];
  initialMedicalLogs: MedicalLog[];
  initialFundBalance: number;
  isAuthorized: boolean;
  userPoints: number;
  initialPop: number;
  initialTnr: number;
  coords: { lat: number; lng: number };
}

export default function ColonyDetailsSidebar({
  colonyId,
  initialShelters,
  initialMedicalLogs,
  initialFundBalance,
  isAuthorized,
  userPoints,
  initialPop,
  initialTnr,
  coords,
}: Props) {
  const router = useRouter();
  
  // Tab states: 'shelters' | 'medical' | 'fund' | 'simulator' | 'weather_risk'
  const [activeTab, setActiveTab] = useState<'shelters' | 'medical' | 'fund' | 'simulator' | 'weather_risk'>('shelters');
  
  // Loading & Form States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Winter Shelter form states
  const [shelterMaterial, setShelterMaterial] = useState('');
  const [shelterCapacity, setShelterCapacity] = useState(2);
  const [shelterInsulation, setShelterInsulation] = useState(3.5);
  const [showAddShelter, setShowAddShelter] = useState(false);

  // Medical Log form states
  const [medLogType, setMedLogType] = useState<'vaccine' | 'parasite_treatment' | 'injury' | 'checkup'>('checkup');
  const [medNotes, setMedNotes] = useState('');
  const [showAddMedLog, setShowAddMedLog] = useState(false);

  // Fund donation state
  const [donationAmount, setDonationAmount] = useState(10);

  // Population Simulator states
  const [simYears, setSimYears] = useState(3);

  // Weather predictive states
  const [weatherData, setWeatherData] = useState<any | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  // Fetch weather data client-side when weather_risk tab is active
  useEffect(() => {
    if (activeTab !== 'weather_risk') return;
    let active = true;
    async function fetchWeather() {
      setLoadingWeather(true);
      try {
        const res = await fetch(`/api/weather?lat=${coords.lat}&lng=${coords.lng}`);
        if (res.ok && active) {
          const data = await res.json();
          setWeatherData(data);
        }
      } catch (err) {
        console.error('Failed to load weather prediction', err);
      } finally {
        if (active) setLoadingWeather(false);
      }
    }
    fetchWeather();
    return () => { active = false; };
  }, [activeTab, coords]);

  const handleAddShelter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shelterMaterial) return;
    setLoading(true);
    setError(null);
    try {
      const res = await addWinterShelter(colonyId, shelterMaterial, shelterCapacity, shelterInsulation);
      if (res.success) {
        setShelterMaterial('');
        setShowAddShelter(false);
        setSuccessMsg('Shelter registered successfully!');
        setTimeout(() => setSuccessMsg(null), 3000);
        router.refresh();
      } else {
        setError(res.error || 'Failed to add shelter.');
      }
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleInspectShelter = async (shelterId: string) => {
    setLoading(true);
    try {
      const res = await inspectWinterShelter(shelterId, colonyId);
      if (res.success) {
        setSuccessMsg('Shelter marked as inspected!');
        setTimeout(() => setSuccessMsg(null), 3000);
        router.refresh();
      } else {
        alert(res.error || 'Failed to update inspection.');
      }
    } catch {
      alert('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedicalLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medNotes) return;
    setLoading(true);
    setError(null);
    try {
      const res = await createMedicalLog(colonyId, medLogType, medNotes);
      if (res.success) {
        setMedNotes('');
        setShowAddMedLog(false);
        setSuccessMsg('Medical entry logged successfully! (+15 XP)');
        setTimeout(() => setSuccessMsg(null), 4000);
        router.refresh();
      } else {
        setError(res.error || 'Failed to log medical entry.');
      }
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (donationAmount <= 0) return;
    if (userPoints < donationAmount) {
      setError('Insufficient points in your wallet.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await transferEmpirePointsToColonyFund(colonyId, donationAmount);
      if (res.success) {
        setSuccessMsg(`Successfully donated ${donationAmount} points!`);
        setTimeout(() => setSuccessMsg(null), 3000);
        router.refresh();
      } else {
        setError(res.error || 'Transfer failed.');
      }
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  // Mathematical Population Projection model
  // TNR slows down birth rates.
  // Standard math: unsterilized cats grow at a rate of ~40% per year due to breeding cycles.
  // Sterilized cats don't breed and decline at natural mortality rate of ~15% per year.
  const calculateProjections = () => {
    const years = Array.from({ length: simYears + 1 }, (_, i) => i);
    let currentUnsterilized = Math.max(0, initialPop - initialTnr);
    let currentSterilized = initialTnr;

    return years.map(yr => {
      if (yr === 0) {
        return { year: 'Current', total: initialPop, sterilized: initialTnr, unsterilized: currentUnsterilized };
      }
      
      // Sterilized cats die at ~15% per year
      currentSterilized = Math.round(currentSterilized * 0.85);

      // Unsterilized cats multiply at +40% but die at ~15% (net +25% change)
      // And we assume a steady rate of TNR trapping of 10% of unsterilized cats being neutered each year
      const newlyNeutered = Math.round(currentUnsterilized * 0.15);
      currentUnsterilized = Math.round((currentUnsterilized - newlyNeutered) * 1.25);
      currentSterilized += newlyNeutered;

      const total = Math.max(0, currentSterilized + currentUnsterilized);

      return {
        year: `Year ${yr}`,
        total,
        sterilized: currentSterilized,
        unsterilized: currentUnsterilized
      };
    });
  };

  const projections = calculateProjections();

  return (
    <div className="bg-white border border-[var(--bg-border)] rounded-2xl p-6 shadow-ambient flex flex-col gap-6">
      {/* Dynamic Tabs */}
      <div className="flex border-b border-[var(--bg-border)]/40 text-xs font-display font-bold uppercase tracking-wider overflow-x-auto gap-2">
        {(['shelters', 'medical', 'fund', 'simulator', 'weather_risk'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setError(null);
              setSuccessMsg(null);
            }}
            className={`pb-2.5 px-2 cursor-pointer transition-all border-b-2 bg-transparent outline-none shrink-0 ${
              activeTab === tab 
                ? 'border-[var(--empire-gold)] text-[var(--empire-gold)]' 
                : 'border-transparent text-[var(--empire-cream)]/50 hover:text-[var(--empire-cream)]'
            }`}
          >
            {tab === 'shelters' && '❄️ Winter Shelters'}
            {tab === 'medical' && '🩺 Vet Logs'}
            {tab === 'fund' && '💰 Care Fund'}
            {tab === 'simulator' && '📈 TNR Simulator'}
            {tab === 'weather_risk' && '⛈️ Weather Risk'}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[11px] font-bold flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] font-bold flex items-center gap-1.5 animate-fade-in">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tab: Winter Shelters */}
      {activeTab === 'shelters' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-[var(--empire-cream)]/40">Registered Shelters</span>
            {isAuthorized && (
              <button
                onClick={() => setShowAddShelter(!showAddShelter)}
                className="text-[10px] font-black uppercase text-[var(--empire-gold)] hover:underline flex items-center gap-0.5 bg-transparent cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">add</span>
                <span>Add Shelter</span>
              </button>
            )}
          </div>

          {showAddShelter && (
            <form onSubmit={handleAddShelter} className="bg-[var(--bg-elevated)]/50 p-4 rounded-xl border border-[var(--bg-border)]/30 flex flex-col gap-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--empire-cream)]/50 uppercase block mb-1">Structure/Material</label>
                <input
                  type="text"
                  placeholder="e.g. Tote box with styrofoam"
                  value={shelterMaterial}
                  onChange={(e) => setShelterMaterial(e.target.value)}
                  className="w-full bg-[var(--bg-void)] text-[var(--empire-cream)] font-body text-xs p-2 rounded-lg border border-[var(--bg-border)]/40 focus:border-[var(--empire-gold)] outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--empire-cream)]/50 uppercase block mb-1">Cat Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={shelterCapacity}
                    onChange={(e) => setShelterCapacity(parseInt(e.target.value) || 1)}
                    className="w-full bg-[var(--bg-void)] text-[var(--empire-cream)] font-body text-xs p-2 rounded-lg border border-[var(--bg-border)]/40 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--empire-cream)]/50 uppercase block mb-1">R-Value Insulation</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    value={shelterInsulation}
                    onChange={(e) => setShelterInsulation(parseFloat(e.target.value) || 1)}
                    className="w-full bg-[var(--bg-void)] text-[var(--empire-cream)] font-body text-xs p-2 rounded-lg border border-[var(--bg-border)]/40 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end text-[10px] font-bold uppercase mt-1">
                <button
                  type="button"
                  onClick={() => setShowAddShelter(false)}
                  className="px-3 py-1 bg-transparent text-[var(--empire-cream)]/50 border border-transparent rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-[var(--empire-gold)] text-white rounded-md cursor-pointer"
                >
                  Register
                </button>
              </div>
            </form>
          )}

          {initialShelters.length === 0 ? (
            <div className="text-center py-6 text-xs text-[var(--empire-cream)]/40 italic bg-[var(--bg-elevated)]/20 rounded-xl border border-dashed border-[var(--bg-border)]/30">
              No shelters registered for this colony yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {initialShelters.map(shelter => (
                <div key={shelter.id} className="p-3 bg-[var(--bg-elevated)]/30 border border-[var(--bg-border)]/20 rounded-xl flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-body text-xs font-bold text-[var(--empire-cream)] truncate">{shelter.material}</h4>
                    <span className="font-body text-[10px] text-[var(--empire-cream)]/50 mt-0.5 block">
                      Capacity: {shelter.capacity_cats || 'Unknown'} cats · R-{shelter.insulation_r || 'N/A'} Insulation
                    </span>
                    <span className="font-body text-[9px] text-[var(--empire-cream)]/35 block mt-0.5">
                      Inspected: {shelter.last_inspected ? new Date(shelter.last_inspected).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                  {isAuthorized && (
                    <button
                      onClick={() => handleInspectShelter(shelter.id)}
                      disabled={loading}
                      className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg font-display text-[9px] font-bold uppercase tracking-wider shrink-0 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-xs">done_all</span>
                      <span>Inspect</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Medical Logs */}
      {activeTab === 'medical' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-[var(--empire-cream)]/40">Veterinary Records</span>
            {isAuthorized && (
              <button
                onClick={() => setShowAddMedLog(!showAddMedLog)}
                className="text-[10px] font-black uppercase text-[var(--empire-gold)] hover:underline flex items-center gap-0.5 bg-transparent cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">add</span>
                <span>Log Treatment</span>
              </button>
            )}
          </div>

          {showAddMedLog && (
            <form onSubmit={handleAddMedicalLog} className="bg-[var(--bg-elevated)]/50 p-4 rounded-xl border border-[var(--bg-border)]/30 flex flex-col gap-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--empire-cream)]/50 uppercase block mb-1">Treatment Type</label>
                <select
                  value={medLogType}
                  onChange={(e) => setMedLogType(e.target.value as any)}
                  className="w-full bg-[var(--bg-void)] text-[var(--empire-cream)] font-body text-xs p-2 rounded-lg border border-[var(--bg-border)]/40 outline-none"
                >
                  <option value="checkup">🧑‍⚕️ Standard Checkup</option>
                  <option value="vaccine">💉 Vaccination Booster</option>
                  <option value="parasite_treatment">💊 Parasite Treatment</option>
                  <option value="injury">🩹 Wound/Injury Care</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--empire-cream)]/50 uppercase block mb-1">Clinical Notes</label>
                <textarea
                  placeholder="Record what medicine or treatment was administered..."
                  value={medNotes}
                  onChange={(e) => setMedNotes(e.target.value)}
                  className="w-full bg-[var(--bg-void)] text-[var(--empire-cream)] font-body text-xs p-2.5 rounded-lg border border-[var(--bg-border)]/40 focus:border-[var(--empire-gold)] outline-none resize-none"
                  rows={3}
                  required
                />
              </div>
              <div className="flex gap-2 justify-end text-[10px] font-bold uppercase mt-1">
                <button
                  type="button"
                  onClick={() => setShowAddMedLog(false)}
                  className="px-3 py-1 bg-transparent text-[var(--empire-cream)]/50 border border-transparent rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-[var(--empire-gold)] text-white rounded-md cursor-pointer"
                >
                  Add Entry
                </button>
              </div>
            </form>
          )}

          {initialMedicalLogs.length === 0 ? (
            <div className="text-center py-6 text-xs text-[var(--empire-cream)]/40 italic bg-[var(--bg-elevated)]/20 rounded-xl border border-dashed border-[var(--bg-border)]/30">
              No veterinary records registered for this colony yet.
            </div>
          ) : (
            <div className="relative border-l border-[var(--bg-border)]/40 ml-2 space-y-4">
              {initialMedicalLogs.map(log => {
                const badgeColor = 
                  log.log_type === 'vaccine' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                  log.log_type === 'injury' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                  log.log_type === 'parasite_treatment' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                  'bg-zinc-50 text-zinc-700 border-zinc-100';

                return (
                  <div key={log.id} className="relative pl-6">
                    <div className="absolute -left-[5.5px] top-1 w-2.5 h-2.5 bg-white border border-[var(--empire-gold)] rounded-full" />
                    <div className="p-3 bg-[var(--bg-elevated)]/20 border border-[var(--bg-border)]/20 rounded-xl flex flex-col gap-2">
                      <div className="flex justify-between items-center flex-wrap gap-2 text-[9px] font-bold">
                        <span className={`px-2 py-0.5 rounded border ${badgeColor} capitalize`}>
                          {log.log_type.replace('_', ' ')}
                        </span>
                        <span className="text-[var(--empire-cream)]/40">
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="font-body text-xs text-[var(--empire-cream)]/80 leading-relaxed whitespace-pre-wrap">
                        {log.notes}
                      </p>
                      <span className="text-[8px] text-[var(--empire-cream)]/40 font-semibold uppercase tracking-wider block">
                        Logged by: {log.recorded_by}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Community Fund */}
      {activeTab === 'fund' && (
        <div className="flex flex-col gap-5">
          <div className="bg-gradient-to-br from-amber-500/5 to-emerald-500/5 border border-[var(--bg-border)]/20 p-4 rounded-xl flex items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-bold text-[var(--empire-cream)]/45 uppercase tracking-wider block mb-0.5">Colony Balance</span>
              <span className="font-display text-2xl font-black text-[var(--life-teal)]">{initialFundBalance} pts</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-[var(--life-teal)]/10 text-[var(--life-teal)] flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined">payments</span>
            </div>
          </div>

          <form onSubmit={handleDonate} className="flex flex-col gap-4">
            <div>
              <h3 className="font-display text-xs font-bold text-[var(--empire-cream)] mb-1">Donate Empire Points</h3>
              <p className="font-body text-[10px] text-[var(--empire-cream)]/50 leading-normal">
                Contribute your earned XP/Karma points directly to this colony's monthly feeding & medical reserve pool.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max={userPoints}
                value={donationAmount}
                onChange={(e) => setDonationAmount(parseInt(e.target.value) || 0)}
                className="flex-1 bg-[var(--bg-void)] text-[var(--empire-cream)] font-body text-xs p-2.5 rounded-xl border border-[var(--bg-border)]/60 focus:border-[var(--empire-gold)] outline-none"
              />
              <button
                type="submit"
                disabled={loading || donationAmount <= 0 || userPoints < donationAmount}
                className="bg-[var(--life-teal)] text-white hover:opacity-90 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-xs">volunteer_activism</span>
                <span>Send</span>
              </button>
            </div>
            <div className="flex justify-between text-[9px] font-bold uppercase text-[var(--empire-cream)]/40 mt-1">
              <span>Your Wallet: {userPoints.toLocaleString()} pts</span>
              {donationAmount > userPoints && <span className="text-red-500">Insufficient balance</span>}
            </div>
          </form>
        </div>
      )}

      {/* Tab: TNR Impact Simulator */}
      {activeTab === 'simulator' && (
        <div className="flex flex-col gap-5">
          <div>
            <h3 className="font-display text-xs font-bold text-[var(--empire-cream)] mb-1">TNR Impact Projection</h3>
            <p className="font-body text-[10px] text-[var(--empire-cream)]/50 leading-normal">
              Simulate colony population decline over {simYears} years under structured TNR sterilization runs.
            </p>
          </div>

          <div className="flex justify-between items-center gap-4">
            <span className="text-[10px] font-bold text-[var(--empire-cream)]/40 uppercase">Simulation Term</span>
            <div className="flex gap-1.5">
              {[3, 5, 10].map(y => (
                <button
                  key={y}
                  onClick={() => setSimYears(y)}
                  className={`px-2.5 py-1 rounded-md font-display text-[10px] font-bold cursor-pointer transition-all border ${
                    simYears === y 
                      ? 'bg-[var(--empire-gold)] text-white border-[var(--empire-gold)]' 
                      : 'bg-[var(--bg-elevated)] text-[var(--empire-cream)]/60 border-[var(--bg-border)]/40 hover:bg-[var(--bg-border)]/10'
                  }`}
                >
                  {y} Years
                </button>
              ))}
            </div>
          </div>

          {/* Simple custom responsive bar chart representing population changes */}
          <div className="flex flex-col gap-3.5 bg-[var(--bg-elevated)]/25 p-4 rounded-xl border border-[var(--bg-border)]/20">
            {projections.map((p, idx) => {
              const maxVal = Math.max(...projections.map(x => x.total));
              const pctWidth = maxVal > 0 ? (p.total / maxVal) * 100 : 0;
              const sterPct = p.total > 0 ? (p.sterilized / p.total) * 100 : 0;

              return (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex justify-between text-[9px] font-bold uppercase">
                    <span className="text-[var(--empire-cream)]">{p.year}</span>
                    <span className="text-[var(--empire-cream)]/60 font-data">
                      Total: {p.total} ({p.sterilized} neutered)
                    </span>
                  </div>
                  <div className="h-4 w-full bg-[var(--bg-void)] rounded-md overflow-hidden relative border border-[var(--bg-border)]/10">
                    <div 
                      className="h-full rounded-md flex overflow-hidden transition-all duration-500" 
                      style={{ width: `${pctWidth}%` }}
                    >
                      <div className="h-full bg-[var(--life-teal)]" style={{ width: `${sterPct}%` }} />
                      <div className="h-full bg-rose-400" style={{ width: `${100 - sterPct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-4 text-[9px] font-bold uppercase text-[var(--empire-cream)]/40 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--life-teal)]" />
              <span>Sterilized Cats</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span>Unsterilized Breeding</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Weather Vulnerability Risk Predictor */}
      {activeTab === 'weather_risk' && (
        <div className="flex flex-col gap-5 text-[var(--empire-cream)]">
          <div>
            <h3 className="font-display text-xs font-bold text-[var(--empire-cream)] mb-1">
              Cat-Astrophe Safety Index
            </h3>
            <p className="font-body text-[10px] text-[var(--empire-cream)]/50 leading-normal">
              Calculates colony safety vulnerability index based on real-time Open-Meteo forecasts and winter shelters insulation capacity.
            </p>
          </div>

          {loadingWeather ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <div className="w-5 h-5 border-2 border-[var(--empire-gold)] border-t-transparent rounded-full animate-spin" />
              <span className="font-body text-[10px] text-[var(--empire-cream)]/40 uppercase font-bold tracking-wider">Syncing meteorological forecast...</span>
            </div>
          ) : weatherData ? (() => {
            const temp = weatherData.temp || 65;
            const wind = weatherData.windspeed || 0;
            const precipP = weatherData.precipProb || 0;
            const precipIn = weatherData.todayPrecipIn || 0;
            
            let coldHazard = 0;
            if (temp < 32) {
              coldHazard = Math.min(50, (32 - temp) * 3);
            }
            let heatHazard = 0;
            if (temp > 90) {
              heatHazard = Math.min(50, (temp - 90) * 3);
            }
            const precipHazard = Math.min(30, (precipP * 0.1) + (precipIn * 15));
            let windHazard = 0;
            if (wind > 15) {
              windHazard = Math.min(20, (wind - 15) * 1);
            }

            const baseRisk = Math.min(100, coldHazard + heatHazard + precipHazard + windHazard);

            const totalCapacity = initialShelters.reduce((acc, s) => acc + (s.capacity_cats || 2), 0);
            const validShelters = initialShelters.filter(s => s.insulation_r !== null);
            const avgRVal = validShelters.length > 0 
              ? validShelters.reduce((acc, s) => acc + (s.insulation_r || 3.5), 0) / validShelters.length
              : 3.5;
            
            const safetyRatio = Math.min(1, totalCapacity / Math.max(1, initialPop));
            const mitigationScore = safetyRatio * avgRVal * 10;

            const vulnerabilityScore = Math.max(0, Math.min(100, Math.round(baseRisk - mitigationScore)));

            let rating = 'Optimal Safety';
            let ratingColor = 'text-emerald-500';
            let ratingBg = 'bg-emerald-500/10 border-emerald-500/20';
            let guidance = 'No immediate action required. Colony winterization is sufficient for current forecasts.';

            if (vulnerabilityScore > 50) {
              rating = 'Critical Hazard';
              ratingColor = 'text-rose-500';
              ratingBg = 'bg-rose-500/10 border-rose-500/20';
              guidance = 'Immediate action recommended. Current weather conditions present safety hazards. Deploy additional insulated shelters packed with straw.';
            } else if (vulnerabilityScore > 20) {
              rating = 'Moderate Concern';
              ratingColor = 'text-amber-500';
              ratingBg = 'bg-amber-500/10 border-amber-500/20';
              guidance = 'Colony is partially vulnerable. Inspect shelter door flaps, seals, and ensure fresh water supply remains unfrozen.';
            }

            return (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                {/* Visual Vulnerability Gauge */}
                <div className={`p-4 rounded-xl border flex flex-col items-center text-center ${ratingBg}`}>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--empire-cream)]/50">Safety Risk Index</span>
                  <div className={`text-4xl font-black mt-2 mb-1 ${ratingColor}`}>
                    {vulnerabilityScore} <span className="text-lg font-bold">/ 100</span>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${ratingColor}`}>{rating}</span>
                  <p className="font-body text-[10px] text-[var(--empire-cream)]/70 mt-2 leading-relaxed max-w-[280px]">
                    {guidance}
                  </p>
                </div>

                {/* Forecast Stats */}
                <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--bg-border)]/30 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[var(--empire-cream)]/50">Fahrenheit Temperature</span>
                    <strong className="font-semibold text-[var(--empire-cream)]">{temp}°F (Feels {Math.round(weatherData.apparentTemp ?? temp)}°F)</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[var(--empire-cream)]/50">Wind Speed</span>
                    <strong className="font-semibold text-[var(--empire-cream)]">{wind} mph</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[var(--empire-cream)]/50">Precipitation Sum</span>
                    <strong className="font-semibold text-[var(--empire-cream)]">{precipIn} inches ({precipP}% probability)</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[var(--empire-cream)]/50">WMO Description</span>
                    <strong className="font-semibold text-[var(--empire-cream)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-[var(--empire-gold)]">{weatherData.icon}</span>
                      <span>{weatherData.description}</span>
                    </strong>
                  </div>
                </div>

                {/* Audit Checklist */}
                <div className="flex flex-col gap-1 text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wide">
                  <span>Mitigation Factors:</span>
                  <div className="flex flex-col gap-1.5 mt-1">
                    <div className="flex justify-between bg-white/5 p-2 rounded-lg items-center border border-white/5">
                      <span>Shelter Capacity vs. Colony Pop:</span>
                      <strong className="text-[var(--empire-cream)]">{totalCapacity} / {initialPop} cats ({Math.round(safetyRatio * 100)}%)</strong>
                    </div>
                    <div className="flex justify-between bg-white/5 p-2 rounded-lg items-center border border-white/5">
                      <span>Average Insulation R-value:</span>
                      <strong className="text-[var(--empire-cream)]">R-{avgRVal.toFixed(1)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs text-center font-bold">
              Unable to reach Open-Meteo proxy to sync coordinates forecast.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
