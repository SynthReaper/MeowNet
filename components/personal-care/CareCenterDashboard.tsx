'use client';
// components/personal-care/CareCenterDashboard.tsx
// Zero-knowledge private dashboard for tracking personal cats and managing AI assistant settings.

import { useState, useEffect, useCallback } from 'react';
import {
  listPrivateCats,
  upsertPrivateCat,
  deletePrivateCat,
  getPrivateConfig,
  savePrivateConfig,
} from '@/lib/actions/personalCare';
import { encryptData, decryptData } from '@/lib/security/encryption';

interface PrivateCatData {
  readonly name: string;
  readonly photoUrl: string;
  readonly status: string;
  readonly ageEstimate: string;
  readonly color: string;
  readonly vitals: Array<{
    readonly date: string;
    readonly bpm: number;
    readonly rr: number;
    readonly weight: number;
    readonly sleep: number;
    readonly calories: number;
    readonly stress: number; // 1-5 scale
  }>;
  readonly calendar: Array<{
    readonly id: string;
    readonly date: string;
    readonly title: string;
    readonly type: 'pill' | 'appointment';
    readonly completed: boolean;
  }>;
  readonly activities: Array<{
    readonly id: string;
    readonly date: string;
    readonly category: string;
    readonly notes: string;
  }>;
  readonly medical?: Array<{
    readonly id: string;
    readonly date: string;
    readonly treatment: string;
    readonly dose: string;
    readonly vetName: string;
    readonly nextBoosterDate?: string;
  }>;
  readonly customFields?: Array<{
    readonly id: string;
    readonly key: string;
    readonly value: string;
  }>;
}

interface DecryptedCat {
  readonly id: string;
  readonly data: PrivateCatData;
}

interface PrivateConfig {
  readonly geminiKey: string;
  readonly openaiKey: string;
  readonly anthropicKey: string;
  readonly preferredProvider: 'gemini' | 'openai' | 'anthropic';
  readonly preferredModel: string;
}

interface CareCenterDashboardProps {
  readonly passphrase: string;
}

const PROVIDER_MODELS = {
  gemini: ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  openai: ['gpt-4o', 'gpt-4o-mini'],
  anthropic: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
};

const resizeImageOnCanvas = (img: HTMLImageElement): string => {
  const canvas = document.createElement('canvas');
  const MAX_WIDTH = 300;
  const MAX_HEIGHT = 300;
  let width = img.width;
  let height = img.height;
  if (width > height) {
    if (width > MAX_WIDTH) {
      height *= MAX_WIDTH / width;
      width = MAX_WIDTH;
    }
  } else if (height > MAX_HEIGHT) {
    width *= MAX_HEIGHT / height;
    height = MAX_HEIGHT;
  }
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.6);
};

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        resolve(resizeImageOnCanvas(img));
      };
    };
  });
};

