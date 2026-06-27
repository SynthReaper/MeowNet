// app/api/ai/health/route.ts — Warms up ML service

import { type NextRequest, NextResponse } from 'next/server';

const ML_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';
const ML_SECRET = process.env.ML_SERVICE_SECRET ?? '';

export async function GET(_req: NextRequest) {
  try {
    const res = await fetch(`${ML_URL}/health`, {
      headers: { 'X-Service-Secret': ML_SECRET },
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    return NextResponse.json({ ml: data, status: 'ok' });
  } catch {
    return NextResponse.json({ ml: null, status: 'unavailable' }, { status: 503 });
  }
}
