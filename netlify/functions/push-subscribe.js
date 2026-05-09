const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod === 'DELETE') {
    let endpoint;
    try { ({ endpoint } = JSON.parse(event.body || '{}')); }
    catch { return { statusCode: 400, body: 'Bad Request' }; }
    try {
      const store = getStore({ name: 'push-subscriptions', consistency: 'strong' });
      const id = Buffer.from(endpoint).toString('base64url').slice(-40);
      await store.delete(id);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } catch(e) {
      return { statusCode: 500, body: 'Error' };
    }
  }

  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let subscription, preferredHour;
  try { ({ subscription, preferredHour } = JSON.parse(event.body || '{}')); }
  catch { return { statusCode: 400, body: 'Bad Request' }; }
  if (!subscription?.endpoint) return { statusCode: 400, body: 'Invalid subscription' };

  try {
    const store = getStore({ name: 'push-subscriptions', consistency: 'strong' });
    const id = Buffer.from(subscription.endpoint).toString('base64url').slice(-40);
    await store.set(id, JSON.stringify({
      subscription,
      preferredHour: Number(preferredHour) || 9,
      created: new Date().toISOString()
    }));
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    };
  } catch(e) {
    console.error('Store error:', e);
    return { statusCode: 500, body: 'Storage error' };
  }
};
