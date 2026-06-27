import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    // Auth check
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const limit = searchParams.get('limit') || '15';
    const type = searchParams.get('type') || 'gifs'; // 'gifs' or 'stickers'

    const apiKey = process.env.TENOR_API_KEY ?? 'LIVDSRZULELA';
    let tenorUrl = `https://g.tenor.com/v1/search?key=${apiKey}&q=${encodeURIComponent(q)}&limit=${limit}`;
    if (type === 'stickers') {
      tenorUrl += '&searchfilter=sticker';
    }

    const res = await fetch(tenorUrl);
    if (!res.ok) {
      return NextResponse.json({ error: 'Tenor API error' }, { status: res.status });
    }

    const data = (await res.json()) as {
      results?: Array<{
        id: string;
        media?: Array<{
          gif_transparent?: { url?: string };
          tinygif_transparent?: { url?: string };
          gif?: { url?: string };
          tinygif?: { url?: string };
        }>;
        title?: string;
        content_description?: string;
      }>;
    };

    // Map Tenor results to standard format
    const results = (data.results || []).map((item) => {
      const mediaObj = item.media?.[0];
      const gifUrl = 
        mediaObj?.gif_transparent?.url || 
        mediaObj?.tinygif_transparent?.url || 
        mediaObj?.gif?.url || 
        mediaObj?.tinygif?.url || 
        '';
      return {
        id: item.id,
        url: gifUrl,
        title: item.title || item.content_description || ''
      };
    });

    return NextResponse.json({ data: results });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
