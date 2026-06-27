'use client';
// components/auth/AuthBridge/index.tsx — Bridge Clerk sessions to Supabase Auth

import { useEffect, useRef } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { syncSupabasePassword } from '@/lib/actions/auth';

// Sync stamp TTL — avoid redundant syncs within this window (ms)
const SYNC_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SYNC_STAMP_KEY = 'meownet_auth_sync';

function getSyncStamp(): number {
  try { return parseInt(localStorage.getItem(SYNC_STAMP_KEY) || '0', 10); } catch { return 0; }
}
function setSyncStamp() {
  try { localStorage.setItem(SYNC_STAMP_KEY, String(Date.now())); } catch {}
}
function clearSyncStamp() {
  try { localStorage.removeItem(SYNC_STAMP_KEY); } catch {}
}

export default function AuthBridge() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const supabase = createClient();
  const router = useRouter();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || syncingRef.current) return;

    async function syncAuth() {
      syncingRef.current = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (user) {
          // User is logged into Clerk
          const email = user.primaryEmailAddress?.emailAddress;
          if (!email) return;

          if (!session || session.user.email !== email) {
            console.log('Synchronizing session with Supabase server-side...');
            const syncResult = await syncSupabasePassword();

            // Handle blocked/expired accounts — sign out of Clerk and redirect
            if (!syncResult.success) {
              if (syncResult.error === 'account_disabled') {
                console.warn('Account is disabled. Signing out of Clerk...');
                clearSyncStamp();
                await signOut();
                router.replace('/auth/login?error=account_disabled');
                return;
              }
              if (syncResult.error === 'trial_expired') {
                console.warn('Trial account has expired. Signing out of Clerk...');
                clearSyncStamp();
                await signOut();
                router.replace('/auth/login?error=trial_expired');
                return;
              }
              console.error('Server-side auth sync failed:', syncResult.error);
              return;
            }

            // Sign in using the credentials returned from the server action
            if (syncResult.email && syncResult.password) {
              const { error: signInError } = await supabase.auth.signInWithPassword({
                email: syncResult.email,
                password: syncResult.password,
              });

              if (signInError) {
                console.error('Supabase sign-in failed after server sync:', signInError.message);
              } else {
                console.log('Supabase bridge sign-in successful!');
                setSyncStamp();
                router.refresh();
              }
            }
          } else {
            // Session exists and email matches — update stamp if stale
            const lastSync = getSyncStamp();
            if ((Date.now() - lastSync) > SYNC_TTL_MS) {
              setSyncStamp();
            }
          }
        } else {
          // User is signed out of Clerk
          if (session) {
            const isClerkSynced = session.user?.user_metadata?.clerk_synced === true;
            if (isClerkSynced) {
              console.log('User signed out of Clerk, signing out of Supabase...');
              await supabase.auth.signOut();
              clearSyncStamp();
              router.refresh();
            }
          }
        }
      } catch (err) {
        console.error('Auth bridge sync error:', err);
      } finally {
        syncingRef.current = false;
      }
    }

    syncAuth();
  }, [user, isLoaded, supabase, router, signOut]);

  return null;
}
