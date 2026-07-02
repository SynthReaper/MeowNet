'use client';
// components/personal-care/HelperWidget.tsx
// Site-wide floating collapsible AI helper widget

import { useState, useEffect, useRef } from 'react';
import { getPrivateConfig, listPrivateCats, upsertPrivateCat } from '@/lib/actions/personalCare';
import { decryptData, encryptData } from '@/lib/security/encryption';
import { createClient } from '@/lib/supabase/client';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface CatContextItem {
  id: string;
  name: string;
  status: string;
  age: string;
  color: string;
  vitals: Array<any>;
  reminders: Array<{ id: string; completed: boolean; title: string; date: string }>;
  recentActivities: Array<any>;
  medical?: Array<any>;
  customFields?: Array<any>;
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
  status: string;
  ageEstimate: string;
  color: string;
  vitals?: Array<any>;
  calendar?: Array<{ id: string; completed: boolean; title: string; date: string }>;
  activities?: Array<any>;
  medical?: Array<any>;
  customFields?: Array<any>;
}

export default function HelperWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [unlockError, setUnlockError] = useState('');
  
  // AI Config & Local Cats state
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'anthropic'>('gemini');
  const [model, setModel] = useState('');
  const [catsContext, setCatsContext] = useState<CatContextItem[]>([]);

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Decrypt and unlock the vault
  async function handleUnlockWithPassphrase(phrase: string) {
    setUnlockError('');
    try {
      const configRes = await getPrivateConfig();
      if (!configRes.success) {
        setUnlockError('Could not connect to database.');
        return;
      }
      if (!configRes.data?.encrypted_keys) {
        setUnlockError('Vault has not been set up yet. Go to your Profile Care Center to initialize it.');
        return;
      }

      // Decrypt credentials
      const configObj = (await decryptData(configRes.data.encrypted_keys, phrase)) as PrivateConfig;
      const activeKey =
        configObj.preferredProvider === 'gemini'
          ? configObj.geminiKey
          : configObj.preferredProvider === 'openai'
          ? configObj.openaiKey
          : configObj.anthropicKey;

      if (!activeKey) {
        setUnlockError(`No key configured for ${configObj.preferredProvider}. Please check settings.`);
        return;
      }

      setApiKey(activeKey);
      setProvider(configObj.preferredProvider);
      setModel(configObj.preferredModel);
      setPassphrase('');
      try {
        const supabase = createClient();
        const { data: { user: su } } = await supabase.auth.getUser();
        if (su) {
          const encKey = await encryptData(phrase, su.id);
          localStorage.setItem('meownet_vault_token', encKey);
        }
      } catch {}
      localStorage.removeItem('meownet_vault_key');
      setIsUnlocked(true);

      // Load cat data in background for context
      try {
        const catsRes = await listPrivateCats();
        if (catsRes.success && catsRes.data) {
          const decCats: CatContextItem[] = [];
          for (const rawCat of catsRes.data) {
            try {
              const dec = (await decryptData(rawCat.encrypted_data, phrase)) as DecryptedCatData;
              decCats.push({
                id: rawCat.id,
                name: dec.name,
                status: dec.status,
                age: dec.ageEstimate,
                color: dec.color,
                vitals: dec.vitals || [],
                reminders: dec.calendar || [],
                recentActivities: dec.activities || [],
                medical: dec.medical || [],
                customFields: dec.customFields || [],
              });
            } catch {
              // Skip single failures
            }
          }
          setCatsContext(decCats);
        }
      } catch {
        // Skip background context load failures silently
      }

      // Initialize welcome message
      setMessages([
        {
          role: 'assistant',
          content: 'Hello! I am your personal cat care helper. How can I assist you with your cats today?',
        },
      ]);
    } catch {
      setUnlockError('Decryption failed. Incorrect password.');
    }
  }

  // Auto-scroll chat history
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Attempt auto-unlock on mount
  useEffect(() => {
    async function attemptAutoUnlock() {
      // 1. Migrate legacy cleartext key if it exists
      const legacyKey = localStorage.getItem('meownet_vault_key');
      if (legacyKey) {
        try {
          const supabase = createClient();
          const { data: { user: su } } = await supabase.auth.getUser();
          if (su) {
            const encryptedPassphrase = await encryptData(legacyKey, su.id);
            localStorage.setItem('meownet_vault_token', encryptedPassphrase);
          }
          localStorage.removeItem('meownet_vault_key');
          handleUnlockWithPassphrase(legacyKey);
          return;
        } catch {
          localStorage.removeItem('meownet_vault_key');
        }
      }

      // 2. Try auto-unlock using the encrypted session token
      const cachedToken = localStorage.getItem('meownet_vault_token');
      if (cachedToken) {
        try {
          const supabase = createClient();
          const { data: { user: su } } = await supabase.auth.getUser();
          if (su) {
            const decryptedPassphrase = await decryptData(cachedToken, su.id) as string;
            handleUnlockWithPassphrase(decryptedPassphrase);
          }
        } catch {
          localStorage.removeItem('meownet_vault_token');
        }
      }
    }
    attemptAutoUnlock();
  }, []);

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase) return;
    handleUnlockWithPassphrase(passphrase);
  };

  // Commit dynamic actions suggested by AI
  const handleExecuteAction = async (catId: string, actionType: string, actionPayload: any) => {
    let cachedPhrase = localStorage.getItem('meownet_vault_key');
    if (!cachedPhrase) {
      const cachedToken = localStorage.getItem('meownet_vault_token');
      if (cachedToken) {
        try {
          const supabase = createClient();
          const { data: { user: su } } = await supabase.auth.getUser();
          if (su) {
            cachedPhrase = await decryptData(cachedToken, su.id) as string;
          }
        } catch {}
      }
    }
    if (!cachedPhrase) return;

    const catToUpdate = catsContext.find((c) => c.id === catId);
    if (!catToUpdate) return;

    try {
      const currentData = {
        name: catToUpdate.name,
        photoUrl: '/pet-logo.avif',
        status: catToUpdate.status,
        ageEstimate: catToUpdate.age,
        color: catToUpdate.color,
        vitals: catToUpdate.vitals,
        calendar: catToUpdate.reminders,
        activities: catToUpdate.recentActivities,
        medical: catToUpdate.medical || [],
        customFields: catToUpdate.customFields || [],
      };

      if (actionType === 'log_activity') {
        const newAct = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          category: actionPayload.category || 'Food',
          notes: actionPayload.notes || 'Logged from AI suggestion',
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

      const ciphertext = await encryptData(currentData, cachedPhrase);
      const res = await upsertPrivateCat(catId, ciphertext);
      if (res.success) {
        // Refresh local state context
        setCatsContext((prev) =>
          prev.map((c) =>
            c.id === catId
              ? {
                  ...c,
                  vitals: currentData.vitals,
                  reminders: currentData.calendar,
                  recentActivities: currentData.activities,
                }
              : c
          )
        );

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
    if (!inputVal.trim() || isLoading) return;

    const userText = inputVal.trim();
    setInputVal('');

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Build context prompt
      const systemPrompt: ChatMessage = {
        role: 'system',
        content: `You are the user's private cat helper on MeowNet.
Here is the client-side decrypted health and schedule data for their cats:
${JSON.stringify(
  catsContext.map((c) => ({
    name: c.name,
    status: c.status,
    age: c.age,
    color: c.color,
    vitals: c.vitals.slice(-5),
    reminders: c.reminders.filter((item) => !item.completed),
    recentActivities: c.recentActivities.slice(0, 5),
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
      setIsLoading(false);
    }
  };

  // Lock helper manually
  const handleLockHelper = () => {
    localStorage.removeItem('meownet_vault_key');
    localStorage.removeItem('meownet_vault_token');
    setIsUnlocked(false);
    setApiKey('');
    setMessages([]);
    setCatsContext([]);
  };

  // Extract JSON actions out of message strings
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

  return (
    <div className="fixed bottom-6 right-6 z-50 font-body">
      {/* Collapsed Bubble Trigger */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-[var(--empire-gold)] hover:bg-[#e6b020] text-white shadow-2xl flex items-center justify-center transition-all scale-100 hover:scale-105 active:scale-95 cursor-pointer border-none"
        >
          <span className="material-symbols-outlined text-2xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
            support_agent
          </span>
        </button>
      )}

      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div
          className="w-80 md:w-96 h-[500px] backdrop-blur-md rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200"
          style={{
            background: 'var(--dropdown-bg)',
            border: '1px solid var(--dropdown-border)'
          }}
        >
          
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between border-b"
            style={{
              borderColor: 'var(--dropdown-border)',
              background: 'linear-gradient(135deg,rgba(217,119,6,0.04),rgba(249,115,22,0.02))'
            }}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--empire-gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>
                support_agent
              </span>
              <div className="flex flex-col">
                <span className="font-display text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Helper Companion
                </span>
                {isUnlocked && (
                  <span className="text-[9px] text-[var(--text-secondary)] opacity-70 uppercase tracking-widest font-semibold">
                    {provider} · {model}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {isUnlocked && (
                <button
                  onClick={handleLockHelper}
                  className="p-1 transition-all cursor-pointer bg-transparent border-none"
                  style={{ color: 'var(--text-primary)', opacity: 0.6 }}
                  title="Lock Vault"
                >
                  <span className="material-symbols-outlined text-sm">lock</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 transition-all cursor-pointer bg-transparent border-none"
                style={{ color: 'var(--text-primary)', opacity: 0.6 }}
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-3">
            {!isUnlocked ? (
              // Locked State / Vault Unlock
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
                <span className="material-symbols-outlined text-3xl text-[var(--empire-gold)]">lock</span>
                <div className="flex flex-col gap-1">
                  <h4 className="font-display text-xs font-bold text-[var(--text-primary)] uppercase">Vault Locked</h4>
                  <p className="text-[10px] text-[var(--text-secondary)] opacity-60 leading-relaxed">
                    Enter your vault password to decrypt your AI keys and enable personal cat assistance.
                  </p>
                </div>

                <form onSubmit={handleUnlockSubmit} className="w-full flex flex-col gap-2">
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Master password…"
                    className="w-full font-body text-xs px-3 py-2 rounded-xl border outline-none text-center focus:border-[var(--empire-gold)]"
                    style={{
                      background: 'var(--dropdown-bg)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--dropdown-border)'
                    }}
                  />
                  {unlockError && (
                    <span className="text-[9px] text-red-600 dark:text-red-400 font-semibold">{unlockError}</span>
                  )}
                  <button
                    type="submit"
                    className="text-white text-[10px] font-bold uppercase tracking-wider py-2 rounded-xl transition-all shadow-md cursor-pointer border-none hover:opacity-90 active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, var(--empire-gold), #f97316)'
                    }}
                  >
                    Unlock Helper
                  </button>
                </form>
              </div>
            ) : (
              // Chat conversation feed
              <div className="flex flex-col gap-3 min-h-full">
                {messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  
                  const parsed = parseActionFromMessage(msg.content);

                  return (
                    <div
                      key={`widget-msg-${idx}`}
                      className={`flex flex-col max-w-[85%] ${isUser ? 'self-end items-end' : 'self-start items-start'}`}
                    >
                      <div
                        className={`p-3 rounded-2xl text-xs font-body leading-relaxed whitespace-pre-wrap border ${
                          isUser
                            ? 'border-transparent rounded-tr-none shadow-sm'
                            : 'rounded-tl-none'
                        }`}
                        style={isUser ? {
                          background: 'linear-gradient(135deg, var(--empire-gold), #f97316)',
                          color: '#ffffff'
                        } : {
                          background: 'var(--dropdown-bg)',
                          color: 'var(--text-primary)',
                          borderColor: 'var(--dropdown-border)'
                        }}
                      >
                        {parsed.text}

                        {parsed.action && (
                          <div className="mt-3 border-t pt-2 flex flex-col gap-1.5" style={{ borderColor: 'var(--dropdown-border)' }}>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--empire-gold)] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[10px]">analytics</span>
                              <span>Action Suggested</span>
                            </span>
                            <div className="flex flex-col gap-2 p-1.5 rounded-lg border bg-black/5" style={{ borderColor: 'var(--dropdown-border)' }}>
                              <div className="flex flex-col gap-0.5 text-[10px]">
                                <span className="font-bold text-[var(--text-primary)]">Log for {parsed.action.catName}</span>
                                <span className="text-[var(--text-secondary)] opacity-70">
                                  {parsed.action.notes || parsed.action.title || `Telemetry log values`}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  const targetCat = catsContext.find(c => c.name.toLowerCase() === parsed.action.catName.toLowerCase());
                                  if (targetCat) {
                                    handleExecuteAction(targetCat.id, parsed.action.type, parsed.action);
                                  } else {
                                    alert(`Cat "${parsed.action.catName}" not registered.`);
                                  }
                                }}
                                className="bg-[var(--empire-gold)] hover:bg-[#e6b020] text-white border-none text-[9px] font-bold uppercase tracking-wider py-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 w-full"
                              >
                                <span className="material-symbols-outlined text-[10px]">done</span>
                                <span>Commit Log</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div
                    className="self-start border p-3 rounded-2xl rounded-tl-none max-w-[85%] flex items-center gap-1.5"
                    style={{
                      background: 'var(--dropdown-bg)',
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
            )}
          </div>

          {/* Footer Input */}
          {isUnlocked && (
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t flex gap-2"
              style={{
                background: 'var(--dropdown-bg)',
                borderTop: '1px solid var(--dropdown-border)'
              }}
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ask your helper a question…"
                disabled={isLoading}
                className="flex-grow font-body text-xs px-3 py-2 rounded-xl border outline-none focus:border-[var(--empire-gold)] transition-all"
                style={{
                  background: 'var(--dropdown-bg)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--dropdown-border)'
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !inputVal.trim()}
                className="text-white hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer border-none"
                style={{
                  background: 'linear-gradient(135deg, var(--empire-gold), #f97316)'
                }}
              >
                <span className="material-symbols-outlined text-sm font-bold">send</span>
              </button>
            </form>
          )}

        </div>
      )}
    </div>
  );
}
