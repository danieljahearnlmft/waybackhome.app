const webpush = require('web-push');
const { getStore } = require('@netlify/blobs');

webpush.setVapidDetails(
  'mailto:danieljahearn@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const CONDITIONS = ['Safety', 'Attunement', 'Soothing', 'Expressed Delight', 'Exploration'];

const DAILY = {
  Safety: [
    { title: 'Today: Safety', body: "Your teen's nervous system is reading yours. What's it saying?" },
    { title: 'Today: Safety', body: "Walk into the room they're in. You don't have to say anything." },
    { title: 'Today: Safety', body: "Safety isn't the absence of conflict. It's not being alone in it." }
  ],
  Attunement: [
    { title: 'Today: Attunement', body: "What might be underneath what they're saying today?" },
    { title: 'Today: Attunement', body: "Listen one layer down. You don't have to be right." },
    { title: 'Today: Attunement', body: "The slammed door isn't about you. What is it about?" }
  ],
  Soothing: [
    { title: 'Today: Soothing', body: 'Settle your body first. You are the medicine.' },
    { title: 'Today: Soothing', body: "Three breaths before the conversation. That's the practice." },
    { title: 'Today: Soothing', body: 'If you go in dysregulated, you add to the storm.' }
  ],
  'Expressed Delight': [
    { title: 'Today: Delight', body: 'Name one thing about your teen, out loud, that moves you.' },
    { title: 'Today: Delight', body: "Teens scan, all day, for evidence they're wanted. Show them." },
    { title: 'Today: Delight', body: 'Loved as obligation, or wanted as a person. They feel the difference.' }
  ],
  Exploration: [
    { title: 'Today: Exploration', body: "Ask what they're interested in. Then listen, no redirect." },
    { title: 'Today: Exploration', body: "Secure teens explore more. You're the place they return to." },
    { title: 'Today: Exploration', body: "When you're scared, the instinct is to pull in. Stay steady." }
  ]
};

const SUNDAY = { title: 'Sunday.', body: 'Five minutes. One condition. The week starts soft.' };
const DAY_7  = { title: 'Day 7.',  body: 'A week of showing up. That changes something in both of you.' };
const DAY_30 = { title: 'Day 30.', body: 'A month of turning toward. This is who you are now.' };

function payloadForUser(now, createdIso) {
  const created = new Date(createdIso || now.toISOString()).getTime();
  const daysSinceSub = Math.floor((now.getTime() - created) / 86400000);
  if (daysSinceSub === 7) return DAY_7;
  if (daysSinceSub === 30) return DAY_30;
  if (now.getUTCDay() === 0) return SUNDAY;
  const dayIndex = Math.floor(now.getTime() / 86400000);
  const condition = CONDITIONS[dayIndex % CONDITIONS.length];
  const variant = Math.floor(dayIndex / CONDITIONS.length) % 3;
  return DAILY[condition][variant];
}

exports.handler = async () => {
  const now = new Date();

  try {
    const store = getStore({ name: 'push-subscriptions', consistency: 'strong' });
    const { blobs } = await store.list();
    if (!blobs.length) return { statusCode: 200, body: 'No subscribers' };

    let sent = 0, removed = 0;
    await Promise.allSettled(
      blobs.map(async ({ key }) => {
        try {
          const raw = await store.get(key);
          if (!raw) return;
          const { subscription, created } = JSON.parse(raw);
          const payload = JSON.stringify(payloadForUser(now, created));
          await webpush.sendNotification(subscription, payload);
          sent++;
        } catch(e) {
          if (e.statusCode === 410 || e.statusCode === 404) {
            await store.delete(key).catch(() => {});
            removed++;
          } else {
            console.warn('Send failed:', key, e.message);
          }
        }
      })
    );

    console.log(`Push sent: ${sent}, removed stale: ${removed}`);
    return { statusCode: 200, body: JSON.stringify({ sent, removed }) };
  } catch(e) {
    console.error('push-send error:', e);
    return { statusCode: 500, body: 'Error' };
  }
};
