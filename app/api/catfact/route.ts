// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
// app/api/catfact/route.ts — Full catfact.ninja proxy (all 3 endpoints)
// Prevents Chrome extension (injectScriptAdjust.js) from intercepting browser fetches.
//
// Proxied endpoints:
//   GET /api/catfact?endpoint=fact&max_length=200        → catfact.ninja/fact
//   GET /api/catfact?endpoint=facts&limit=5&max_length=150 → catfact.ninja/facts
//   GET /api/catfact?endpoint=breeds&limit=10            → catfact.ninja/breeds

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE = 'https://catfact.ninja';

// Fallback facts if upstream is unreachable
const FALLBACK_FACTS = [
  { fact: 'Cats have a specialized collarbone that allows them to always land on their feet.',          length: 82 },
  { fact: 'A cat can jump up to six times its own length in a single bound.',                          length: 64 },
  { fact: 'Cats spend 70% of their lives sleeping — around 13 to 16 hours per day.',                  length: 72 },
  { fact: 'A group of cats is called a clowder, and a group of kittens is called a kindle.',           length: 78 },
  { fact: 'Cats have 32 muscles in each ear, allowing them to rotate their ears 180 degrees.',        length: 82 },
  { fact: "A cat's nose print is as unique as a human fingerprint.",                                   length: 55 },
  { fact: 'Cats can make over 100 distinct vocalizations, while dogs can only make about 10.',         length: 80 },
  { fact: 'The first cat in space was a French cat named Félicette in 1963.',                         length: 67 },
  { fact: "Cats have a third eyelid called a 'haw' that helps protect and moisten the eye.",          length: 81 },
  { fact: 'Ancient Egyptians shaved their eyebrows to mourn the death of a beloved cat.',             length: 79 },
];

// Fallback breeds if upstream is unreachable
const FALLBACK_BREEDS = [
  { breed: 'Abyssinian',     country: 'Ethiopia',          origin: 'Natural',     coat: 'Short', pattern: 'Ticked'    },
  { breed: 'American Shorthair', country: 'United States', origin: 'Natural',     coat: 'Short', pattern: 'Various'   },
  { breed: 'Bengal',         country: 'United States',     origin: 'Hybrid',      coat: 'Short', pattern: 'Spotted'   },
  { breed: 'Birman',         country: 'France',            origin: 'Natural',     coat: 'Semi-long', pattern: 'Colorpoint' },
  { breed: 'British Shorthair', country: 'United Kingdom', origin: 'Natural',     coat: 'Short', pattern: 'Various'   },
  { breed: 'Maine Coon',     country: 'United States',     origin: 'Natural',     coat: 'Long',  pattern: 'Various'   },
  { breed: 'Norwegian Forest', country: 'Norway',          origin: 'Natural',     coat: 'Long',  pattern: 'Various'   },
  { breed: 'Persian',        country: 'Iran',              origin: 'Natural',     coat: 'Long',  pattern: 'Various'   },
  { breed: 'Ragdoll',        country: 'United States',     origin: 'Selective',   coat: 'Semi-long', pattern: 'Colorpoint' },
  { breed: 'Siamese',        country: 'Thailand',          origin: 'Natural',     coat: 'Short', pattern: 'Colorpoint' },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get('endpoint') ?? 'fact';

  // Build upstream URL + forward supported params
  let upstreamUrl: string;

  if (endpoint === 'facts') {
    const params = new URLSearchParams();
    if (searchParams.get('limit'))      params.set('limit',      searchParams.get('limit')!);
    if (searchParams.get('max_length')) params.set('max_length', searchParams.get('max_length')!);
    upstreamUrl = `${BASE}/facts${params.size ? `?${params}` : ''}`;
  } else if (endpoint === 'breeds') {
    const params = new URLSearchParams();
    if (searchParams.get('limit')) params.set('limit', searchParams.get('limit')!);
    upstreamUrl = `${BASE}/breeds${params.size ? `?${params}` : ''}`;
  } else {
    // Default: single random fact
    const params = new URLSearchParams();
    if (searchParams.get('max_length')) params.set('max_length', searchParams.get('max_length')!);
    upstreamUrl = `${BASE}/fact${params.size ? `?${params}` : ''}`;
  }

  try {
    const res = await fetch(upstreamUrl, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`catfact.ninja returned ${res.status}`);

    const data: unknown = await res.json();
    return NextResponse.json(data, { status: 200 });

  } catch {
    // Return typed fallback per endpoint
    if (endpoint === 'breeds') {
      const limit = Math.min(Number(searchParams.get('limit') ?? 10), FALLBACK_BREEDS.length);
      return NextResponse.json(
        { data: FALLBACK_BREEDS.slice(0, limit), fallback: true },
        { status: 200 },
      );
    }
    if (endpoint === 'facts') {
      const limit  = Math.min(Number(searchParams.get('limit') ?? 5), FALLBACK_FACTS.length);
      const maxLen = Number(searchParams.get('max_length') ?? 999);
      const items  = FALLBACK_FACTS.filter(f => f.length <= maxLen).slice(0, limit);
      return NextResponse.json({ data: items, fallback: true }, { status: 200 });
    }
    // Single fact fallback
    const maxLen  = Number(searchParams.get('max_length') ?? 999);
    const pool    = FALLBACK_FACTS.filter(f => f.length <= maxLen);
    const pick    = pool[Math.floor(Math.random() * pool.length)] ?? FALLBACK_FACTS[0];
    return NextResponse.json({ ...pick, fallback: true }, { status: 200 });
  }
}
