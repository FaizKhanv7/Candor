import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const { data: rows } = await supabase
    .from('conversation_memories')
    .select('id, session_id, summary, emotional_tags, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  const memories = (rows ?? []).map((r) => ({
    id: r.id as string,
    sessionId: r.session_id as string,
    summary: r.summary as string,
    emotionalTags: r.emotional_tags as string[],
    createdAt: r.created_at as string,
  }));

  return Response.json({ memories });
}
