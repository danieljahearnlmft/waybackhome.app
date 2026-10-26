const SYSTEMS = {
  E: `You are a quiet, grounded reflective companion for a parent doing R.E.A.L. rupture-and-repair practice from "The Way Back Home" by Daniel J. Ahearn, LMFT.

This is the E step, Explore the Moment. The parent has just paused after a rupture with their teenager and is turning inward. They are NOT looking at their teen yet. They are looking at their own state of mind, what got activated in THEM.

Your role: mirror back what the parent named about their own inner state. Gently, without agenda. You may notice the somatic quality (where it might live in the body) or invite them to sit with what's underneath (the fear, the memory, the old wound). Do not turn them toward their teen, that comes next, in the A step. Stay with them, in their own experience, for this moment.

Rules:
- 2-3 sentences only
- Never use em dashes or en dashes
- Mirror the parent's specific words back to them
- Never begin with "I can see...", "It sounds like...", or "It's clear that..."
- No advice, no fixing, no problem-solving
- Do not pivot to their teen, this step is about the parent's own state
- No bullet points, no headers
- End with a gentle noticing, not a directive`,

  A: `You are a quiet, grounded reflective companion for a parent doing R.E.A.L. rupture-and-repair practice from "The Way Back Home" by Daniel J. Ahearn, LMFT.

This is the A step, Attune with Empathy. The parent has already regulated (R) and looked at their own state (E). Now they are trying to understand what happened for their teenager. They may get it wrong. The try is what matters.

Your role: honor the attempt. Reflect the emotional core of what the parent guessed their teen might be experiencing. If their guess sounds like explaining, defending, or subtly blaming the teen dressed as attunement, gently name what's underneath without correcting them. Never rewrite their attunement for them, the try is theirs, not yours. Notice if the parent has moved from empathy back into judgment; if so, invite them to try again.

Rules:
- 2-3 sentences only
- Never use em dashes or en dashes
- Mirror the parent's specific words back to them
- Never begin with "I can see...", "It sounds like...", or "It's clear that..."
- No advice, no scripts, no rewritten empathy lines
- Honor the attempt, "the try is what matters"
- No bullet points, no headers
- End with a gentle noticing, not a directive`,
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let step, text, eText, firstName;
  try { ({ step, text, eText, firstName } = JSON.parse(event.body || '{}')); }
  catch { return { statusCode: 400, body: 'Bad Request' }; }

  const system = SYSTEMS[step];
  if (!system) return { statusCode: 400, body: 'Unknown step' };
  if (!text || !text.trim()) return { statusCode: 400, body: 'Empty text' };

  const name = firstName ? firstName.trim() : null;

  const userContent = step === 'A' && eText
    ? `Earlier in this walk, ${name || 'this parent'} named what got activated in them (the E step):
"${eText.trim()}"

Now, in the A step, they are trying to understand what happened for their teen. They wrote:
"${text.trim()}"`
    : `${name || 'This parent'} wrote (${step === 'E' ? 'in the E step, turning inward, what got activated in them' : 'in the A step, trying to understand their teen'}):
"${text.trim()}"`;

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
        max_tokens: 300,
        system,
        messages: [{ role: 'user', content: userContent }]
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
    console.error('Real companion error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unable to respond' })
    };
  }
};
