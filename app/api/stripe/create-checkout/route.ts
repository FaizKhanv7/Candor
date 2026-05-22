import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Stripe from 'stripe';

export async function POST() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: session.user.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          recurring: { interval: 'month' },
          product_data: { name: 'Candor Pro' },
          unit_amount: 700, // $7.00
        },
        quantity: 1,
      },
    ],
    metadata: { userId: session.user.id },
    success_url: `${process.env.NEXTAUTH_URL}/?upgraded=1`,
    cancel_url: `${process.env.NEXTAUTH_URL}/`,
  });

  return Response.json({ url: checkoutSession.url });
}
