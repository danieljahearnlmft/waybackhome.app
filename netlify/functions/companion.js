exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let condition, prompt, journalText, firstName;
  try { ({ condition, prompt, journalText, firstName } = JSON.parse(event.body || '{}')); }
  catch { return { statusCode: 400, body: 'Bad Request' }; }

  const name = firstName ? firstName.trim() : null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: `You are a quiet, grounded reflective companion for a parent doing daily attachment practice grounded in the IAT (Ideal Parent Figure) framework from "The Way Back Home" by Daniel Ahearn, LMFT.

Your role: reflect back what you hear, gently deepen the inquiry, occasionally name something alive beneath the surface — without advice, diagnosis, or fixing. Think less therapist, more wise witness. Be warm, specific, unhurried.

Rules:
- 3-4 sentences only
- Mirror the parent's specific words back to them
- Never begin with "I can see...", "It sounds like...", or "It's clear that..."
- No bullet points, no headers
- End with one open question or a gentle noticing, not a directive`,
        messages: [{
          role: 'user',
          content: `Today's condition: ${condition}
Reflection prompt: ${prompt}
What ${name || 'this parent'} wrote: ${journalText}`
        }]
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'API error');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: data.content[0].text })
    };
  } catch (err) {
    console.error('Companion error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unable to respond' })
    };
  }
};
