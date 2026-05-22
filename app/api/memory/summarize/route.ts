import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createSupabaseAdmin } from '@/lib/supabase';
import { createMemorySummary, type ChatMessage } from '@/lib/gemini';

interface RequestBody {
  messages: ChatMessage[];
  sessionId: string;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { messages, sessionId } = body;

  if (!Array.isArray(messages) || messages.filter((m) => m.role === 'user').length < 2) {
    return Response.json({ error: 'Not enough messages to summarize' }, { status: 400 });
  }

  if (!sessionId || typeof sessionId !== 'string') {
    return Response.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  // Prevent duplicate summaries for the same session
  const { data: existing } = await supabase
    .from('conversation_memories')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('session_id', sessionId)
    .single();

  if (existing) {
    return Response.json({ ok: true, skipped: true });
  }

  const { summary, emotionalTags } = await createMemorySummary(messages);

  await supabase.from('conversation_memories').insert({
    user_id: session.user.id,
    session_id: sessionId,
    summary,
    emotional_tags: emotionalTags,
  });

  return Response.json({ ok: true });
}