export default function CareCenterDashboard({ passphrase }: CareCenterDashboardProps) {
  // Config state
  const [config, setConfig] = useState<PrivateConfig>({
    geminiKey: '',
    openaiKey: '',
    anthropicKey: '',
    preferredProvider: 'gemini',
    preferredModel: 'gemini-1.5-flash',
  });
  const [isConfigSaving, setIsConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState('');

  // Cats list state
  const [cats, setCats] = useState<DecryptedCat[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [isCatsLoading, setIsCatsLoading] = useState(true);
  const [catActionLoading, setCatActionLoading] = useState(false);

  // New cat form state
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatStatus, setNewCatStatus] = useState('adopted');
  const [newCatAge, setNewCatAge] = useState('adult');
  const [newCatColor, setNewCatColor] = useState('');
  const [newCatPhoto, setNewCatPhoto] = useState<string>('');

  // Vitals input state
  const [inputBpm, setInputBpm] = useState('140');
  const [inputRr, setInputRr] = useState('24');
  const [inputWeight, setInputWeight] = useState('4.5');
  const [inputSleep, setInputSleep] = useState('14');
  const [inputCalories, setInputCalories] = useState('220');
  const [inputStress, setInputStress] = useState('1');

  // Calendar input state
  const [calTitle, setCalTitle] = useState('');
  const [calType, setCalType] = useState<'pill' | 'appointment'>('pill');
  const [calDate, setCalDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Activity input state
  const [actCategory, setActCategory] = useState('Food');
  const [actNotes, setActNotes] = useState('');

  // Medical treatment input state
  const [medTreatment, setMedTreatment] = useState('');
  const [medDose, setMedDose] = useState('1 dose');
  const [medVet, setMedVet] = useState('');
  const [medDate, setMedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [medBooster, setMedBooster] = useState('');

  // Custom metadata input state
  const [customKey, setCustomKey] = useState('');
  const [customVal, setCustomVal] = useState('');

  // Tabs state
  const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'calendar' | 'activities' | 'medical' | 'registry' | 'settings'>('overview');

  // Load config & private cats list
  const loadDashboardData = useCallback(async () => {
    try {
      setIsCatsLoading(true);

      // Load keys config
      const configRes = await getPrivateConfig();
      if (configRes.success && configRes.data?.encrypted_keys) {
        const decrypted = await decryptData(configRes.data.encrypted_keys, passphrase);
        setConfig(decrypted as PrivateConfig);
      }

      // Load cats
      const catsRes = await listPrivateCats();
      if (catsRes.success && catsRes.data) {
        const decryptedCats: DecryptedCat[] = [];
        for (const rawCat of catsRes.data) {
          try {
            const dec = await decryptData(rawCat.encrypted_data, passphrase);
            decryptedCats.push({
              id: rawCat.id,
              data: dec as PrivateCatData,
            });
          } catch {
            // Decryption failure on a single cat is skipped
          }
        }
        setCats(decryptedCats);
        if (decryptedCats.length > 0 && !selectedCatId) {
          setSelectedCatId(decryptedCats[0].id);
        }
      }
    } catch {
      // Handled silently
    } finally {
      setIsCatsLoading(false);
    }
  }, [passphrase, selectedCatId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboardData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadDashboardData]);

  // Select active cat
  const activeCat = cats.find((c) => c.id === selectedCatId) || null;

  // Handle keys config save
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfigSaving(true);
    setConfigMessage('');
    try {
      const ciphertext = await encryptData(config, passphrase);
      const res = await savePrivateConfig(ciphertext);
      if (res.success) {
        setConfigMessage('Settings saved and encrypted successfully.');
      } else {
        setConfigMessage(`Save failed: ${res.error}`);
      }
    } catch {
      setConfigMessage('Save error occurred.');
    } finally {
      setIsConfigSaving(false);
    }
  };



  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File is too large. Max 5MB');
        return;
      }
      try {
        const compressed = await compressImage(file);
        setNewCatPhoto(compressed);
      } catch {
        alert('Failed to compress image.');
      }
    }
  };

  // Create new private cat profile
  const handleAddCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatActionLoading(true);

    try {
      const payload: PrivateCatData = {
        name: newCatName.trim(),
        photoUrl: newCatPhoto || '/pet-logo.avif',
        status: newCatStatus,
        ageEstimate: newCatAge,
        color: newCatColor.trim() || 'Unknown',
        vitals: [],
        calendar: [],
        activities: [],
        medical: [],
        customFields: [],
      };

      const ciphertext = await encryptData(payload, passphrase);
      const res = await upsertPrivateCat(undefined, ciphertext);
      if (res.success && res.data) {
        setNewCatName('');
        setNewCatPhoto('');
        setNewCatColor('');
        setIsAddingCat(false);
        setSelectedCatId(res.data.id);
        await loadDashboardData();
      } else {
        alert('Failed to create cat: ' + res.error);
      }
    } catch {
      alert('Encryption or sync error.');
    } finally {
      setCatActionLoading(false);
    }
  };

  // Delete private cat profile
  const handleDeleteCat = async (catId: string) => {
    if (!confirm('Are you sure you want to permanently delete this cat profile and all its private logs? This cannot be undone.')) {
      return;
    }
    setCatActionLoading(true);
    try {
      const res = await deletePrivateCat(catId);
      if (res.success) {
        setSelectedCatId(null);
        await loadDashboardData();
      } else {
        alert('Failed to delete: ' + res.error);
      }
    } catch {
      alert('Delete failed.');
    } finally {
      setCatActionLoading(false);
    }
  };

  // Save changes to active cat profile
  const saveCatChanges = async (updatedData: PrivateCatData) => {
    if (!selectedCatId) return;
    try {
      const ciphertext = await encryptData(updatedData, passphrase);
      await upsertPrivateCat(selectedCatId, ciphertext);
      await loadDashboardData();
    } catch {
      alert('Encryption or sync error during update.');
    }
  };

  // Add vitals log
  const handleAddVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCat) return;

    const newLog = {
      date: new Date().toISOString(),
      bpm: parseInt(inputBpm) || 140,
      rr: parseInt(inputRr) || 24,
      weight: parseFloat(inputWeight) || 4.5,
      sleep: parseFloat(inputSleep) || 14,
      calories: parseInt(inputCalories) || 220,
      stress: parseInt(inputStress) || 1,
    };

    const updatedVitals = [...activeCat.data.vitals, newLog];
    const updatedCat: PrivateCatData = {
      ...activeCat.data,
      vitals: updatedVitals,
    };

    await saveCatChanges(updatedCat);
  };

  // Add Calendar reminder
  const handleAddCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCat || !calTitle.trim()) return;

    const newEvent = {
      id: crypto.randomUUID(),
      date: calDate,
      title: calTitle.trim(),
      type: calType,
      completed: false,
    };

    const updatedCalendar = [...activeCat.data.calendar, newEvent].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const updatedCat: PrivateCatData = {
      ...activeCat.data,
      calendar: updatedCalendar,
    };

    setCalTitle('');
    await saveCatChanges(updatedCat);
  };

  // Toggle calendar status
  const toggleCalItem = async (itemId: string) => {
    if (!activeCat) return;
    const updatedCalendar = activeCat.data.calendar.map((item) => {
      if (item.id === itemId) return { ...item, completed: !item.completed };
      return item;
    });
    const updatedCat: PrivateCatData = {
      ...activeCat.data,
      calendar: updatedCalendar,
    };
    await saveCatChanges(updatedCat);
  };

  // Delete calendar item
  const deleteCalItem = async (itemId: string) => {
    if (!activeCat) return;
    const updatedCalendar = activeCat.data.calendar.filter((item) => item.id !== itemId);
    const updatedCat: PrivateCatData = {
      ...activeCat.data,
      calendar: updatedCalendar,
    };
    await saveCatChanges(updatedCat);
  };

  // Add Activity log
  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCat || !actNotes.trim()) return;

    const newActivity = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      category: actCategory,
      notes: actNotes.trim(),
    };

    const updatedActivities = [newActivity, ...activeCat.data.activities];
    const updatedCat: PrivateCatData = {
      ...activeCat.data,
      activities: updatedActivities,
    };

    setActNotes('');
    await saveCatChanges(updatedCat);
  };

  // Delete activity item
  const deleteActivityItem = async (itemId: string) => {
    if (!activeCat) return;
    const updatedActivities = activeCat.data.activities.filter((item) => item.id !== itemId);
    const updatedCat: PrivateCatData = {
      ...activeCat.data,
      activities: updatedActivities,
    };
    await saveCatChanges(updatedCat);
  };

  // Add Medical Record
  const handleAddMedical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCat || !medTreatment.trim()) return;

    const newMed = {
      id: crypto.randomUUID(),
      date: medDate,
      treatment: medTreatment.trim(),
      dose: medDose.trim() || '1 dose',
      vetName: medVet.trim() || 'None',
      nextBoosterDate: medBooster || undefined,
    };

    const currentMedical = activeCat.data.medical || [];
    const updatedMedical = [newMed, ...currentMedical];
    const updatedCat: PrivateCatData = {
      ...activeCat.data,
      medical: updatedMedical,
    };

    setMedTreatment('');
    setMedDose('1 dose');
    setMedVet('');
    setMedBooster('');
    await saveCatChanges(updatedCat);
  };

  // Delete Medical Record
  const deleteMedicalItem = async (itemId: string) => {
    if (!activeCat) return;
    const currentMedical = activeCat.data.medical || [];
    const updatedMedical = currentMedical.filter((m) => m.id !== itemId);
    const updatedCat: PrivateCatData = {
      ...activeCat.data,
      medical: updatedMedical,
    };
    await saveCatChanges(updatedCat);
  };

  // Add Custom Registry Field
  const handleAddCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCat || !customKey.trim() || !customVal.trim()) return;

    const newField = {
      id: crypto.randomUUID(),
      key: customKey.trim(),
      value: customVal.trim(),
    };

    const currentFields = activeCat.data.customFields || [];
    const updatedFields = [...currentFields, newField];
    const updatedCat: PrivateCatData = {
      ...activeCat.data,
      customFields: updatedFields,
    };

    setCustomKey('');
    setCustomVal('');
    await saveCatChanges(updatedCat);
  };

  // Delete Custom Registry Field
  const deleteCustomField = async (itemId: string) => {
    if (!activeCat) return;
    const currentFields = activeCat.data.customFields || [];
    const updatedFields = currentFields.filter((f) => f.id !== itemId);
    const updatedCat: PrivateCatData = {
      ...activeCat.data,
      customFields: updatedFields,
    };
    await saveCatChanges(updatedCat);
  };

  // 3D Card Hover Event Handlers for Antigravity motion feel
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;
    const tiltX = -(y / (box.height / 2)) * 6; // max 6 degrees
    const tiltY = (x / (box.width / 2)) * 6;
    card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`;
    card.style.boxShadow = `0 15px 35px rgba(0,0,0,0.12), 0 0 20px rgba(242, 140, 56, 0.08)`;
    card.style.transition = 'transform 0.05s ease-out, box-shadow 0.15s ease-out';
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    card.style.boxShadow = '';
    card.style.transition = 'transform 0.3s ease-out, box-shadow 0.3s ease-out';
  };

  // Build Unified Chronological Ledger list
  const timelineEvents: Array<{
    date: string;
    type: string;
    title: string;
    description: string;
    icon: string;
  }> = [];

  if (activeCat) {
    // Add Vitals
    activeCat.data.vitals.forEach((v) => {
      timelineEvents.push({
        date: v.date,
        type: 'vitals',
        title: 'Telemetry Logged',
        description: `Heartbeat: ${v.bpm} bpm, Respiration: ${v.rr} /min, Weight: ${v.weight} kg, Sleep: ${v.sleep} hrs, Stress: ${v.stress}/5`,
        icon: 'favorite',
      });
    });

    // Add reminders
    activeCat.data.calendar.forEach((c) => {
      timelineEvents.push({
        date: c.date + 'T12:00:00.000Z',
        type: 'reminder',
        title: c.completed ? 'Reminder Met' : 'Upcoming Alert',
        description: `${c.title} (${c.type === 'pill' ? 'Medication' : 'Vet Appointment'})`,
        icon: c.completed ? 'check_circle' : 'pending',
      });
    });

    // Add activities journal
    activeCat.data.activities.forEach((a) => {
      timelineEvents.push({
        date: a.date,
        type: 'activity',
        title: `${a.category} Entry`,
        description: a.notes,
        icon: 'menu_book',
      });
    });

    // Add medical logs
    if (activeCat.data.medical) {
      activeCat.data.medical.forEach((m) => {
        timelineEvents.push({
          date: m.date + 'T12:00:00.000Z',
          type: 'medical',
          title: 'Clinical Treatment',
          description: `${m.treatment} (Dose: ${m.dose}) administered. Vet: ${m.vetName}${
            m.nextBoosterDate ? `. Next booster due on: ${m.nextBoosterDate}` : ''
          }`,
          icon: 'vaccines',
        });
      });
    }

    // Sort timeline newest first
    timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Detect critical vitals threshold alerts for telemetry
  const getVitalsStatus = () => {
    if (!activeCat || activeCat.data.vitals.length === 0) return { alert: false, details: [] };
    const latest = activeCat.data.vitals[activeCat.data.vitals.length - 1];
    const alerts: string[] = [];

    // Feline normal HR: 120 - 220
    if (latest.bpm < 110) alerts.push('Low heart rate alert');
    if (latest.bpm > 230) alerts.push('High heart rate alert');

    // Feline normal RR: 20 - 30
    if (latest.rr < 16) alerts.push('Muted respiration rate alert');
    if (latest.rr > 35) alerts.push('Rapid respiration rate alert');

    return {
      alert: alerts.length > 0,
      details: alerts,
    };
  };

  const vitalsHealthStatus = getVitalsStatus();

  if (isCatsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-[var(--empire-gold)] border-t-transparent animate-spin" />
        <p className="font-body text-xs text-[var(--text-secondary)] opacity-70">Synchronizing private workspace…</p>
      </div>
    );
  }


  const renderDashboardMainContent = () => {
            if (activeTab === 'settings') { return (
          <div
            className="border p-8 rounded-3xl shadow-xl flex flex-col gap-6"
            style={{ background: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)' }}
          >
            <div>
              <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
                Secure AI Configuration
              </h2>
              <p className="font-body text-xs text-[var(--text-secondary)] opacity-70 mt-1">
                Configure your own API keys for AI assistants. Keys are encrypted using your vault password in the browser before sync.
              </p>
            </div>

            <form onSubmit={handleSaveConfig} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label htmlFor="cc-gemini-key" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase pl-1">
                  Google Gemini API Key
                </label>
                <input
                  id="cc-gemini-key"
                  type="password"
                  value={config.geminiKey || ''}
                  onChange={(e) => setConfig({ ...config, geminiKey: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full font-body text-xs px-4 py-3 rounded-2xl border outline-none focus:border-[var(--empire-gold)] transition-all"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="cc-openai-key" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase pl-1">
                  OpenAI API Key
                </label>
                <input
                  id="cc-openai-key"
                  type="password"
                  value={config.openaiKey || ''}
                  onChange={(e) => setConfig({ ...config, openaiKey: e.target.value })}
                  placeholder="sk-proj-..."
                  className="w-full font-body text-xs px-4 py-3 rounded-2xl border outline-none focus:border-[var(--empire-gold)] transition-all"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="cc-anthropic-key" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase pl-1">
                  Anthropic Claude API Key
                </label>
                <input
                  id="cc-anthropic-key"
                  type="password"
                  value={config.anthropicKey || ''}
                  onChange={(e) => setConfig({ ...config, anthropicKey: e.target.value })}
                  placeholder="sk-ant-..."
                  className="w-full font-body text-xs px-4 py-3 rounded-2xl border outline-none focus:border-[var(--empire-gold)] transition-all"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="cc-pref-provider" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase pl-1">
                    Preferred AI Provider
                  </label>
                  <select
                    id="cc-pref-provider"
                    value={config.preferredProvider}
                    onChange={(e) => {
                      const prov = e.target.value as 'gemini' | 'openai' | 'anthropic';
                      setConfig({
                        ...config,
                        preferredProvider: prov,
                        preferredModel: PROVIDER_MODELS[prov][0],
                      });
                    }}
                    className="w-full font-body text-xs px-3 py-3 rounded-2xl border outline-none focus:border-[var(--empire-gold)] transition-all"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic Claude</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="cc-pref-model" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase pl-1">
                    Active AI Model
                  </label>
                  <select
                    id="cc-pref-model"
                    value={config.preferredModel}
                    onChange={(e) => setConfig({ ...config, preferredModel: e.target.value })}
                    className="w-full font-body text-xs px-3 py-3 rounded-2xl border outline-none focus:border-[var(--empire-gold)] transition-all"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                  >
                    {PROVIDER_MODELS[config.preferredProvider].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {configMessage && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl font-body text-xs">
                  {configMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isConfigSaving}
                className="text-white py-3 rounded-2xl font-display text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 border-none"
                style={{ background: 'linear-gradient(135deg, var(--empire-gold), #f97316)' }}
              >
                {isConfigSaving ? 'Encrypting & Saving…' : 'Encrypt & Save Keys'}
              </button>
            </form>
          </div>
    ); } if (activeCat) { return (
          <div className="flex flex-col gap-6">
            {/* Tab Navigation header */}
            <div className="flex border-b pb-2 gap-2 overflow-x-auto" style={{ borderColor: 'var(--dropdown-border)' }}>
              {([
                { id: 'overview', name: 'Overview' },
                { id: 'vitals', name: 'Vitals & Telemetry' },
                { id: 'calendar', name: 'Schedule Alerts' },
                { id: 'activities', name: 'Journal Logs' },
                { id: 'medical', name: 'Clinical Treatments' },
                { id: 'registry', name: 'Custom Fields' },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`font-display text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all cursor-pointer border ${
                    activeTab === tab.id
                      ? 'text-[var(--empire-gold)]'
                      : 'text-[var(--text-secondary)] border-transparent hover:bg-black/5'
                  }`}
                  style={{
                    background: activeTab === tab.id ? 'var(--bg-elevated)' : 'transparent',
                    borderColor: activeTab === tab.id ? 'var(--dropdown-border)' : 'transparent',
                  }}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
              <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                {/* Cat Bio Card */}
                <div
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                  className="border p-6 rounded-3xl flex flex-col md:flex-row items-center gap-6 shadow-md preserve-3d"
                  style={{ background: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)' }}
                >
                  <img
                    src={activeCat.data.photoUrl}
                    alt={activeCat.data.name}
                    className="w-24 h-24 rounded-2xl object-cover border"
                    style={{ borderColor: 'var(--dropdown-border)' }}
                  />
                  <div className="flex-grow text-center md:text-left flex flex-col gap-1">
                    <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">
                      {activeCat.data.name}
                    </h2>
                    <p className="font-body text-xs text-[var(--text-secondary)] opacity-70">
                      Status: <span className="capitalize text-[var(--text-primary)] font-semibold">{activeCat.data.status}</span> · 
                      Age: <span className="capitalize text-[var(--text-primary)] font-semibold">{activeCat.data.ageEstimate}</span> · 
                      Color: <span className="text-[var(--text-primary)] font-semibold">{activeCat.data.color}</span>
                    </p>
                    
                    {vitalsHealthStatus.alert && (
                      <div className="mt-2 flex items-center gap-2 text-red-600 dark:text-red-400 font-body text-[10px] font-bold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-xs">warning</span>
                        <span>Telemetry Warning: {vitalsHealthStatus.details.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vitals Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    {
                      label: 'Heartbeat',
                      val: activeCat.data.vitals.length > 0 ? `${activeCat.data.vitals[activeCat.data.vitals.length - 1].bpm} bpm` : 'No data',
                      icon: 'favorite',
                      color: 'text-rose-400',
                    },
                    {
                      label: 'Respiration',
                      val: activeCat.data.vitals.length > 0 ? `${activeCat.data.vitals[activeCat.data.vitals.length - 1].rr} /min` : 'No data',
                      icon: 'air',
                      color: 'text-sky-400',
                    },
                    {
                      label: 'Weight',
                      val: activeCat.data.vitals.length > 0 ? `${activeCat.data.vitals[activeCat.data.vitals.length - 1].weight} kg` : 'No data',
                      icon: 'monitoring',
                      color: 'text-amber-400',
                    },
                    {
                      label: 'Daily Calories',
                      val: activeCat.data.vitals.length > 0 ? `${activeCat.data.vitals[activeCat.data.vitals.length - 1].calories} kcal` : 'No data',
                      icon: 'restaurant',
                      color: 'text-emerald-400',
                    },
                    {
                      label: 'Sleep',
                      val: activeCat.data.vitals.length > 0 ? `${activeCat.data.vitals[activeCat.data.vitals.length - 1].sleep} hrs` : 'No data',
                      icon: 'bedtime',
                      color: 'text-violet-400',
                    },
                  ].map((stat, idx) => (
                    <div
                      key={stat.label}
                      onMouseMove={handleCardMouseMove}
                      onMouseLeave={handleCardMouseLeave}
                      className="border p-4 rounded-2xl flex flex-col gap-2 items-center text-center shadow-sm preserve-3d domino-fade-item"
                      style={{
                        animationDelay: `${idx * 50}ms`,
                        background: 'var(--dropdown-bg)',
                        borderColor: 'var(--dropdown-border)'
                      }}
                    >
                      <span className={`material-symbols-outlined text-xl ${stat.color}`}>{stat.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--text-secondary)] opacity-55 uppercase font-bold">{stat.label}</span>
                        <span className="font-display text-sm font-bold text-[var(--text-primary)] mt-0.5">{stat.val}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Unified Chronological Care Ledger Timeline */}
                <div
                  className="border p-6 rounded-3xl flex flex-col gap-4 shadow-md"
                  style={{ background: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)' }}
                >
                  <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Chronological Care Ledger
                  </h3>
                  <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {timelineEvents.length === 0 ? (
                      <p className="font-body text-xs text-[var(--text-secondary)] opacity-50 py-8 text-center">
                        No telemetry or log history recorded for this cat.
                      </p>
                    ) : (
                      timelineEvents.map((evt) => (
                        <div
                          key={`${evt.date}-${evt.title}`}
                          className="border p-3.5 rounded-2xl flex gap-4 items-start transition-all hover:bg-black/5"
                          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--dropdown-border)' }}
                        >
                          <div className="p-2 rounded-xl bg-[var(--empire-gold)]/10 text-[var(--empire-gold)] flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg">{evt.icon}</span>
                          </div>
                          <div className="flex-grow flex flex-col gap-0.5">
                            <div className="flex justify-between items-center">
                              <span className="font-display text-xs font-bold text-[var(--text-primary)]">{evt.title}</span>
                              <span className="font-body text-[9px] text-[var(--text-secondary)] opacity-60">
                                {new Date(evt.date).toLocaleString()}
                              </span>
                            </div>
                            <p className="font-body text-xs text-[var(--text-secondary)] opacity-85 leading-relaxed">
                              {evt.description}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Vitals Logger & History */}
            {activeTab === 'vitals' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
                {/* Form (5 cols) */}
                <form
                  onSubmit={handleAddVitals}
                  className="md:col-span-5 border p-6 rounded-3xl flex flex-col gap-4 shadow-md"
                  style={{ background: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)' }}
                >
                  <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Log Vitals
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="vitals-bpm" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Heartbeat (BPM)</label>
                      <input
                        id="vitals-bpm"
                        type="number"
                        value={inputBpm}
                        onChange={(e) => setInputBpm(e.target.value)}
                        className="font-body text-xs p-2.5 rounded-xl border outline-none"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="vitals-rr" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Respiration (RR/min)</label>
                      <input
                        id="vitals-rr"
                        type="number"
                        value={inputRr}
                        onChange={(e) => setInputRr(e.target.value)}
                        className="font-body text-xs p-2.5 rounded-xl border outline-none"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="vitals-weight" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Weight (kg)</label>
                      <input
                        id="vitals-weight"
                        type="number"
                        step="0.1"
                        value={inputWeight}
                        onChange={(e) => setInputWeight(e.target.value)}
                        className="font-body text-xs p-2.5 rounded-xl border outline-none"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="vitals-sleep" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Sleep (hrs)</label>
                      <input
                        id="vitals-sleep"
                        type="number"
                        step="0.5"
                        value={inputSleep}
                        onChange={(e) => setInputSleep(e.target.value)}
                        className="font-body text-xs p-2.5 rounded-xl border outline-none"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="vitals-calories" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Calories (kcal)</label>
                      <input
                        id="vitals-calories"
                        type="number"
                        value={inputCalories}
                        onChange={(e) => setInputCalories(e.target.value)}
                        className="font-body text-xs p-2.5 rounded-xl border outline-none"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="vitals-stress" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Stress Level ({inputStress}/5)</label>
                    <input
                      id="vitals-stress"
                      type="range"
                      min="1"
                      max="5"
                      value={inputStress}
                      onChange={(e) => setInputStress(e.target.value)}
                      className="accent-[var(--empire-gold)]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="text-white py-2.5 rounded-xl font-display text-xs font-bold uppercase transition-all shadow-md cursor-pointer mt-2 border-none"
                    style={{ background: 'linear-gradient(135deg, var(--empire-gold), #f97316)' }}
                  >
                    Save Vitals Entry
                  </button>
                </form>

                {/* Charts / History (7 cols) */}
                <div
                  className="md:col-span-7 border p-6 rounded-3xl flex flex-col gap-6 shadow-md"
                  style={{ background: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)' }}
                >
                  <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Vitals Charts & History
                  </h3>

                  {activeCat.data.vitals.length === 0 ? (
                    <p className="font-body text-xs text-[var(--text-secondary)] opacity-50 py-12 text-center">
                      No vitals recorded yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {/* Responsive Custom SVG Line Chart */}
                      <div className="flex flex-col gap-1">
                        <span className="font-display text-[10px] text-[var(--text-secondary)] opacity-60 uppercase tracking-wider font-bold">
                          Weight History Trend (kg)
                        </span>
                        <div
                          className="border p-4 rounded-2xl w-full h-36 relative"
                          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--dropdown-border)' }}
                        >
                          <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                            {/* Horizontal grid lines */}
                            <line x1="0" y1="10" x2="100" y2="10" stroke="var(--dropdown-border)" strokeWidth="0.5" />
                            <line x1="0" y1="20" x2="100" y2="20" stroke="var(--dropdown-border)" strokeWidth="0.5" />
                            <line x1="0" y1="30" x2="100" y2="30" stroke="var(--dropdown-border)" strokeWidth="0.5" />
                            
                            {/* Points map */}
                            {(() => {
                              const points = activeCat.data.vitals.slice(-7);
                              const weights = points.map((v) => v.weight);
                              const minW = Math.min(...weights) - 0.5;
                              const maxW = Math.max(...weights) + 0.5;
                              const range = maxW - minW || 1;

                              const pathCoords = points.map((p, idx) => {
                                const x = (idx / Math.max(1, points.length - 1)) * 100;
                                const y = 35 - ((p.weight - minW) / range) * 30; // map value to y-axis (invert coordinates)
                                return `${x},${y}`;
                              });

                              return (
                                <>
                                  {/* Area fill */}
                                  {pathCoords.length > 1 && (
                                    <path
                                      d={`M0,40 L${pathCoords.map((coord) => coord).join(' L')} L100,40 Z`}
                                      fill="url(#goldGrad)"
                                      opacity="0.15"
                                    />
                                  )}
                                  {/* Line */}
                                  <path
                                    d={`M${pathCoords.join(' L')}`}
                                    fill="none"
                                    stroke="var(--empire-gold)"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                  />
                                  {/* Gradients def */}
                                  <defs>
                                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="var(--empire-gold)" />
                                      <stop offset="100%" stopColor="transparent" />
                                    </linearGradient>
                                  </defs>
                                  {/* Points */}
                                  {points.map((p, idx) => {
                                    const [x, y] = pathCoords[idx].split(',');
                                    return (
                                      <circle
                                        key={p.date}
                                        cx={x}
                                        cy={y}
                                        r="1.2"
                                        fill="white"
                                        stroke="var(--empire-gold)"
                                        strokeWidth="0.5"
                                      />
                                    );
                                  })}
                                </>
                              );
                            })()}
                          </svg>
                        </div>
                      </div>

                      {/* Vitals Feed */}
                      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                        <span className="font-display text-[10px] text-[var(--text-secondary)] opacity-60 uppercase tracking-wider font-bold">
                          Logs Feed
                        </span>
                        {[...activeCat.data.vitals].reverse().map((log) => (
                          <div
                            key={log.date}
                            className="border p-3 rounded-2xl flex flex-wrap justify-between items-center text-xs"
                            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--dropdown-border)' }}
                          >
                            <span className="font-body text-[var(--text-secondary)] opacity-60 text-[10px]">
                              {new Date(log.date).toLocaleDateString()}
                            </span>
                            <div className="flex gap-4 text-[var(--text-primary)]">
                              <span>HR: <strong className="text-[var(--text-primary)]">{log.bpm}</strong></span>
                              <span>RR: <strong className="text-[var(--text-primary)]">{log.rr}</strong></span>
                              <span>W: <strong className="text-[var(--text-primary)]">{log.weight}kg</strong></span>
                              <span>Stress: <strong className="text-[var(--text-primary)]">{log.stress}/5</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Calendar */}
            {activeTab === 'calendar' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
                {/* Form (5 cols) */}
                <form
                  onSubmit={handleAddCalendar}
                  className="md:col-span-5 border p-6 rounded-3xl flex flex-col gap-4 shadow-md"
                  style={{ background: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)' }}
                >
                  <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Add Reminder
                  </h3>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="cal-title" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Title</label>
                    <input
                      id="cal-title"
                      type="text"
                      value={calTitle}
                      onChange={(e) => setCalTitle(e.target.value)}
                      placeholder="e.g. Kitten vitamins, Vet checkup…"
                      required
                      className="font-body text-xs p-2.5 rounded-xl border outline-none"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="cal-type" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Type</label>
                      <select
                        id="cal-type"
                        value={calType}
                        onChange={(e) => setCalType(e.target.value as 'pill' | 'appointment')}
                        className="font-body text-xs p-2.5 rounded-xl border outline-none"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                      >
                        <option value="pill">Pill / Medication</option>
                        <option value="appointment">Appointment / Vet Visit</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="cal-date" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Date</label>
                      <input
                        id="cal-date"
                        type="date"
                        value={calDate}
                        onChange={(e) => setCalDate(e.target.value)}
                        className="font-body text-xs p-2 rounded-xl border outline-none"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="text-white py-2.5 rounded-xl font-display text-xs font-bold uppercase transition-all shadow-md cursor-pointer mt-2 border-none"
                    style={{ background: 'linear-gradient(135deg, var(--empire-gold), #f97316)' }}
                  >
                    Add Reminder
                  </button>
                </form>

                {/* List (7 cols) */}
                <div
                  className="md:col-span-7 border p-6 rounded-3xl flex flex-col gap-4 max-h-[500px] overflow-y-auto shadow-md"
                  style={{ background: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)' }}
                >
                  <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Reminders Ledger
                  </h3>

                  {activeCat.data.calendar.length === 0 ? (
                    <p className="font-body text-xs text-[var(--text-secondary)] opacity-50 py-12 text-center">
                      No reminders set.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {activeCat.data.calendar.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                            item.completed ? 'opacity-50 border-transparent' : ''
                          }`}
                          style={{
                            background: 'var(--bg-elevated)',
                            borderColor: item.completed ? 'transparent' : 'var(--dropdown-border)',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              onClick={() => toggleCalItem(item.id)}
                              className={`material-symbols-outlined text-lg cursor-pointer select-none transition-all ${
                                item.completed ? 'text-emerald-500 font-bold' : 'text-[var(--text-secondary)] opacity-40'
                              }`}
                            >
                              {item.completed ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                            <div className="flex flex-col">
                              <span className={`font-display text-xs font-bold ${
                                item.completed ? 'line-through text-[var(--text-secondary)] opacity-60' : 'text-[var(--text-primary)]'
                              }`}>
                                {item.title}
                              </span>
                              <span className="font-body text-[10px] text-[var(--text-secondary)] opacity-60">
                                {item.type === 'pill' ? 'Medication' : 'Appointment'} · {item.date}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteCalItem(item.id)}
                            className="text-[var(--text-secondary)] opacity-40 hover:opacity-100 hover:text-red-600 p-1 transition-all cursor-pointer bg-transparent border-none"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Medical Tracker */}
            {activeTab === 'medical' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
                {/* Form (5 cols) */}
                <form
                  onSubmit={handleAddMedical}
                  className="md:col-span-5 border p-6 rounded-3xl flex flex-col gap-4 shadow-md"
                  style={{ background: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)' }}
                >
                  <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Log Clinical Treatment
                  </h3>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="med-treatment" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Treatment / Vaccine</label>
                    <input
                      id="med-treatment"
                      type="text"
                      value={medTreatment}
                      onChange={(e) => setMedTreatment(e.target.value)}
                      placeholder="e.g. Rabies Vaccine, Dewormer..."
                      required
                      className="font-body text-xs p-2.5 rounded-xl border outline-none"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="med-dose" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Dose</label>
                      <input
                        id="med-dose"
                        type="text"
                        value={medDose}
                        onChange={(e) => setMedDose(e.target.value)}
                        placeholder="e.g. 1 ml, 1 pill..."
                        className="font-body text-xs p-2.5 rounded-xl border outline-none"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="med-date" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Date Administered</label>
                      <input
                        id="med-date"
                        type="date"
                        value={medDate}
                        onChange={(e) => setMedDate(e.target.value)}
                        className="font-body text-xs p-2 rounded-xl border outline-none"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="med-vet" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Veterinarian Name / Clinic</label>
                    <input
                      id="med-vet"
                      type="text"
                      value={medVet}
                      onChange={(e) => setMedVet(e.target.value)}
                      placeholder="e.g. Dr. Walker, Care Clinic..."
                      className="font-body text-xs p-2.5 rounded-xl border outline-none"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="med-booster" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Next Booster Date (Optional)</label>
                    <input
                      id="med-booster"
                      type="date"
                      value={medBooster}
                      onChange={(e) => setMedBooster(e.target.value)}
                      className="font-body text-xs p-2 rounded-xl border outline-none"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="text-white py-2.5 rounded-xl font-display text-xs font-bold uppercase transition-all shadow-md cursor-pointer mt-2 border-none"
                    style={{ background: 'linear-gradient(135deg, var(--empire-gold), #f97316)' }}
                  >
                    Log Treatment
                  </button>
                </form>

                {/* List (7 cols) */}
                <div
                  className="md:col-span-7 border p-6 rounded-3xl flex flex-col gap-4 max-h-[500px] overflow-y-auto shadow-md"
                  style={{ background: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)' }}
                >
                  <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Medical & Vaccine History
                  </h3>

                  {!activeCat.data.medical || activeCat.data.medical.length === 0 ? (
                    <p className="font-body text-xs text-[var(--text-secondary)] opacity-50 py-12 text-center">
                      No treatments or vaccines logged yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {activeCat.data.medical.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl border flex items-start justify-between gap-4"
                          style={{
                            background: 'var(--bg-elevated)',
                            borderColor: 'var(--dropdown-border)',
                          }}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-display text-xs font-bold text-[var(--empire-gold)]">
                                {item.treatment}
                              </span>
                              <span className="font-body text-[9px] text-[var(--text-secondary)] opacity-60">
                                {item.date}
                              </span>
                            </div>
                            <p className="font-body text-xs text-[var(--text-secondary)] opacity-85">
                              Dose: {item.dose} · Vet: {item.vetName}
                            </p>
                            {item.nextBoosterDate && (
                              <span className="text-[9px] text-teal-600 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[10px]">event_repeat</span>
                                Booster Due: {item.nextBoosterDate}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => deleteMedicalItem(item.id)}
                            className="text-[var(--text-secondary)] opacity-40 hover:opacity-100 hover:text-red-600 p-1 flex-shrink-0 cursor-pointer transition-all bg-transparent border-none"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Custom Fields Registry */}
            {activeTab === 'registry' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
                {/* Form (5 cols) */}
                <form
                  onSubmit={handleAddCustomField}
                  className="md:col-span-5 border p-6 rounded-3xl flex flex-col gap-4 shadow-md"
                  style={{ background: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)' }}
                >
                  <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Add Custom Attribute
                  </h3>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="custom-key" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Field Key</label>
                    <input
                      id="custom-key"
                      type="text"
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      placeholder="e.g. Microchip ID, Allergies, Fav Toy..."
                      required
                      className="font-body text-xs p-2.5 rounded-xl border outline-none"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="custom-val" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Field Value</label>
                    <input
                      id="custom-val"
                      type="text"
                      value={customVal}
                      onChange={(e) => setCustomVal(e.target.value)}
                      placeholder="e.g. 98102240982, Chicken allergy..."
                      required
                      className="font-body text-xs p-2.5 rounded-xl border outline-none"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="text-white py-2.5 rounded-xl font-display text-xs font-bold uppercase transition-all shadow-md cursor-pointer mt-2 border-none"
                    style={{ background: 'linear-gradient(135deg, var(--empire-gold), #f97316)' }}
                  >
                    Add Attribute
                  </button>
                </form>

                {/* List (7 cols) */}
                <div
                  className="md:col-span-7 border p-6 rounded-3xl flex flex-col gap-4 max-h-[500px] overflow-y-auto shadow-md"
                  style={{ background: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)' }}
                >
                  <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Metadata Registry
                  </h3>

                  {!activeCat.data.customFields || activeCat.data.customFields.length === 0 ? (
                    <p className="font-body text-xs text-[var(--text-secondary)] opacity-50 py-12 text-center">
                      No custom fields logged yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {activeCat.data.customFields.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl border flex items-center justify-between gap-4"
                          style={{
                            background: 'var(--bg-elevated)',
                            borderColor: 'var(--dropdown-border)',
                          }}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] opacity-60">
                              {item.key}
                            </span>
                            <span className="font-display text-xs font-bold text-[var(--text-primary)]">
                              {item.value}
                            </span>
                          </div>
                          <button
                            onClick={() => deleteCustomField(item.id)}
                            className="text-[var(--text-secondary)] opacity-40 hover:opacity-100 hover:text-red-600 p-1 cursor-pointer transition-all bg-transparent border-none"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Activities Journal */}
            {activeTab === 'activities' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
                {/* Form (5 cols) */}
                <form
                  onSubmit={handleAddActivity}
                  className="md:col-span-5 border p-6 rounded-3xl flex flex-col gap-4 shadow-md"
                  style={{ background: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)' }}
                >
                  <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Add Activity
                  </h3>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="act-category" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Category</label>
                    <select
                      id="act-category"
                      value={actCategory}
                      onChange={(e) => setActCategory(e.target.value)}
                      className="font-body text-xs p-2.5 rounded-xl border outline-none"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                    >
                      <option value="Food">Food / Feeding</option>
                      <option value="Behavior">Behavior / Play</option>
                      <option value="Outdoor">Outdoor / Sightings</option>
                      <option value="Health">General Health Notes</option>
                      <option value="Litter">Litter Box check</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="act-notes" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Notes</label>
                    <textarea
                      id="act-notes"
                      value={actNotes}
                      onChange={(e) => setActNotes(e.target.value)}
                      placeholder="Add descriptions or notes here…"
                      rows={3}
                      required
                      className="font-body text-xs p-3 rounded-xl border outline-none resize-none"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="text-white py-2.5 rounded-xl font-display text-xs font-bold uppercase transition-all shadow-md cursor-pointer mt-2 border-none"
                    style={{ background: 'linear-gradient(135deg, var(--empire-gold), #f97316)' }}
                  >
                    Save Journal Entry
                  </button>
                </form>

                {/* List (7 cols) */}
                <div
                  className="md:col-span-7 border p-6 rounded-3xl flex flex-col gap-4 max-h-[500px] overflow-y-auto shadow-md"
                  style={{ background: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)' }}
                >
                  <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Activity Journal
                  </h3>

                  {activeCat.data.activities.length === 0 ? (
                    <p className="font-body text-xs text-[var(--text-secondary)] opacity-50 py-12 text-center">
                      No activities logged yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {activeCat.data.activities.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl border flex items-start justify-between gap-4"
                          style={{
                            background: 'var(--bg-elevated)',
                            borderColor: 'var(--dropdown-border)',
                          }}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-display text-xs font-bold text-[var(--empire-gold)]">
                                {item.category}
                              </span>
                              <span className="font-body text-[9px] text-[var(--text-secondary)] opacity-60">
                                {new Date(item.date).toLocaleString()}
                              </span>
                            </div>
                            <p className="font-body text-xs text-[var(--text-secondary)] opacity-85 whitespace-pre-wrap">
                              {item.notes}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteActivityItem(item.id)}
                            className="text-[var(--text-secondary)] opacity-40 hover:opacity-100 hover:text-red-600 p-1 flex-shrink-0 cursor-pointer transition-all bg-transparent border-none"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
    ); } return (
          <div
            className="border p-12 rounded-3xl text-center flex flex-col items-center justify-center gap-4 min-h-[400px]"
            style={{ background: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)' }}
          >
            <span className="material-symbols-outlined text-4xl text-[var(--text-primary)] opacity-30">pets</span>
            <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
              No Cat Selected
            </h3>
            <p className="font-body text-xs text-[var(--text-secondary)] opacity-50 max-w-xs">
              Select one of your private cats from the list on the left to start tracking, or register a new one.
            </p>
          </div>
  );
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8">
      {/* Sidebar - Cats List & Navigation */}
      <div className="w-full lg:w-80 flex flex-col gap-6 flex-shrink-0 animate-in fade-in duration-300">
        <div
          className="border p-6 rounded-3xl flex flex-col gap-4 shadow-xl"
          style={{ background: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)' }}
        >
          <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--dropdown-border)' }}>
            <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
              My Cats
            </h3>
            <button
              onClick={() => setIsAddingCat(true)}
              className="w-8 h-8 rounded-lg bg-[var(--empire-gold)]/10 text-[var(--empire-gold)] hover:bg-[var(--empire-gold)] hover:text-white flex items-center justify-center transition-all cursor-pointer border-none"
            >
              <span className="material-symbols-outlined text-lg">add</span>
            </button>
          </div>

          {isAddingCat ? (
            <form onSubmit={handleAddCat} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="cc-cat-name" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Name</label>
                <input
                  id="cc-cat-name"
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Cat's name…"
                  required
                  className="w-full font-body text-xs px-3 py-2 rounded-xl border outline-none"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="cc-cat-photo" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Photo</label>
                <input
                  id="cc-cat-photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="w-full text-[var(--text-secondary)] font-body text-xs file:mr-2 file:cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="cc-cat-status" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Status</label>
                  <select
                    id="cc-cat-status"
                    value={newCatStatus}
                    onChange={(e) => setNewCatStatus(e.target.value)}
                    className="w-full font-body text-xs px-2 py-2 rounded-xl border outline-none"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                  >
                    <option value="adopted">Adopted</option>
                    <option value="fostered">Fostered</option>
                    <option value="stray">Stray</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="cc-cat-age" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Age</label>
                  <select
                    id="cc-cat-age"
                    value={newCatAge}
                    onChange={(e) => setNewCatAge(e.target.value)}
                    className="w-full font-body text-xs px-2 py-2 rounded-xl border outline-none"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                  >
                    <option value="kitten">Kitten</option>
                    <option value="juvenile">Juvenile</option>
                    <option value="adult">Adult</option>
                    <option value="senior">Senior</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="cc-cat-color" className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase">Color/Pattern</label>
                <input
                  id="cc-cat-color"
                  type="text"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  placeholder="e.g. Tabby, Tuxedo…"
                  className="w-full font-body text-xs px-3 py-2 rounded-xl border outline-none"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--dropdown-border)' }}
                />
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCat(false)}
                  className="bg-transparent border border-[var(--dropdown-border)] text-[var(--text-primary)] hover:bg-black/5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={catActionLoading}
                  className="text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none"
                  style={{ background: 'linear-gradient(135deg, var(--empire-gold), #f97316)' }}
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
              {cats.length === 0 ? (
                <p className="font-body text-xs text-[var(--text-secondary)] opacity-50 text-center py-6">
                  No private cats registered yet.
                </p>
              ) : (
                cats.map((c, idx) => {
                  const active = c.id === selectedCatId;
                  return (
                    <div
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedCatId(c.id);
                        if (activeTab === 'settings') {
                          setActiveTab('overview');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedCatId(c.id);
                          if (activeTab === 'settings') setActiveTab('overview');
                        }
                      }}
                      onMouseMove={handleCardMouseMove}
                      onMouseLeave={handleCardMouseLeave}
                      className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border preserve-3d domino-fade-item`}
                      style={{
                        animationDelay: `${idx * 60}ms`,
                        background: active ? 'var(--bg-elevated)' : 'var(--dropdown-bg)',
                        borderColor: active ? 'var(--empire-gold)' : 'var(--dropdown-border)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={c.data.photoUrl}
                          alt={c.data.name}
                          className="w-10 h-10 rounded-full object-cover border"
                          style={{ borderColor: 'var(--dropdown-border)' }}
                        />
                        <div className="flex flex-col">
                          <span className="font-display text-xs font-bold text-[var(--text-primary)]">{c.data.name}</span>
                          <span className="font-body text-[10px] text-[var(--text-secondary)] opacity-70 capitalize">
                            {c.data.status} · {c.data.ageEstimate}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCat(c.id);
                        }}
                        className="text-[var(--text-secondary)] opacity-40 hover:opacity-100 hover:text-red-600 p-1 transition-all cursor-pointer bg-transparent border-none"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* AI & Vault Configuration Navigation Link */}
        <button
          onClick={() => {
            setSelectedCatId(null);
            setActiveTab('settings');
          }}
          className={`w-full p-4 rounded-3xl border text-left font-display text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-3 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-[var(--empire-gold)]/15 border-[var(--empire-gold)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-black/5'
          }`}
          style={{
            background: activeTab === 'settings' ? 'var(--bg-elevated)' : 'var(--dropdown-bg)',
            borderColor: activeTab === 'settings' ? 'var(--empire-gold)' : 'var(--dropdown-border)',
          }}
        >
          <span className="material-symbols-outlined text-lg">settings</span>
          <span>Vault & AI Settings</span>
        </button>
      </div>

      {/* Main Console Content */}
      <div className="flex-grow">
        {renderDashboardMainContent()}
      </div>
    </div>
  );
}
