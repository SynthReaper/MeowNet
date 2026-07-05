// app/api/ai/personal-helper/route.ts
// Proxy API to forward requests to OpenAI, Anthropic, or Gemini using user-supplied keys

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { apiKey, provider, model, messages } = body as {
      apiKey?: string;
      provider?: 'gemini' | 'openai' | 'anthropic';
      model?: string;
      messages: ChatMessage[];
    };

    const activeProvider = provider || 'gemini';
    const activeModel = model || 'gemini-1.5-flash';
    let activeApiKey = apiKey || '';

    if (!activeApiKey) {
      if (activeProvider === 'gemini') {
        activeApiKey = process.env.GEMINI_API_KEY || '';
      } else if (activeProvider === 'openai') {
        activeApiKey = process.env.OPENAI_API_KEY || '';
      } else if (activeProvider === 'anthropic') {
        activeApiKey = process.env.ANTHROPIC_API_KEY || '';
      }
    }

    if (!activeApiKey || !activeProvider || !activeModel || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'missing_parameters' }, { status: 400 });
    }

    // Strict model allowlist to prevent Server-Side Request Forgery (SSRF) and injection
    const ALLOWED_MODELS: Record<string, string[]> = {
      gemini: ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
      openai: ['gpt-4o', 'gpt-4o-mini'],
      anthropic: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest']
    };

    if (!ALLOWED_MODELS[activeProvider]?.includes(activeModel)) {
      return NextResponse.json({ error: 'unsupported_model' }, { status: 400 });
    }

    if (activeProvider === 'gemini') {
      // Map OpenAI messages format to Gemini format
      const contents = messages
        .filter((msg) => msg.role !== 'system')
        .map((msg) => {
          return {
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          };
        });

      const systemInstructionMsg = messages.find((msg) => msg.role === 'system');
      const systemInstruction = systemInstructionMsg
        ? { parts: [{ text: systemInstructionMsg.content }] }
        : undefined;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${activeApiKey}`;

      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: 'gemini_error', details: errText }, { status: res.status });
      }

      const responseData = await res.json();
      const text = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return NextResponse.json({ success: true, text });
    } 
    
    if (activeProvider === 'openai') {
      const openaiUrl = 'https://api.openai.com/v1/chat/completions';

      const res = await fetch(openaiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeApiKey}`,
        },
        body: JSON.stringify({
          model: activeModel,
          messages,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: 'openai_error', details: errText }, { status: res.status });
      }

      const responseData = await res.json();
      const text = responseData?.choices?.[0]?.message?.content || '';
      return NextResponse.json({ success: true, text });
    } 
    
    if (activeProvider === 'anthropic') {
      const anthropicUrl = 'https://api.anthropic.com/v1/messages';
      
      const systemMessage = messages.find((msg) => msg.role === 'system');
      const nonSystemMessages = messages.filter((msg) => msg.role !== 'system');

      const res = await fetch(anthropicUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': activeApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: activeModel,
          max_tokens: 4096,
          messages: nonSystemMessages,
          system: systemMessage ? systemMessage.content : undefined,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: 'anthropic_error', details: errText }, { status: res.status });
      }

      const responseData = await res.json();
      const text = responseData?.content?.[0]?.text || '';
      return NextResponse.json({ success: true, text });
    }

    return NextResponse.json({ error: 'unsupported_provider' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: 'internal_server_error', details: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    );
  }

}
