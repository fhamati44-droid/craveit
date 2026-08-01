import Stripe from 'npm:stripe@17.3.0';
import { secrets } from 'base44:runtime';

export default async function (req) {
  try {
    const { action, payload } = await req.json();
    const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'));

    if (action === 'createSession') {
      const origin = payload.origin || 'https://app.base44.com';
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        currency: 'ils',
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'ils',
            unit_amount: Math.round((payload.amount || 0) * 100),
            product_data: { name: payload.description || 'طلب TAMAM' },
          },
        }],
        success_url: `${origin}/checkout/processing?session_id={CHECKOUT_SESSION_ID}&paid=1`,
        cancel_url: `${origin}/checkout/review?cancelled=1`,
        metadata: { base44_app_id: Deno.env.get('BASE44_APP_ID'), order_ref: payload.order_ref || '' },
        customer_email: payload.email || undefined,
      });
      return Response.json({ data: { url: session.url, id: session.id } });
    }

    if (action === 'verifySession') {
      const session = await stripe.checkout.sessions.retrieve(payload.session_id);
      return Response.json({
        data: {
          status: session.status,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          paid: session.payment_status === 'paid',
          metadata: session.metadata || {},
        },
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('stripeCheckout error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}