exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let email, firstName;
  try { ({ email, firstName } = JSON.parse(event.body || '{}')); }
  catch { return { statusCode: 400, body: 'Bad Request' }; }

  console.log('New subscriber:', { email, firstName, ts: new Date().toISOString() });

  // Extend here with Mailchimp, ConvertKit, Resend, etc.

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  };
};
