import type { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createSupabaseAdmin } from '@/lib/supabase';
import { createCandorResponse, type ChatMessage } from '@/lib/gemini';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractSummaryText(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { summary?: string };
      if (parsed.summary) return parsed.summary;
    } catch {
      const m = trimmed.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (m) return m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"');
    }
  }
  return raw;
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const FREE_DAILY_LIMIT = 10;   // signed-in users
const GUEST_DAILY_LIMIT = 2;   // unauthenticated guests

// Returns null if env vars are absent (rate limiting is skipped — useful in dev)
function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function rateLimitKey(identifier: string): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  return `rl:free:${identifier}:${date}`;
}

// ─── POST /api/chat ───────────────────────────────────────────────────────────

interface RequestBody {
  messages: ChatMessage[];
  sessionId: string;
  isWrapUp?: boolean;
}

export async function POST(req: NextRequest) {
  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { messages, sessionId, isWrapUp } = body;

  // ── Validate ────────────────────────────────────────────────────────────────
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'messages must be a non-empty array' }, { status: 400 });
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== 'user') {
    return Response.json({ error: 'Last message must be from the user' }, { status: 400 });
  }

  if (!sessionId || typeof sessionId !== 'string') {
    return Response.json({ error: 'sessionId is required' }, { status: 400 });
  }

  // ── Get server session ───────────────────────────────────────────────────────
  const serverSession = await getServerSession(authOptions);

  // ── Rate limit ───────────────────────────────────────────────────────────────
  const redis = getRedis();
  if (redis) {
    // Authenticated users: stable user ID so "New Chat" can't bypass the limit.
    // Guest users: client IP so clearing localStorage can't bypass the limit.
    let identifier: string;
    if (serverSession?.user?.id) {
      identifier = `user:${serverSession.user.id}`;
    } else {
      const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
        req.headers.get('x-real-ip') ??
        'unknown';
      identifier = `ip:${ip}`;
    }

    const key = rateLimitKey(identifier);
    const count = await redis.incr(key);
    if (count === 1) {
      // Set TTL on the first increment so the key expires at midnight-ish
      await redis.expire(key, 86_400);
    }
    const isGuest = !serverSession?.user?.id;
    const limit = isGuest ? GUEST_DAILY_LIMIT : FREE_DAILY_LIMIT;
    if (count > limit) {
      return Response.json(
        {
          error: isGuest
            ? "You've reached the free limit of 2 messages. Sign in to continue."
            : "You've reached your daily limit of 10 messages. Come back tomorrow.",
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 }
      );
    }
  }

  // ── Fetch memory context for all signed-in users ─────────────────────────
  let memoryContext: string | undefined;
  if (serverSession?.user?.id) {
    const supabase = createSupabaseAdmin();
    const { data: memories } = await supabase
      .from('conversation_memories')
      .select('summary')
      .eq('user_id', serverSession.user.id)
      .order('created_at', { ascending: false })
      .limit(3);
    if (memories && memories.length > 0) {
      memoryContext =
        'Previous context about this person:\n' +
        (memories as { summary: string }[]).map((m, i) => `${i + 1}. ${extractSummaryText(m.summary)}`).join('\n');
    }
  }

  // ── Stream Gemini response ──────────────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await createCandorResponse(messages, memoryContext, isWrapUp);
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (err) {
        console.error('[/api/chat] stream error:', err);
        controller.enqueue(
          encoder.encode(
            "I'm having a little trouble connecting right now. Give me a moment and try again."
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
