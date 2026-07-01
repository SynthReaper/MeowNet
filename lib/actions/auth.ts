'use server';
// lib/actions/auth.ts — Server Actions for authentication synchronization

import { currentUser } from '@clerk/nextjs/server';
import type { User } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { createHmac } from 'crypto';

export interface SyncResult {
  success: boolean;
  error?: string;
  email?: string;
  password?: string;
}

function derivePassword(clerkId: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'default-fallback-secret-key-12345';
  return 'clerk_' + createHmac('sha256', secret).update(clerkId).digest('hex') + '!';
}

function getClerkDisplayName(clerkUser: User, email: string): string {
  return (
    (clerkUser.publicMetadata?.full_name as string) ||
    (clerkUser.unsafeMetadata?.full_name as string) ||
    clerkUser.fullName ||
    clerkUser.username ||
    email.split('@')[0]
  );
}

interface ProfileCheckResult {
  allowed: boolean;
  error?: 'trial_expired' | 'account_disabled';
}

async function validateUserProfile(
  admin: SupabaseClient<Database>,
  userId: string
): Promise<ProfileCheckResult> {
  const { data: profile } = await admin
    .from('profiles' as never)
    .select('password_expires_at, is_enabled')
    .eq('id', userId)
    .maybeSingle() as unknown as { data: { password_expires_at: string | null; is_enabled: boolean | null } | null };

  if (!profile) return { allowed: true };

  const isExpired = profile.password_expires_at && new Date(profile.password_expires_at) < new Date();
  if (profile.is_enabled === false || isExpired) {
    if (isExpired && profile.is_enabled !== false) {
      await admin
        .from('profiles' as never)
        .update({ is_enabled: false } as never)
        .eq('id', userId);
    }
    return { allowed: false, error: isExpired ? 'trial_expired' : 'account_disabled' };
  }

  return { allowed: true };
}

export async function syncSupabasePassword(): Promise<SyncResult> {
  try {
    // 1. Get current authenticated Clerk user on the server
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return { success: false, error: 'unauthorized_clerk' };
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) {
      return { success: false, error: 'no_email_found' };
    }

    // 2. Generate the secure deterministic password using HMAC
    const deterministicPassword = derivePassword(clerkUser.id);

    // 3. Initialize Supabase Service Role client to access Admin Auth API
    const admin = createServiceClient();

    // 4. Find if the user already exists in Supabase Auth by email using the secure RPC helper
    const { data: userList, error: queryError } = await admin.rpc('get_user_by_email' as never, { p_email: email } as never) as unknown as { data: { id: string; email: string }[] | null, error: { message: string } | null };

    if (queryError) {
      console.error('Supabase admin get_user_by_email query error:', queryError.message);
      return { success: false, error: 'database_query_failed' };
    }

    const existingUser = userList?.[0] ?? null;

    if (existingUser) {
      const check = await validateUserProfile(admin, existingUser.id);
      if (!check.allowed) {
        return { success: false, error: check.error };
      }

      const displayName = getClerkDisplayName(clerkUser, email);

      // User exists — update password, confirm email, and profile metadata
      const { error: updateError } = await admin.auth.admin.updateUserById(existingUser.id, {
        password: deterministicPassword,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          full_name: displayName,
          avatar_url: clerkUser.imageUrl,
          clerk_synced: true,
        }
      });

      if (updateError) {
        console.error('Supabase admin updateUserById error:', updateError.message);
        return { success: false, error: 'failed_to_update_password' };
      }
      console.log(`Successfully synchronized password for existing user: ${email}`);
    } else {
      // User does not exist — create them with deterministic password
      const displayName = getClerkDisplayName(clerkUser, email);

      const { error: createError } = await admin.auth.admin.createUser({
        email,
        password: deterministicPassword,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          full_name: displayName,
          avatar_url: clerkUser.imageUrl,
          clerk_synced: true,
        }
      });

      if (createError) {
        console.error('Supabase admin createUser error:', createError.message);
        return { success: false, error: 'failed_to_create_user' };
      }
      console.log(`Successfully created and synchronized new user: ${email}`);
    }

    return { success: true, email, password: deterministicPassword };
  } catch (err) {
    console.error('syncSupabasePassword exception:', err);
    const message = err instanceof Error ? err.message : 'internal_error';
    return { success: false, error: message };
  }
}
