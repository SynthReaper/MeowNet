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
      apiKey: string;
      provider: 'gemini' | 'openai' | 'anthropic';
      model: string;
      messages: ChatMessage[];
    };

    if (!apiKey || !provider || !model || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'missing_parameters' }, { status: 400 });
    }

    if (provider === 'gemini') {
      // Map OpenAI messages format to Gemini format
      // Gemini expects: contents: [{ role: 'user' | 'model', parts: [{ text: '...' }] }]
      // Note: System instruction is passed as a separate parameter in v1beta
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

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
    
    if (provider === 'openai') {
      const openaiUrl = 'https://api.openai.com/v1/chat/completions';

      const res = await fetch(openaiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
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
    
    if (provider === 'anthropic') {
      const anthropicUrl = 'https://api.anthropic.com/v1/messages';
      
      const systemMessage = messages.find((msg) => msg.role === 'system');
      const nonSystemMessages = messages.filter((msg) => msg.role !== 'system');

      const res = await fetch(anthropicUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
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
