import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/memory/[id]'>) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const supabase = createSupabaseAdmin();

  // .eq('user_id', ...) acts as the ownership check
  const { error } = await supabase
    .from('conversation_memories')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json({ ok: true });
}
