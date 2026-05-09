const CONDITION_CONTEXTS = {
  Safety: "creating the felt sense of not being alone — a steady, safe presence that settles the nervous system before any words are spoken",
  Attunement: "accurate mirroring of the teen's inner world — being truly seen without being fixed, known without being judged",
  Soothing: "co-regulation — the parent's own settled body offering the teen's nervous system an invitation to return to calm",
  'Expressed Delight': "micro-moments of joy — the light in your eyes when your teen enters the room, the pause to notice who they are rather than what they did",
  Exploration: "holding steady while the teen moves outward — available for return, not holding back, the paradox of loving someone toward their freedom"
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let condition;
  try { ({ condition } = JSON.parse(event.body || '{}')); }
  catch { return { statusCode: 400, body: 'Bad Request' }; }

  const context = CONDITION_CONTEXTS[condition] || condition;

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
        max_tokens: 380,
        messages: [{
          role: 'user',
          content: `You are writing a brief guided visualization for a parent doing daily reflective practice on secure attachment with their teenager. This is grounded in the IAT (Ideal Parent Figure) framework from "The Way Back Home" by Daniel Ahearn, LMFT.

Today's condition: ${condition}
What this condition opens toward: ${context}

Write a guided visualization of 4-5 sentences. Requirements:
- Open with one grounding instruction (body, breath, or sensory anchor)
- Invite a specific felt sense or image directly related to ${condition}
- Let it unfold slowly — don't rush to the insight
- End with a gentle bridge toward the reflection ahead ("From here, you might notice..." or similar)
- Second person, present tense
- Quiet, unhurried, literary prose. No labels, no headers, no lists.
- 90-130 words.`
        }]
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'API error');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visualization: data.content[0].text })
    };
  } catch (err) {
    console.error('Visualization error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unable to generate visualization' })
    };
  }
};
