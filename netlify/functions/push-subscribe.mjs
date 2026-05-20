import { getStore } from '@netlify/blobs';

export default async (req) => {
  const store = getStore({ name: 'push-subscriptions', consistency: 'strong' });

  if (req.method === 'DELETE') {
    let endpoint;
    try { ({ endpoint } = await req.json()); }
    catch { return new Response('Bad Request', { status: 400 }); }
    if (!endpoint) return new Response('Bad Request', { status: 400 });
    try {
      const id = Buffer.from(endpoint).toString('base64url').slice(-40);
      await store.delete(id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.error('Delete error:', e);
      return new Response('Error', { status: 500 });
    }
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let subscription, preferredHour;
  try { ({ subscription, preferredHour } = await req.json()); }
  catch { return new Response('Bad Request', { status: 400 }); }
  if (!subscription?.endpoint) return new Response('Invalid subscription', { status: 400 });

  try {
    const id = Buffer.from(subscription.endpoint).toString('base64url').slice(-40);
    await store.set(id, JSON.stringify({
      subscription,
      preferredHour: Number(preferredHour) || 9,
      created: new Date().toISOString()
    }));
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('Store error:', e);
    return new Response('Storage error', { status: 500 });
  }
};
