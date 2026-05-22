import type { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseAdmin } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[stripe/webhook] signature verification failed:', msg);
    return Response.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  switch (event.type) {
    case 'checkout.session.completed': {
      const cs = event.data.object as Stripe.Checkout.Session;
      const userId = cs.metadata?.userId;
      const customerId = cs.customer as string | null;

      if (!userId) {
        console.error('[stripe/webhook] checkout.session.completed missing userId in metadata');
        break;
      }

      await supabase
        .from('users')
        .update({ is_pro: true, ...(customerId ? { stripe_customer_id: customerId } : {}) })
        .eq('id', userId);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from('users')
        .update({ is_pro: false })
        .eq('stripe_customer_id', sub.customer as string);
      break;
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      console.warn('[stripe/webhook] invoice.payment_failed for customer:', inv.customer);
      break;
    }
  }

  return Response.json({ received: true });
}
