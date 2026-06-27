// app/auth/layout.tsx — Auth pages layout (no app shell)
import type { ReactNode } from 'react';

// Auth pages use Supabase middleware — skip prerender
export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
