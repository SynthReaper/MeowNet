'use client';
// components/personal-care/HelperPage.tsx
// Full-screen private chat console with private cat context panel

import { useState, useEffect, useRef } from 'react';
import VaultUnlock from './VaultUnlock';
import { getPrivateConfig, listPrivateCats, upsertPrivateCat } from '@/lib/actions/personalCare';
import { decryptData, encryptData } from '@/lib/security/encryption';
import Link from 'next/link';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface CatContextItem {
  id: string;
  name: string;
  photoUrl: string;
  status: string;
  age: string;
  color: string;
  vitals: Array<{
    date: string;
    bpm: number;
    rr: number;
    weight: number;
    sleep: number;
    calories: number;
    stress: number;
  }>;
  reminders: Array<{
    id: string;
    completed: boolean;
    title: string;
    date: string;
    type: 'pill' | 'appointment';
  }>;
  activities: Array<{
    id: string;
    date: string;
    category: string;
    notes: string;
  }>;
  medical?: Array<{
    id: string;
    date: string;
    treatment: string;
    dose: string;
    vetName: string;
    nextBoosterDate?: string;
  }>;
  customFields?: Array<{
    id: string;
    key: string;
    value: string;
  }>;
}

interface PrivateConfig {
  preferredProvider: 'gemini' | 'openai' | 'anthropic';
  geminiKey?: string;
  openaiKey?: string;
  anthropicKey?: string;
  preferredModel: string;
}

interface DecryptedCatData {
  name: string;
  photoUrl: string;
  status: string;
  ageEstimate: string;
  color: string;
  vitals?: Array<{
    date: string;
    bpm: number;
    rr: number;
    weight: number;
    sleep: number;
    calories: number;
    stress: number;
  }>;
  calendar?: Array<{
    id: string;
    completed: boolean;
    title: string;
    date: string;
    type: 'pill' | 'appointment';
  }>;
  activities?: Array<{
    id: string;
    date: string;
    category: string;
    notes: string;
  }>;
  medical?: Array<{
    id: string;
    date: string;
    treatment: string;
    dose: string;
    vetName: string;
    nextBoosterDate?: string;
  }>;
  customFields?: Array<{
    id: string;
    key: string;
    value: string;
  }>;
}

