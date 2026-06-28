// app/api/ai/meow/route.ts — Proxy to Python ML service for Meow Mood Classification
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const ML_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';
const ML_SECRET = process.env.ML_SERVICE_SECRET ?? '';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const audio = formData.get('audio') as File | null;
  if (!audio) return NextResponse.json({ error: 'audio_required' }, { status: 400 });
  if (audio.size > MAX_SIZE) return NextResponse.json({ error: 'file_too_large' }, { status: 413 });

  // Forward to ML service
  const mlFormData = new FormData();
  mlFormData.append('audio', audio);

  try {
    const res = await fetch(`${ML_URL}/meow`, {
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
