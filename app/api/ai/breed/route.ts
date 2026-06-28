// app/api/ai/breed/route.ts — Proxy to Python ML service

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const ML_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';
const ML_SECRET = process.env.ML_SERVICE_SECRET ?? '';
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const photo = formData.get('photo') as File | null;
  if (!photo) return NextResponse.json({ error: 'photo_required' }, { status: 400 });
  if (photo.size > MAX_SIZE) return NextResponse.json({ error: 'file_too_large' }, { status: 413 });

  // MIME allowlist — only real image types are forwarded to the ML service
  const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
  if (!ALLOWED_IMAGE_MIME.has(photo.type)) {
    return NextResponse.json({ error: 'invalid_file_type' }, { status: 415 });
  }

  // Forward to ML service
  const mlFormData = new FormData();
  mlFormData.append('photo', photo);

  try {
    const res = await fetch(`${ML_URL}/breed`, {
      method: 'POST',
      headers: { 'X-Service-Secret': ML_SECRET },
      body: mlFormData,
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: 'ml_service_error', detail: text }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'ml_timeout' }, { status: 504 });
    }
    return NextResponse.json({ error: 'ml_unavailable' }, { status: 503 });
  }
}
