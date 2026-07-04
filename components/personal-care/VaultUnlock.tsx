'use client';
// components/personal-care/VaultUnlock.tsx
// Front-end lock screen that manages client-side decryption passphrase state

import { useState, useEffect } from 'react';
import { getPrivateConfig, savePrivateConfig } from '@/lib/actions/personalCare';
import { encryptData, decryptData } from '@/lib/security/encryption';
import { createClient } from '@/lib/supabase/client';

interface VaultUnlockProps {
  readonly onUnlock: (passphrase: string) => void;
}

export default function VaultUnlock({ onUnlock }: VaultUnlockProps) {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [encryptedConfig, setEncryptedConfig] = useState<string | null>(null);

  useEffect(() => {
    async function checkVaultState() {
      try {
        const res = await getPrivateConfig();
        if (res.success && res.data) {
          setEncryptedConfig(res.data.encrypted_keys);
          setIsFirstTime(false);

          const supabase = createClient();
          const { data: { user: su } } = await supabase.auth.getUser();

          // 1. Migrate legacy cleartext key if it exists
          const legacyKey = localStorage.getItem('meownet_vault_key');
          if (legacyKey) {
            try {
              await decryptData(res.data.encrypted_keys, legacyKey);
              if (su) {
                const encryptedPassphrase = await encryptData(legacyKey, su.id);
                localStorage.setItem('meownet_vault_token', encryptedPassphrase);
              }
              localStorage.removeItem('meownet_vault_key');
              onUnlock(legacyKey);
              return;
            } catch {
              localStorage.removeItem('meownet_vault_key');
            }
          }

          // 2. Try auto-unlock using the encrypted session token
          const cachedToken = localStorage.getItem('meownet_vault_token');
          if (cachedToken && su) {
            try {
              const decryptedPassphrase = await decryptData(cachedToken, su.id) as string;
              await decryptData(res.data.encrypted_keys, decryptedPassphrase);
              onUnlock(decryptedPassphrase);
              return;
            } catch {
              localStorage.removeItem('meownet_vault_token');
            }
          }
        } else {
          setIsFirstTime(true);
        }
      } catch {
        setError('Failed to query security status. Please check connection.');
      } finally {
        setIsLoading(false);
      }
    }

    checkVaultState();
  }, [onUnlock]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase) return;
    setIsLoading(true);
    setError('');

    try {
      if (isFirstTime) {
        if (passphrase !== confirmPassphrase) {
          setError('Passwords do not match.');
          setIsLoading(false);
          return;
        }

        if (passphrase.length < 8) {
          setError('Password must be at least 8 characters.');
          setIsLoading(false);
          return;
        }

        // Initialize empty settings object encrypted with the new password
        const initialConfig = {
          geminiKey: '',
          openaiKey: '',
          anthropicKey: '',
          preferredProvider: 'gemini',
          preferredModel: 'gemini-1.5-flash',
          initialized: true,
        };

        const ciphertext = await encryptData(initialConfig, passphrase);
        const saveRes = await savePrivateConfig(ciphertext);

        if (!saveRes.success) {
          setError(saveRes.error || 'Failed to initialize secure vault.');
          setIsLoading(false);
          return;
        }

        const supabase = createClient();
        const { data: { user: su } } = await supabase.auth.getUser();
        if (su) {
          const encryptedPassphrase = await encryptData(passphrase, su.id);
          localStorage.setItem('meownet_vault_token', encryptedPassphrase);
        }
        localStorage.removeItem('meownet_vault_key');
        onUnlock(passphrase);
      } else {
        if (!encryptedConfig) {
          setError('Secure vault payload missing.');
          setIsLoading(false);
          return;
        }

        // Validate password by trying to decrypt
        try {
          await decryptData(encryptedConfig, passphrase);
          const supabase = createClient();
          const { data: { user: su } } = await supabase.auth.getUser();
          if (su) {
            const encryptedPassphrase = await encryptData(passphrase, su.id);
            localStorage.setItem('meownet_vault_token', encryptedPassphrase);
          }
          localStorage.removeItem('meownet_vault_key');
          onUnlock(passphrase);
        } catch {
          setError('Incorrect password. Cryptographic decryption failed.');
          setIsLoading(false);
        }
      }
    } catch {
      setError('An encryption error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && isFirstTime === null) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-[var(--empire-gold)] border-t-transparent animate-spin" />
        <p className="font-body text-xs text-[var(--text-primary)] opacity-60">Verifying secure keys…</p>
      </div>
    );
  }

  return (
    <div
      className="max-w-md w-full mx-auto p-8 rounded-3xl shadow-2xl flex flex-col gap-6 text-center"
      style={{
        background: 'var(--dropdown-bg)',
        backdropFilter: 'blur(24px)',
        border: '1px solid var(--dropdown-border)',
      }}
    >
      <div className="w-16 h-16 mx-auto rounded-full bg-[var(--empire-gold)]/10 text-[var(--empire-gold)] flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          {isFirstTime ? 'lock_open' : 'lock'}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
          {isFirstTime ? 'Create Your Private Vault' : 'Unlock Your Private Vault'}
        </h2>
        <p className="font-body text-xs text-[var(--text-primary)] opacity-70 leading-relaxed">
          {isFirstTime
            ? 'Set a master password to encrypt your API keys and personal cat logs. This password stays strictly in your browser and is never sent to our servers.'
            : 'Enter your vault password to decrypt your AI keys and personal cat logs locally.'}
        </p>
      </div>

      <form onSubmit={handleUnlock} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 text-left">
          <label htmlFor="vault-passphrase" className="font-display text-[10px] font-bold text-[var(--text-primary)] opacity-50 uppercase tracking-wider pl-2">
            Password
          </label>
          <input
            id="vault-passphrase"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Enter master password…"
            required
            className="w-full font-body text-sm px-4 py-3 rounded-2xl border outline-none transition-all"
            style={{
              background: 'var(--dropdown-bg)',
              color: 'var(--text-primary)',
              borderColor: 'var(--dropdown-border)',
            }}
          />
        </div>

        {isFirstTime && (
          <div className="flex flex-col gap-1 text-left">
            <label htmlFor="vault-confirm-passphrase" className="font-display text-[10px] font-bold text-[var(--text-primary)] opacity-50 uppercase tracking-wider pl-2">
              Confirm Password
            </label>
            <input
              id="vault-confirm-passphrase"
              type="password"
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              placeholder="Confirm master password…"
              required
              className="w-full font-body text-sm px-4 py-3 rounded-2xl border outline-none transition-all"
              style={{
                background: 'var(--dropdown-bg)',
                color: 'var(--text-primary)',
                borderColor: 'var(--dropdown-border)',
              }}
            />
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-xl font-body text-xs text-left flex items-start gap-2">
            <span className="material-symbols-outlined text-base mt-0.5">error</span>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full text-white font-display text-sm font-bold uppercase transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer py-3.5 rounded-2xl border-none hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, var(--empire-gold), #f97316)',
          }}
        >
          {isLoading ? (
            <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : isFirstTime ? (
            'Setup Vault'
          ) : (
            'Unlock Vault'
          )}
        </button>
      </form>
    </div>
  );
}