export default function HelperPage() {
  const [passphrase, setPassphrase] = useState<string | null>(null);
  
  // Decrypted state
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'anthropic'>('gemini');
  const [model, setModel] = useState('');
  const [cats, setCats] = useState<CatContextItem[]>([]);
  const [isLoadingCats, setIsLoadingCats] = useState(false);

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Once unlocked with passphrase, load keys and cats
  const handleUnlock = async (phrase: string) => {
    setPassphrase(phrase);
    setIsLoadingCats(true);
    try {
      const configRes = await getPrivateConfig();
      if (configRes.success && configRes.data?.encrypted_keys) {
        const configObj = (await decryptData(configRes.data.encrypted_keys, phrase)) as PrivateConfig;
        let activeKey = configObj.anthropicKey;
        if (configObj.preferredProvider === 'gemini') {
          activeKey = configObj.geminiKey;
        } else if (configObj.preferredProvider === 'openai') {
          activeKey = configObj.openaiKey;
        }

        setApiKey(activeKey || '');
        setProvider(configObj.preferredProvider || 'gemini');
        setModel(configObj.preferredModel || 'gemini-1.5-flash');

        if (!activeKey) {
          setMessages([
            {
              role: 'assistant',
              content: `Hello! Your vault is unlocked, but you have not configured an API key for ${configObj.preferredProvider} yet. Please go to the Care Center Settings to configure your keys.`,
            },
          ]);
        } else {
          setMessages([
            {
              role: 'assistant',
              content: 'Vault unlocked. I am ready to assist you. Ask me anything about your cats, health logs, or schedules!',
            },
          ]);
        }
      }

      // Load cats
      const catsRes = await listPrivateCats();
      if (catsRes.success && catsRes.data) {
        const decCats: CatContextItem[] = [];
        for (const rawCat of catsRes.data) {
          try {
            const dec = (await decryptData(rawCat.encrypted_data, phrase)) as DecryptedCatData;
            decCats.push({
              id: rawCat.id,
              name: dec.name,
              photoUrl: dec.photoUrl,
              status: dec.status,
              age: dec.ageEstimate,
              color: dec.color,
              vitals: dec.vitals || [],
              reminders: dec.calendar || [],
              activities: dec.activities || [],
              medical: dec.medical || [],
              customFields: dec.customFields || [],
            });
          } catch {
            // Skip single decryption failures
          }
        }
        setCats(decCats);
      }
    } catch {
      setMessages([
        {
          role: 'assistant',
          content: 'An error occurred while loading your secure configuration. Please check your credentials.',
        },
      ]);
    } finally {
      setIsLoadingCats(false);
    }
  };

  // Execute suggested AI actions directly onto the database
  const handleExecuteAction = async (catId: string, actionType: string, actionPayload: any) => {
    if (!passphrase) return;
    const catToUpdate = cats.find((c) => c.id === catId);
    if (!catToUpdate) return;

    try {
      const currentData = {
        name: catToUpdate.name,
        photoUrl: catToUpdate.photoUrl,
        status: catToUpdate.status,
        ageEstimate: catToUpdate.age,
        color: catToUpdate.color,
        vitals: catToUpdate.vitals,
        calendar: catToUpdate.reminders,
        activities: catToUpdate.activities,
        medical: catToUpdate.medical || [],
        customFields: catToUpdate.customFields || [],
      };

      if (actionType === 'log_activity') {
        const newAct = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          category: actionPayload.category || 'Food',
          notes: actionPayload.notes || 'Logged from AI Suggestion',
        };
        currentData.activities = [newAct, ...currentData.activities];
      } else if (actionType === 'log_vitals') {
        const newVit = {
          date: new Date().toISOString(),
          bpm: actionPayload.bpm || 140,
          rr: actionPayload.rr || 24,
          weight: actionPayload.weight || 4.5,
          sleep: actionPayload.sleep || 14,
          calories: actionPayload.calories || 220,
          stress: actionPayload.stress || 1,
        };
        currentData.vitals = [...currentData.vitals, newVit];
      } else if (actionType === 'log_reminder') {
        const newRem = {
          id: crypto.randomUUID(),
          date: actionPayload.date || new Date().toISOString().split('T')[0],
          title: actionPayload.title || 'AI Task',
          type: actionPayload.type || 'pill',
          completed: false,
        };
        currentData.calendar = [...currentData.calendar, newRem].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      }

      const ciphertext = await encryptData(currentData, passphrase);
      const res = await upsertPrivateCat(catId, ciphertext);
      if (res.success) {
        // Refresh local state context
        setCats((prev) =>
          prev.map((c) =>
            c.id === catId
              ? {
                  ...c,
                  vitals: currentData.vitals,
                  reminders: currentData.calendar,
                  activities: currentData.activities,
                }
              : c
          )
        );

        // Append log success feedback bubble
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Successfully logged secure record for ${catToUpdate.name}! Action: "${
              actionPayload.notes || actionPayload.title || 'Vitals'
            }"`,
          },
        ]);
      } else {
        alert('Action failed: ' + res.error);
      }
    } catch {
      alert('Encryption failed during action commit.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isSending || !apiKey) return;

    const userText = inputVal.trim();
    setInputVal('');

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setIsSending(true);

    try {
      // Build context prompt
      const systemPrompt: ChatMessage = {
        role: 'system',
        content: `You are the user's private cat helper on MeowNet.
Here is the client-side decrypted health and schedule data for their cats:
${JSON.stringify(
  cats.map((c) => ({
    name: c.name,
    status: c.status,
    age: c.age,
    color: c.color,
    vitals: c.vitals.slice(-5),
    reminders: c.reminders.filter((item) => !item.completed),
    recentActivities: c.activities.slice(0, 5),
    medical: c.medical || [],
    customFields: c.customFields || [],
  })),
  null,
  2
)}

Provide helpful, expert, and practical cat care advice based on the data.
- If the user asks about heart rate or breathing rate, analyze their current vitals.
- Keep answers concise, highly readable, and structured.
- Do not use emoji characters in your responses.
- If a situation seems life-threatening, urgently advise them to contact a licensed veterinarian.
- You can recommend direct actions that the user should log for their cat (like medication reminders, food logs, water intake, or vitals logs). If you do, append a JSON action tag at the very end of your response inside brackets like this: [Action: {"catName": "Luna", "type": "log_activity", "category": "Food", "notes": "Logged 150ml Hydration"}] or [Action: {"catName": "Luna", "type": "log_vitals", "bpm": 140, "rr": 24}] or [Action: {"catName": "Luna", "type": "log_reminder", "title": "Medication Booster", "type": "pill", "date": "2026-07-03"}]. Provide only ONE action per message.`,
      };

      const payloadMessages = [systemPrompt, ...newMessages];

      const res = await fetch('/api/ai/personal-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          provider,
          model,
          messages: payloadMessages,
        }),
      });

      if (!res.ok) {
        await res.text();
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: Failed to fetch AI response (${res.status}).` },
        ]);
        return;
      }

      const data = await res.json();
      if (data.success && data.text) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.text }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${data.error || 'Unknown response format'}` },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Connection error. Could not contact helper proxy.' },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleLock = () => {
    localStorage.removeItem('meownet_vault_key');
    localStorage.removeItem('meownet_vault_token');
    setPassphrase(null);
    setApiKey('');
    setMessages([]);
    setCats([]);
  };

  // Interactive 3D tilt effects
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;
    const tiltX = -(y / (box.height / 2)) * 6;
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

  // Helper function to extract and parse log actions from AI assistant
  const parseActionFromMessage = (content: string) => {
    const actionRegex = /\[Action:\s*(\{.*\})\s*\]/;
    const match = actionRegex.exec(content);
    if (match) {
      try {
        const payload = JSON.parse(match[1]);
        const cleanedText = content.replace(actionRegex, '').trim();
        return {
          text: cleanedText,
          action: payload,
        };
      } catch {
        // Fallback
      }
    }
    return {
      text: content,
      action: null,
    };
  };

  
  const renderHudCareContext = () => {
    if (isLoadingCats) {
      return (
        <div className="flex-grow flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--empire-gold)] border-t-transparent animate-spin" />
        </div>
      );
    }

    if (cats.length === 0) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center text-center gap-2 py-10">
          <span className="material-symbols-outlined text-2xl text-[var(--text-primary)] opacity-20">pets</span>
          <p className="font-body text-xs text-[var(--text-secondary)] opacity-50">No private cats registered.</p>
          <Link
            href="/profile/care-center"
            className="text-[var(--empire-gold)] font-bold text-xs hover:underline"
          >
            Register a cat
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {cats.map((c, idx) => {
          const latestVital = c.vitals.length > 0 ? c.vitals[c.vitals.length - 1] : null;
          const activeReminders = c.reminders.filter((item) => !item.completed);
          
          // Vitals alerts
          const isUrgent = latestVital && (latestVital.bpm < 110 || latestVital.bpm > 230 || latestVital.rr < 16 || latestVital.rr > 35);
          
          return (
            <div
              key={c.id}
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              className="border p-4 rounded-2xl flex flex-col gap-3 shadow-sm preserve-3d domino-fade-item"
              style={{
                animationDelay: `${idx * 80}ms`,
                background: 'var(--bg-elevated)',
                borderColor: isUrgent ? '#ef4444' : 'var(--dropdown-border)'
              }}
            >
              <div className="flex items-center gap-3">
                <img
                  src={c.photoUrl}
                  alt={c.name}
                  className="w-10 h-10 rounded-full object-cover border"
                  style={{ borderColor: 'var(--dropdown-border)' }}
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display text-xs font-bold text-[var(--text-primary)]">{c.name}</span>
                    {isUrgent && (
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    )}
                  </div>
                  <span className="font-body text-[10px] text-[var(--text-secondary)] opacity-70 capitalize">
                    {c.status} · {c.age}
                  </span>
                </div>
              </div>

              {latestVital ? (
                <div
                  className="grid grid-cols-2 gap-2 text-[10px] font-body p-2.5 rounded-xl border"
                  style={{
                    background: 'var(--dropdown-bg)',
                    borderColor: 'var(--dropdown-border)'
                  }}
                >
                  <span className="text-[var(--text-secondary)] opacity-80">Heartbeat: <strong className="text-[var(--text-primary)] font-bold">{latestVital.bpm} bpm</strong></span>
                  <span className="text-[var(--text-secondary)] opacity-80">Breathing: <strong className="text-[var(--text-primary)] font-bold">{latestVital.rr} /min</strong></span>
                  <span className="text-[var(--text-secondary)] opacity-80">Weight: <strong className="text-[var(--text-primary)] font-bold">{latestVital.weight} kg</strong></span>
                  <span className="text-[var(--text-secondary)] opacity-80">Stress: <strong className="text-[var(--text-primary)] font-bold">{latestVital.stress}/5</strong></span>
                </div>
              ) : (
                <div
                  className="text-[10px] font-body text-[var(--text-secondary)] opacity-50 p-2 rounded-xl text-center border"
                  style={{
                    background: 'var(--dropdown-bg)',
                    borderColor: 'var(--dropdown-border)'
                  }}
                >
                  No recent vitals logged.
                </div>
              )}

              {activeReminders.length > 0 && (
                <div
                  className="flex flex-col gap-1.5 border-t pt-2"
                  style={{ borderColor: 'var(--dropdown-border)' }}
                >
                  <span className="text-[9px] text-[var(--empire-gold)] font-bold uppercase tracking-wider">
                    Active Alerts
                  </span>
                  {activeReminders.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex justify-between text-[9px] font-body text-[var(--text-secondary)] opacity-80">
                      <span>· {item.title}</span>
                      <span className="opacity-60">{item.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };
if (!passphrase) {
    return (
      <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-12 py-16 flex flex-col items-center justify-center">
        <VaultUnlock onUnlock={handleUnlock} />
      </div>
    );
  }

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-12 py-8 flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-[var(--empire-gold)] flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              support_agent
            </span>
            <span>Personal AI Helper Cockpit</span>
          </h1>
          <p className="font-body text-sm text-[var(--text-secondary)] opacity-70 mt-1">
            Private assistant cockpit powered by your own secure keys. Translates logs and triggers direct log actions.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/profile/care-center"
            className="text-[var(--text-primary)] hover:bg-black/5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 no-underline border cursor-pointer"
            style={{ background: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)' }}
          >
            <span className="material-symbols-outlined text-base">pets</span>
            <span>Care Center</span>
          </Link>
          <button
            onClick={handleLock}
            className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">lock</span>
            <span>Lock Vault</span>
          </button>
        </div>
      </div>

      {/* Main Console Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch h-[600px]">
        {/* Left Column: Local Decrypted Vitals Context Panel (4 cols) */}
        <div
          className="lg:col-span-4 border p-6 rounded-3xl flex flex-col gap-4 overflow-y-auto shadow-md"
          style={{
            background: 'var(--dropdown-bg)',
            borderColor: 'var(--dropdown-border)'
          }}
        >
          <h3
            className="font-display text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider border-b pb-2"
            style={{ borderColor: 'var(--dropdown-border)' }}
          >
            HUD Care Context
          </h3>
          
          {renderHudCareContext()}
        </div>

        {/* Right Column: Chat Console (8 cols) */}
        <div
          className="lg:col-span-8 border rounded-3xl flex flex-col overflow-hidden shadow-lg"
          style={{
            background: 'var(--dropdown-bg)',
            borderColor: 'var(--dropdown-border)'
          }}
        >
          {/* Chat Feed */}
          <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              if (msg.role === 'system') return null;
              
              const parsed = parseActionFromMessage(msg.content);

              return (
                <div
                  key={`helper-msg-${idx}`}
                  className={`flex flex-col max-w-[80%] ${isUser ? 'self-end items-end' : 'self-start items-start'} domino-fade-item`}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div
                    className={`p-4 rounded-3xl text-sm font-body leading-relaxed whitespace-pre-wrap border ${
                      isUser
                        ? 'border-transparent rounded-tr-none shadow-sm'
                        : 'rounded-tl-none'
                    }`}
                    style={isUser ? {
                      background: 'linear-gradient(135deg, var(--empire-gold), #f97316)',
                      color: '#ffffff'
                    } : {
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--dropdown-border)'
                    }}
                  >
                    {parsed.text}

                    {parsed.action && (
                      <div className="mt-4 border-t pt-3 flex flex-col gap-2" style={{ borderColor: 'var(--dropdown-border)' }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--empire-gold)] flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">analytics</span>
                          <span>Suggested Action Detected</span>
                        </span>
                        <div className="flex items-center justify-between gap-4 p-2.5 rounded-xl border bg-black/5" style={{ borderColor: 'var(--dropdown-border)' }}>
                          <div className="flex flex-col gap-0.5 text-[11px]">
                            <span className="font-bold text-[var(--text-primary)]">Log for {parsed.action.catName}</span>
                            <span className="text-[var(--text-secondary)] opacity-70">
                              {parsed.action.notes || parsed.action.title || `Telemetry log values`}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              const targetCat = cats.find(c => c.name.toLowerCase() === parsed.action.catName.toLowerCase());
                              if (targetCat) {
                                handleExecuteAction(targetCat.id, parsed.action.type, parsed.action);
                              } else {
                                alert(`Cat named "${parsed.action.catName}" not registered.`);
                              }
                            }}
                            className="bg-[var(--empire-gold)] hover:bg-[#e6b020] text-white border-none text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">done</span>
                            <span>Commit Log</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div
                className="self-start border p-3 rounded-2xl rounded-tl-none max-w-[80%] flex items-center gap-1.5 animate-pulse"
                style={{
                  background: 'var(--bg-elevated)',
                  borderColor: 'var(--dropdown-border)'
                }}
              >
                <span className="w-1.5 h-1.5 bg-[var(--text-primary)] opacity-40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-[var(--text-primary)] opacity-40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[var(--text-primary)] opacity-40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input form */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t flex gap-3"
            style={{
              background: 'var(--dropdown-bg)',
              borderTop: '1px solid var(--dropdown-border)'
            }}
          >
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={apiKey ? 'Ask your private helper a question…' : 'Enter your key in settings to message...'}
              disabled={isSending || !apiKey}
              className="flex-grow font-body text-xs px-4 py-3 rounded-2xl border outline-none focus:border-[var(--empire-gold)] transition-all"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                borderColor: 'var(--dropdown-border)'
              }}
            />
            <button
              type="submit"
              disabled={isSending || !inputVal.trim() || !apiKey}
              className="text-white hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed px-4 py-3 rounded-2xl flex items-center justify-center transition-all cursor-pointer font-display text-xs font-bold uppercase tracking-wider border-none"
              style={{
                background: 'linear-gradient(135deg, var(--empire-gold), #f97316)'
              }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
